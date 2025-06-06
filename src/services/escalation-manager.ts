import { ActivityEvent } from './client-activity-service';
import { ErrorPatternAnalyzer, ErrorPattern } from './error-patterns';
import { providerManager } from './llm-providers/provider-manager';
import { LLMRequest } from './llm-providers/types';
import { escalateCodingProblem } from '@/ai/flows/escalate-coding-problem';
import { PluginRegistry } from './plugin-system/plugin-registry';

export interface EscalationRule {
  id: string;
  name: string;
  triggers: {
    errorTypes: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    frequency: number;
    keywords: string[];
  };
  actions: {
    provider: string;
    includeContext: boolean;
    notifyHuman: boolean;
    autoResolve: boolean;
  };
  enabled: boolean;
}

export interface EscalationEvent {
  id: string;
  activityEventId: string;
  timestamp: Date;
  problemType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  provider: string;
  context: any;
  aiResponse?: string;
  suggestions: string[];
  status: 'pending' | 'resolved' | 'escalated_to_human' | 'ignored';
  humanFeedback?: string;
  resolutionTime?: Date;
  confidence: number;
}

export interface Problem {
  id: string;
  source: ActivityEvent;
  errorPattern: ErrorPattern;
  context: {
    recentErrors: ActivityEvent[];
    fileContext?: string;
    stackTrace?: string;
    environment?: string;
  };
  analysis: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    recommendedProvider: string;
    specialties: string[];
  };
}

export class EscalationManager {
  private errorAnalyzer: ErrorPatternAnalyzer;
  private escalationHistory: EscalationEvent[] = [];
  private rules: EscalationRule[] = [];
  private isProcessing = false;
  private pluginRegistry?: PluginRegistry;

  constructor() {
    this.errorAnalyzer = new ErrorPatternAnalyzer();
    this.initializeDefaultRules();
  }

  setPluginRegistry(registry: PluginRegistry): void {
    this.pluginRegistry = registry;
  }

  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'critical-errors',
        name: 'Critical Error Auto-Escalation',
        triggers: {
          errorTypes: ['security_vulnerability', 'build_failure'],
          severity: 'critical',
          frequency: 1,
          keywords: ['critical', 'security', 'vulnerability', 'build failed']
        },
        actions: {
          provider: 'claude',
          includeContext: true,
          notifyHuman: true,
          autoResolve: false
        },
        enabled: true
      },
      {
        id: 'runtime-errors',
        name: 'Runtime Error Analysis',
        triggers: {
          errorTypes: ['runtime_error', 'syntax_error'],
          severity: 'medium',
          frequency: 3,
          keywords: ['error', 'exception', 'failed']
        },
        actions: {
          provider: 'auto',
          includeContext: true,
          notifyHuman: false,
          autoResolve: true
        },
        enabled: true
      },
      {
        id: 'performance-issues',
        name: 'Performance Degradation',
        triggers: {
          errorTypes: ['performance_issue'],
          severity: 'medium',
          frequency: 2,
          keywords: ['slow', 'timeout', 'memory', 'performance']
        },
        actions: {
          provider: 'openai',
          includeContext: true,
          notifyHuman: false,
          autoResolve: false
        },
        enabled: true
      }
    ];
  }

  async processEvent(event: ActivityEvent): Promise<void> {
    if (this.isProcessing) {
      return; // Prevent concurrent processing
    }

    this.isProcessing = true;
    
    try {
      // Notify plugins about the escalation event
      if (this.pluginRegistry) {
        await this.notifyPlugins('escalation_started', { event });
      }

      // Analyze the event for problems
      const problem = await this.analyzeProblem(event);
      
      if (!problem) {
        return; // No actionable problem detected
      }

      // Check if any escalation rules match
      const matchingRules = this.findMatchingRules(problem);
      
      if (matchingRules.length === 0) {
        return; // No rules triggered
      }

      // Process escalations for each matching rule
      for (const rule of matchingRules) {
        await this.escalateToAI(problem, rule);
      }

      // Notify plugins about completion
      if (this.pluginRegistry) {
        await this.notifyPlugins('escalation_completed', { 
          event, 
          problem, 
          rulesTriggered: matchingRules.length 
        });
      }
    } catch (error) {
      console.error('Error processing escalation event:', error);
      
      // Notify plugins about the error
      if (this.pluginRegistry) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await this.notifyPlugins('escalation_error', { event, error: errorMessage });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async analyzeProblem(event: ActivityEvent): Promise<Problem | null> {
    // Skip non-error events (note: ActivityEvent doesn't include 'warning' type)
    if (event.type !== 'error') {
      return null;
    }

    // Get recent error context
    const recentErrors = this.getRecentErrors(30); // Last 30 minutes
    
    // Analyze error pattern
    const errorPattern = this.errorAnalyzer.analyzeError(
      event.details?.error || event.details?.message || '',
      {
        recentErrors,
        fileExtension: this.extractFileExtension(event.details?.filePath),
        errorCount: recentErrors.length,
        timeWindow: 30
      }
    );

    // Skip low-confidence or low-severity issues unless they're frequent
    if (errorPattern.confidence < 0.6 && errorPattern.severity === 'low' && recentErrors.length < 3) {
      return null;
    }

    // Determine recommended provider and specialties
    const provider = await providerManager.selectBestProvider(
      errorPattern.type,
      errorPattern.severity,
      errorPattern.category === 'Security' ? ['code_review', 'security'] : ['debugging']
    );

    const problem: Problem = {
      id: `problem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: event,
      errorPattern,
      context: {
        recentErrors,
        fileContext: event.details?.filePath,
        stackTrace: event.details?.stack,
        environment: event.details?.environment
      },
      analysis: {
        severity: errorPattern.severity,
        confidence: errorPattern.confidence,
        recommendedProvider: provider?.getId() || 'claude',
        specialties: errorPattern.category === 'Security' ? ['security'] : ['debugging']
      }
    };

    return problem;
  }

  private findMatchingRules(problem: Problem): EscalationRule[] {
    return this.rules.filter(rule => {
      if (!rule.enabled) return false;

      const triggers = rule.triggers;
      
      // Check error type match
      if (triggers.errorTypes.length > 0 && 
          !triggers.errorTypes.includes(problem.errorPattern.type)) {
        return false;
      }

      // Check severity threshold
      const severityOrder = ['low', 'medium', 'high', 'critical'];
      const problemSeverityIndex = severityOrder.indexOf(problem.analysis.severity);
      const triggerSeverityIndex = severityOrder.indexOf(triggers.severity);
      
      if (problemSeverityIndex < triggerSeverityIndex) {
        return false;
      }

      // Check frequency (number of recent similar errors)
      const similarErrors = problem.context.recentErrors.filter(e => 
        e.type === problem.source.type
      );
      
      if (similarErrors.length < triggers.frequency) {
        return false;
      }

      // Check keywords
      if (triggers.keywords.length > 0) {
        const errorText = (problem.source.details?.error || 
                          problem.source.details?.message || '').toLowerCase();
        const hasKeyword = triggers.keywords.some(keyword => 
          errorText.includes(keyword.toLowerCase())
        );
        
        if (!hasKeyword) {
          return false;
        }
      }

      return true;
    });
  }

  async escalateToAI(problem: Problem, rule: EscalationRule): Promise<void> {
    const escalationId = `escalation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Select provider
      let provider = rule.actions.provider;
      if (provider === 'auto') {
        const selectedProvider = await providerManager.selectBestProvider(
          problem.errorPattern.type,
          problem.analysis.severity,
          problem.analysis.specialties
        );
        provider = selectedProvider?.getId() || 'claude';
      }

      // Prepare context for AI
      const context = this.prepareContext(problem, rule.actions.includeContext);
      
      // Create escalation event
      const escalation: EscalationEvent = {
        id: escalationId,
        activityEventId: problem.source.id,
        timestamp: new Date(),
        problemType: problem.errorPattern.type,
        severity: problem.analysis.severity,
        provider,
        context: context,
        suggestions: [],
        status: 'pending',
        confidence: problem.analysis.confidence
      };

      // Send to AI for analysis
      const aiResult = await this.sendToAI(problem, context, provider);
      
      // Update escalation with AI response
      escalation.aiResponse = aiResult.explanation;
      escalation.suggestions = aiResult.suggestions || [];
      escalation.status = 'resolved';

      // Store escalation
      this.escalationHistory.push(escalation);

      // Notify human if required
      if (rule.actions.notifyHuman) {
        await this.notifyHuman(escalation);
      }

      console.log(`Escalation completed: ${escalationId} for problem type: ${problem.errorPattern.type}`);
      
    } catch (error) {
      console.error(`Escalation failed for ${escalationId}:`, error);
      
      // Create failed escalation record
      const failedEscalation: EscalationEvent = {
        id: escalationId,
        activityEventId: problem.source.id,
        timestamp: new Date(),
        problemType: problem.errorPattern.type,
        severity: problem.analysis.severity,
        provider: rule.actions.provider,
        context: problem.context,
        aiResponse: `Escalation failed: ${error instanceof Error ? error.message : String(error)}`,
        suggestions: ['Manual review required'],
        status: 'escalated_to_human',
        confidence: 0
      };
      
      this.escalationHistory.push(failedEscalation);
    }
  }

  private prepareContext(problem: Problem, includeFullContext: boolean): any {
    const baseContext = {
      error: problem.source.details?.error || problem.source.details?.message,
      errorType: problem.errorPattern.type,
      severity: problem.analysis.severity,
      confidence: problem.analysis.confidence,
      timestamp: problem.source.timestamp
    };

    if (!includeFullContext) {
      return baseContext;
    }

    return {
      ...baseContext,
      filePath: problem.context.fileContext,
      stackTrace: problem.context.stackTrace,
      recentErrorCount: problem.context.recentErrors.length,
      environment: problem.context.environment,
      errorPattern: {
        category: problem.errorPattern.category,
        description: problem.errorPattern.description,
        commonCauses: problem.errorPattern.commonCauses,
        suggestedActions: problem.errorPattern.suggestedActions
      }
    };
  }

  private async sendToAI(problem: Problem, context: any, providerId: string): Promise<any> {
    try {
      // Use the existing escalation flow
      const result = await escalateCodingProblem({
        error: problem.source.details?.error || problem.source.details?.message || 'Unknown error',
        context: JSON.stringify(context, null, 2)
      });

      return {
        explanation: result.explanation,
        severity: result.severity,
        suggestions: result.trace || [],
        confidence: 0.8 // Default confidence for AI responses
      };
    } catch (error) {
      // Fallback to direct provider call if flow fails
      const provider = providerManager.getProvider(providerId);
      if (!provider) {
        throw new Error(`Provider not found: ${providerId}`);
      }

      const request: LLMRequest = {
        prompt: `Analyze this coding problem:
Error: ${problem.source.details?.error || problem.source.details?.message}
Type: ${problem.errorPattern.type}
Context: ${JSON.stringify(context, null, 2)}

Provide a brief explanation and suggested actions.`,
        temperature: 0.1,
        maxTokens: 1000
      };

      const response = await provider.sendRequest(request);
      
      return {
        explanation: response.content,
        suggestions: ['Review AI analysis', 'Apply suggested fixes'],
        confidence: 0.7
      };
    }
  }

  private async notifyHuman(escalation: EscalationEvent): Promise<void> {
    // In a real implementation, this would send notifications
    // via email, Slack, or the UI notification system
    console.log(`🚨 Human notification required for escalation: ${escalation.id}`);
    console.log(`Problem: ${escalation.problemType} (${escalation.severity})`);
    console.log(`AI Response: ${escalation.aiResponse}`);
    
    // TODO: Integrate with notification system
    // await notificationService.send({
    //   type: 'escalation',
    //   severity: escalation.severity,
    //   title: `AI Escalation: ${escalation.problemType}`,
    //   message: escalation.aiResponse,
    //   data: escalation
    // });
  }

  private getRecentErrors(timeWindowMinutes = 30): ActivityEvent[] {
    // In a server environment, this would query a database or activity store
    // For now, return empty array but provide interface for integration
    // This method will be populated when connecting to server-side activity store
    return [];
  }

  // Method to be called by server-side activity service integration
  setActivitySource(getRecentErrorsCallback: (timeWindowMinutes: number) => ActivityEvent[]): void {
    this.getRecentErrors = getRecentErrorsCallback;
  }

  private extractFileExtension(filePath?: string): string | undefined {
    if (!filePath) return undefined;
    const parts = filePath.split('.');
    return parts.length > 1 ? parts.pop() : undefined;
  }

  // Plugin integration methods
  
  private async notifyPlugins(eventType: string, data: any): Promise<void> {
    if (!this.pluginRegistry) return;

    const plugins = this.pluginRegistry.getAllPlugins();
    const notifications = plugins.map(async (pluginInstance) => {
      try {
        // Check if plugin has escalation event handlers
        const plugin = pluginInstance.plugin as any;
        if (plugin.onEscalationEvent && typeof plugin.onEscalationEvent === 'function') {
          await plugin.onEscalationEvent(eventType, data, this.pluginRegistry!.getPluginAPI());
        }
      } catch (error) {
        console.error(`Error notifying plugin ${pluginInstance.plugin.id}:`, error);
      }
    });

    await Promise.allSettled(notifications);
  }

  async requestAssistance(prompt: string, context?: any): Promise<string> {
    try {
      const result = await escalateCodingProblem({
        error: prompt,
        context: context ? JSON.stringify(context, null, 2) : ''
      });
      return result.explanation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`AI assistance request failed: ${errorMessage}`);
    }
  }

  async escalateIssue(issue: string, severity: 'low' | 'medium' | 'high', context?: any): Promise<void> {
    const escalationEvent: EscalationEvent = {
      id: `plugin-escalation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      activityEventId: 'plugin-generated',
      timestamp: new Date(),
      problemType: 'plugin_escalation',
      severity,
      provider: 'claude',
      context: context || {},
      aiResponse: '',
      suggestions: [],
      status: 'pending',
      confidence: 0.9
    };

    try {
      const aiResult = await this.requestAssistance(issue, context);
      escalationEvent.aiResponse = aiResult;
      escalationEvent.status = 'resolved';
      escalationEvent.suggestions = ['Review AI analysis', 'Implement suggested fixes'];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      escalationEvent.aiResponse = `Failed to get AI assistance: ${errorMessage}`;
      escalationEvent.status = 'escalated_to_human';
      escalationEvent.suggestions = ['Manual review required'];
    }

    this.escalationHistory.push(escalationEvent);

    // Notify human if high severity
    if (severity === 'high') {
      await this.notifyHuman(escalationEvent);
    }
  }

  // Public API methods
  
  addRule(rule: EscalationRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  updateRule(ruleId: string, updates: Partial<EscalationRule>): void {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      this.rules[index] = { ...this.rules[index], ...updates };
    }
  }

  getRules(): EscalationRule[] {
    return [...this.rules];
  }

  getEscalationHistory(limit = 50): EscalationEvent[] {
    return this.escalationHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getEscalationStats(): {
    total: number;
    byStatus: { [status: string]: number };
    bySeverity: { [severity: string]: number };
    byProvider: { [provider: string]: number };
    averageResolutionTime: number;
  } {
    const total = this.escalationHistory.length;
    const byStatus: { [status: string]: number } = {};
    const bySeverity: { [severity: string]: number } = {};
    const byProvider: { [provider: string]: number } = {};
    
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    this.escalationHistory.forEach(escalation => {
      byStatus[escalation.status] = (byStatus[escalation.status] || 0) + 1;
      bySeverity[escalation.severity] = (bySeverity[escalation.severity] || 0) + 1;
      byProvider[escalation.provider] = (byProvider[escalation.provider] || 0) + 1;
      
      if (escalation.resolutionTime) {
        totalResolutionTime += escalation.resolutionTime.getTime() - escalation.timestamp.getTime();
        resolvedCount++;
      }
    });

    return {
      total,
      byStatus,
      bySeverity,
      byProvider,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0
    };
  }

  async testEscalation(testError: string): Promise<EscalationEvent> {
    const testEvent: ActivityEvent = {
      id: `test-${Date.now()}`,
      timestamp: new Date(),
      type: 'error',
      source: 'test',
      message: `Test error: ${testError}`,
      details: {
        error: testError,
        message: testError,
        level: 'error'
      }
    };

    await this.processEvent(testEvent);
    
    // Return the most recent escalation
    return this.escalationHistory[this.escalationHistory.length - 1];
  }
}

// Singleton instance
export const escalationManager = new EscalationManager();

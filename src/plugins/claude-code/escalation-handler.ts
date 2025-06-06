import { EventEmitter } from 'events';

export interface ErrorPattern {
  type: string;
  severity: 'low' | 'medium' | 'high';
  shouldEscalate: boolean;
  confidence: number;
  pattern: string;
  description: string;
}

export interface EscalationConfig {
  plugin_specific: string[];
  model_preferences: {
    primary: string;
    fallback?: string;
  };
  severity_threshold: 'low' | 'medium' | 'high';
  auto_escalate: boolean;
}

export class ClaudeCodeEscalationHandler extends EventEmitter {
  private errorPatterns: Map<string, RegExp> = new Map();
  private escalationConfig: EscalationConfig;
  private isActive = false;

  constructor() {
    super();
    this.escalationConfig = {
      plugin_specific: ['claude-code'],
      model_preferences: {
        primary: 'claude-3-5-sonnet',
        fallback: 'claude-3-haiku'
      },
      severity_threshold: 'medium',
      auto_escalate: true
    };
    
    this.initializeErrorPatterns();
  }

  async initialize(): Promise<void> {
    console.log('[Escalation Handler] Initializing error pattern detection...');
    this.isActive = true;
  }

  async cleanup(): Promise<void> {
    console.log('[Escalation Handler] Cleaning up escalation handler...');
    this.isActive = false;
  }

  private initializeErrorPatterns(): void {
    // API and Authentication errors
    this.errorPatterns.set('api-timeout-error', /timeout|timed out|request timeout/i);
    this.errorPatterns.set('api-auth-error', /unauthorized|authentication failed|invalid api key/i);
    this.errorPatterns.set('api-rate-limit', /rate limit|too many requests|quota exceeded/i);
    
    // Claude Code specific errors
    this.errorPatterns.set('claude-connection-error', /claude.*connection|anthropic.*connection/i);
    this.errorPatterns.set('claude-model-error', /model.*unavailable|model.*error|claude.*model/i);
    this.errorPatterns.set('claude-context-error', /context.*limit|token.*limit|input.*too.*long/i);
    
    // File system errors
    this.errorPatterns.set('file-access-error', /permission denied|access denied|eacces/i);
    this.errorPatterns.set('file-not-found', /no such file|file not found|enoent/i);
    this.errorPatterns.set('disk-space-error', /no space left|disk full|enospc/i);
    
    // Memory and performance errors
    this.errorPatterns.set('memory-error', /out of memory|heap.*limit|enomem/i);
    this.errorPatterns.set('performance-error', /slow.*response|performance.*degraded/i);
    
    // Network errors
    this.errorPatterns.set('network-error', /network.*error|connection.*refused|econnrefused/i);
    this.errorPatterns.set('dns-error', /dns.*resolution|host.*not.*found|enotfound/i);
    
    // Syntax and parsing errors
    this.errorPatterns.set('syntax-error', /syntax.*error|parse.*error|unexpected.*token/i);
    this.errorPatterns.set('type-error', /type.*error|typescript.*error|cannot.*read.*property/i);
  }

  async analyzeError(errorData: any): Promise<ErrorPattern> {
    if (!this.isActive) {
      return this.createDefaultPattern();
    }

    const errorMessage = this.extractErrorMessage(errorData);
    const detectedPattern = this.detectErrorPattern(errorMessage);
    
    return {
      type: detectedPattern.type,
      severity: detectedPattern.severity,
      shouldEscalate: this.shouldEscalate(detectedPattern),
      confidence: detectedPattern.confidence,
      pattern: detectedPattern.pattern,
      description: this.getErrorDescription(detectedPattern.type)
    };
  }

  private extractErrorMessage(errorData: any): string {
    if (typeof errorData === 'string') {
      return errorData;
    }
    
    if (errorData.error) {
      return typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
    }
    
    if (errorData.message) {
      return errorData.message;
    }
    
    if (errorData.stderr) {
      return errorData.stderr;
    }
    
    return JSON.stringify(errorData);
  }

  private detectErrorPattern(errorMessage: string): { type: string; severity: 'low' | 'medium' | 'high'; confidence: number; pattern: string } {
    for (const [patternType, regex] of this.errorPatterns) {
      if (regex.test(errorMessage)) {
        return {
          type: patternType,
          severity: this.getSeverityForPattern(patternType),
          confidence: this.calculateConfidence(errorMessage, regex),
          pattern: regex.source
        };
      }
    }
    
    // Default pattern for unrecognized errors
    return {
      type: 'unknown-error',
      severity: 'medium',
      confidence: 0.5,
      pattern: 'unknown'
    };
  }

  private getSeverityForPattern(patternType: string): 'low' | 'medium' | 'high' {
    const severityMap: Record<string, 'low' | 'medium' | 'high'> = {
      'api-timeout-error': 'medium',
      'api-auth-error': 'high',
      'api-rate-limit': 'medium',
      'claude-connection-error': 'high',
      'claude-model-error': 'high',
      'claude-context-error': 'medium',
      'file-access-error': 'medium',
      'file-not-found': 'low',
      'disk-space-error': 'high',
      'memory-error': 'high',
      'performance-error': 'medium',
      'network-error': 'medium',
      'dns-error': 'medium',
      'syntax-error': 'low',
      'type-error': 'low',
      'unknown-error': 'medium'
    };
    
    return severityMap[patternType] || 'medium';
  }

  private calculateConfidence(errorMessage: string, pattern: RegExp): number {
    const matches = errorMessage.match(pattern);
    if (!matches) return 0;
    
    // Higher confidence for more specific matches
    const matchLength = matches[0].length;
    const messageLength = errorMessage.length;
    
    // Base confidence on match specificity and context
    let confidence = Math.min(0.9, (matchLength / messageLength) * 2 + 0.3);
    
    // Boost confidence for Claude-specific patterns
    if (pattern.source.includes('claude') || pattern.source.includes('anthropic')) {
      confidence = Math.min(0.95, confidence + 0.2);
    }
    
    return confidence;
  }

  private shouldEscalate(pattern: { type: string; severity: 'low' | 'medium' | 'high'; confidence: number }): boolean {
    if (!this.escalationConfig.auto_escalate) {
      return false;
    }
    
    // Escalate based on severity threshold
    const severityLevels = { low: 1, medium: 2, high: 3 };
    const currentLevel = severityLevels[pattern.severity];
    const thresholdLevel = severityLevels[this.escalationConfig.severity_threshold];
    
    if (currentLevel < thresholdLevel) {
      return false;
    }
    
    // Escalate if confidence is high enough
    if (pattern.confidence < 0.6) {
      return false;
    }
    
    // Always escalate Claude-specific high severity errors
    if (pattern.severity === 'high' && this.isClaudeSpecificError(pattern.type)) {
      return true;
    }
    
    return currentLevel >= thresholdLevel;
  }

  private isClaudeSpecificError(errorType: string): boolean {
    return errorType.includes('claude') || 
           errorType.includes('api-auth') ||
           errorType.includes('api-timeout');
  }

  private getErrorDescription(errorType: string): string {
    const descriptions: Record<string, string> = {
      'api-timeout-error': 'API request timed out - possibly due to network issues or server overload',
      'api-auth-error': 'Authentication failed - check API credentials and permissions',
      'api-rate-limit': 'API rate limit exceeded - requests are being throttled',
      'claude-connection-error': 'Failed to connect to Claude API service',
      'claude-model-error': 'Claude model is unavailable or encountered an error',
      'claude-context-error': 'Input exceeds Claude context limits or token constraints',
      'file-access-error': 'File system access denied - check permissions',
      'file-not-found': 'Required file or directory not found',
      'disk-space-error': 'Insufficient disk space available',
      'memory-error': 'System running out of memory - consider restarting',
      'performance-error': 'Performance degradation detected',
      'network-error': 'Network connectivity issues detected',
      'dns-error': 'DNS resolution failed - check network configuration',
      'syntax-error': 'Code syntax error detected',
      'type-error': 'Type checking error in code',
      'unknown-error': 'Unrecognized error pattern'
    };
    
    return descriptions[errorType] || 'Unknown error type';
  }

  async escalateError(errorData: any, pattern: ErrorPattern): Promise<void> {
    try {
      console.log(`[Escalation Handler] Escalating ${pattern.severity} error: ${pattern.type}`);
      
      const escalationData = {
        plugin: 'claude-code',
        error: errorData,
        pattern,
        timestamp: new Date().toISOString(),
        config: this.escalationConfig
      };
      
      this.emit('error-escalated', escalationData);
      
      // Here you would typically send to the escalation manager
      // await this.sendToEscalationManager(escalationData);
      
    } catch (error) {
      console.error('[Escalation Handler] Error during escalation:', error);
    }
  }

  private createDefaultPattern(): ErrorPattern {
    return {
      type: 'unknown-error',
      severity: 'medium',
      shouldEscalate: false,
      confidence: 0,
      pattern: 'unknown',
      description: 'Default error pattern'
    };
  }

  updateEscalationConfig(config: Partial<EscalationConfig>): void {
    this.escalationConfig = { ...this.escalationConfig, ...config };
    console.log('[Escalation Handler] Updated escalation configuration');
  }

  getEscalationConfig(): EscalationConfig {
    return { ...this.escalationConfig };
  }

  addErrorPattern(name: string, pattern: RegExp): void {
    this.errorPatterns.set(name, pattern);
    console.log(`[Escalation Handler] Added error pattern: ${name}`);
  }

  removeErrorPattern(name: string): void {
    this.errorPatterns.delete(name);
    console.log(`[Escalation Handler] Removed error pattern: ${name}`);
  }

  getErrorPatterns(): string[] {
    return Array.from(this.errorPatterns.keys());
  }
}
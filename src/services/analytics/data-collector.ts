import { 
  DateRange, 
  ProductivityMetrics, 
  ErrorAnalytics, 
  AIEffectivenessMetrics, 
  PluginMetrics, 
  WorkflowMetrics,
  UserAction,
  CodeChange,
  ErrorEvent,
  AIInteraction,
  TimeSeriesData
} from '@/types/analytics';

export class AnalyticsDataCollector {
  private static instance: AnalyticsDataCollector;
  private actionsQueue: UserAction[] = [];
  private codeChangesQueue: CodeChange[] = [];
  private errorsQueue: ErrorEvent[] = [];
  private aiInteractionsQueue: AIInteraction[] = [];

  static getInstance(): AnalyticsDataCollector {
    if (!AnalyticsDataCollector.instance) {
      AnalyticsDataCollector.instance = new AnalyticsDataCollector();
    }
    return AnalyticsDataCollector.instance;
  }

  async collectProductivityData(timeframe: DateRange): Promise<ProductivityMetrics> {
    try {
      // Simulate data collection from various sources
      const activities = await this.getActivitiesInTimeframe(timeframe);
      const commits = await this.getCommitsInTimeframe(timeframe);
      const codeChanges = await this.getCodeChangesInTimeframe(timeframe);
      
      const linesOfCode = {
        added: codeChanges.reduce((sum, change) => sum + change.linesAdded, 0),
        deleted: codeChanges.reduce((sum, change) => sum + change.linesDeleted, 0),
        modified: codeChanges.filter(change => change.type === 'modify').length
      };

      const commitStats = {
        count: commits.length,
        averageSize: commits.length > 0 ? 
          commits.reduce((sum, commit) => sum + commit.size, 0) / commits.length : 0,
        frequency: this.calculateCommitFrequency(commits, timeframe)
      };

      const activeTime = await this.calculateActiveTime(activities, timeframe);
      const focusScore = await this.calculateFocusScore(activities, timeframe);
      const timeSeries = await this.generateProductivityTimeSeries(timeframe);

      return {
        timeframe,
        linesOfCode,
        commits: commitStats,
        activeTime,
        focusScore,
        timeSeries
      };
    } catch (error) {
      console.error('Error collecting productivity data:', error);
      return this.getDefaultProductivityMetrics(timeframe);
    }
  }

  async collectErrorData(timeframe: DateRange): Promise<ErrorAnalytics> {
    try {
      const errors = await this.getErrorsInTimeframe(timeframe);
      
      const errorFrequency = await this.generateErrorFrequencyTimeSeries(errors, timeframe);
      const errorTypes = this.analyzeErrorTypes(errors);
      const resolutionTimes = this.calculateResolutionTimes(errors);
      const recurringIssues = await this.identifyRecurringIssues(errors);

      return {
        errorFrequency,
        errorTypes,
        resolutionTimes,
        recurringIssues
      };
    } catch (error) {
      console.error('Error collecting error data:', error);
      return this.getDefaultErrorAnalytics();
    }
  }

  async collectAIData(timeframe: DateRange): Promise<AIEffectivenessMetrics> {
    try {
      const escalations = await this.getEscalationsInTimeframe(timeframe);
      const aiInteractions = await this.getAIInteractionsInTimeframe(timeframe);
      
      const escalationStats = {
        total: escalations.length,
        resolved: escalations.filter(e => e.resolved).length,
        accuracy: this.calculateAccuracy(escalations),
        averageResponseTime: this.calculateAverageResponseTime(escalations)
      };

      const providerPerformance = this.analyzeProviderPerformance(aiInteractions);
      const suggestionQuality = this.analyzeSuggestionQuality(aiInteractions);

      return {
        escalationStats,
        providerPerformance,
        suggestionQuality
      };
    } catch (error) {
      console.error('Error collecting AI data:', error);
      return this.getDefaultAIMetrics();
    }
  }

  async collectPluginData(timeframe: DateRange): Promise<PluginMetrics> {
    try {
      const pluginEvents = await this.getPluginEventsInTimeframe(timeframe);
      const pluginStats = await this.getPluginStats();
      
      const usage = this.analyzePluginUsage(pluginEvents);
      const performance = await this.analyzePluginPerformance();
      const adoption = this.analyzePluginAdoption(pluginStats);

      return {
        usage,
        performance,
        adoption
      };
    } catch (error) {
      console.error('Error collecting plugin data:', error);
      return this.getDefaultPluginMetrics();
    }
  }

  async collectWorkflowData(timeframe: DateRange): Promise<WorkflowMetrics> {
    try {
      const workflowExecutions = await this.getWorkflowExecutionsInTimeframe(timeframe);
      const workflowStats = await this.getWorkflowStats();
      
      const execution = this.analyzeWorkflowExecution(workflowExecutions);
      const efficiency = this.analyzeWorkflowEfficiency(workflowExecutions);
      const adoption = this.analyzeWorkflowAdoption(workflowStats);

      return {
        execution,
        efficiency,
        adoption
      };
    } catch (error) {
      console.error('Error collecting workflow data:', error);
      return this.getDefaultWorkflowMetrics();
    }
  }

  // Real-time tracking methods
  trackUserAction(action: UserAction): void {
    this.actionsQueue.push(action);
    this.processActionQueue();
  }

  trackCodeChange(change: CodeChange): void {
    this.codeChangesQueue.push(change);
    this.processCodeChangeQueue();
  }

  trackError(error: ErrorEvent): void {
    this.errorsQueue.push(error);
    this.processErrorQueue();
  }

  trackAIInteraction(interaction: AIInteraction): void {
    this.aiInteractionsQueue.push(interaction);
    this.processAIInteractionQueue();
  }

  // Private helper methods
  private async getActivitiesInTimeframe(timeframe: DateRange): Promise<any[]> {
    // TODO: Integrate with activity service
    return [];
  }

  private async getCommitsInTimeframe(timeframe: DateRange): Promise<any[]> {
    // TODO: Integrate with git service
    return [];
  }

  private async getCodeChangesInTimeframe(timeframe: DateRange): Promise<CodeChange[]> {
    return this.codeChangesQueue.filter(change => 
      change.timestamp >= timeframe.start && change.timestamp <= timeframe.end
    );
  }

  private async getErrorsInTimeframe(timeframe: DateRange): Promise<ErrorEvent[]> {
    return this.errorsQueue.filter(error => 
      error.timestamp >= timeframe.start && error.timestamp <= timeframe.end
    );
  }

  private async getEscalationsInTimeframe(timeframe: DateRange): Promise<any[]> {
    // TODO: Integrate with escalation service
    return [];
  }

  private async getAIInteractionsInTimeframe(timeframe: DateRange): Promise<AIInteraction[]> {
    return this.aiInteractionsQueue.filter(interaction => 
      interaction.timestamp >= timeframe.start && interaction.timestamp <= timeframe.end
    );
  }

  private async getPluginEventsInTimeframe(timeframe: DateRange): Promise<any[]> {
    // TODO: Integrate with plugin system
    return [];
  }

  private async getWorkflowExecutionsInTimeframe(timeframe: DateRange): Promise<any[]> {
    // TODO: Integrate with workflow service
    return [];
  }

  private calculateCommitFrequency(commits: any[], timeframe: DateRange): number {
    const daysDiff = Math.ceil((timeframe.end.getTime() - timeframe.start.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 0 ? commits.length / daysDiff : 0;
  }

  private async calculateActiveTime(activities: any[], timeframe: DateRange): Promise<{coding: number, debugging: number, planning: number}> {
    // Simulate active time calculation
    return {
      coding: Math.random() * 480, // minutes
      debugging: Math.random() * 120,
      planning: Math.random() * 60
    };
  }

  private async calculateFocusScore(activities: any[], timeframe: DateRange): Promise<number> {
    // Simulate focus score calculation based on interruption patterns
    return Math.floor(Math.random() * 40) + 60; // 60-100
  }

  private async generateProductivityTimeSeries(timeframe: DateRange): Promise<TimeSeriesData[]> {
    const data: TimeSeriesData[] = [];
    const daysDiff = Math.ceil((timeframe.end.getTime() - timeframe.start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(timeframe.start);
      date.setDate(date.getDate() + i);
      
      data.push({
        timestamp: date,
        value: Math.floor(Math.random() * 500) + 100,
        label: `Day ${i + 1}`
      });
    }
    
    return data;
  }

  private async generateErrorFrequencyTimeSeries(errors: ErrorEvent[], timeframe: DateRange): Promise<TimeSeriesData[]> {
    // Group errors by day and create time series
    const data: TimeSeriesData[] = [];
    const daysDiff = Math.ceil((timeframe.end.getTime() - timeframe.start.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i < daysDiff; i++) {
      const date = new Date(timeframe.start);
      date.setDate(date.getDate() + i);
      
      const dayErrors = errors.filter(error => {
        const errorDate = new Date(error.timestamp);
        return errorDate.toDateString() === date.toDateString();
      });
      
      data.push({
        timestamp: date,
        value: dayErrors.length,
        label: `Day ${i + 1}`
      });
    }
    
    return data;
  }

  private analyzeErrorTypes(errors: ErrorEvent[]): {type: string, count: number, trend: number}[] {
    const typeMap = new Map<string, number>();
    
    errors.forEach(error => {
      const errorType = this.extractErrorType(error.error);
      typeMap.set(errorType, (typeMap.get(errorType) || 0) + 1);
    });
    
    return Array.from(typeMap.entries()).map(([type, count]) => ({
      type,
      count,
      trend: Math.random() * 0.4 - 0.2 // -20% to +20%
    }));
  }

  private extractErrorType(errorMessage: string): string {
    // Simple error type extraction
    if (errorMessage.includes('TypeError')) return 'TypeError';
    if (errorMessage.includes('ReferenceError')) return 'ReferenceError';
    if (errorMessage.includes('SyntaxError')) return 'SyntaxError';
    if (errorMessage.includes('Network')) return 'NetworkError';
    return 'UnknownError';
  }

  private calculateResolutionTimes(errors: ErrorEvent[]): {average: number, median: number, p95: number} {
    const resolvedErrors = errors.filter(e => e.resolved && e.resolutionTime);
    const times = resolvedErrors.map(e => e.resolutionTime!);
    
    if (times.length === 0) {
      return { average: 0, median: 0, p95: 0 };
    }
    
    times.sort((a, b) => a - b);
    
    return {
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      median: times[Math.floor(times.length / 2)],
      p95: times[Math.floor(times.length * 0.95)]
    };
  }

  private async identifyRecurringIssues(errors: ErrorEvent[]): Promise<any[]> {
    // Group similar errors and identify patterns
    const patterns = new Map<string, {count: number, lastSeen: Date}>();
    
    errors.forEach(error => {
      const pattern = this.extractErrorPattern(error.error);
      const existing = patterns.get(pattern) || {count: 0, lastSeen: new Date(0)};
      patterns.set(pattern, {
        count: existing.count + 1,
        lastSeen: error.timestamp > existing.lastSeen ? error.timestamp : existing.lastSeen
      });
    });
    
    return Array.from(patterns.entries())
      .filter(([_, data]) => data.count > 1)
      .map(([pattern, data]) => ({
        pattern,
        occurrences: data.count,
        lastSeen: data.lastSeen,
        aiSuggestion: `Consider reviewing ${pattern} implementation`
      }));
  }

  private extractErrorPattern(errorMessage: string): string {
    // Extract patterns from error messages (simplified)
    const lines = errorMessage.split('\n');
    return lines[0].substring(0, 100); // First line, truncated
  }

  // Default metrics for error cases
  private getDefaultProductivityMetrics(timeframe: DateRange): ProductivityMetrics {
    return {
      timeframe,
      linesOfCode: { added: 0, deleted: 0, modified: 0 },
      commits: { count: 0, averageSize: 0, frequency: 0 },
      activeTime: { coding: 0, debugging: 0, planning: 0 },
      focusScore: 50,
      timeSeries: []
    };
  }

  private getDefaultErrorAnalytics(): ErrorAnalytics {
    return {
      errorFrequency: [],
      errorTypes: [],
      resolutionTimes: { average: 0, median: 0, p95: 0 },
      recurringIssues: []
    };
  }

  private getDefaultAIMetrics(): AIEffectivenessMetrics {
    return {
      escalationStats: { total: 0, resolved: 0, accuracy: 0, averageResponseTime: 0 },
      providerPerformance: [],
      suggestionQuality: { helpfulnessScore: 0, implementationRate: 0, falsePositiveRate: 0 }
    };
  }

  private getDefaultPluginMetrics(): PluginMetrics {
    return {
      usage: [],
      performance: { totalLoadTime: 0, memoryUsage: 0, cpuUsage: 0 },
      adoption: { activePlugins: 0, disabledPlugins: 0, installRate: 0, uninstallRate: 0 }
    };
  }

  private getDefaultWorkflowMetrics(): WorkflowMetrics {
    return {
      execution: [],
      efficiency: { automationRate: 0, manualInterventions: 0, errorRate: 0 },
      adoption: { activeWorkflows: 0, createdWorkflows: 0, deletedWorkflows: 0 }
    };
  }

  // Queue processing methods
  private processActionQueue(): void {
    if (this.actionsQueue.length > 100) {
      // Persist to database and clear queue
      this.persistActions(this.actionsQueue.splice(0, 50));
    }
  }

  private processCodeChangeQueue(): void {
    if (this.codeChangesQueue.length > 50) {
      this.persistCodeChanges(this.codeChangesQueue.splice(0, 25));
    }
  }

  private processErrorQueue(): void {
    if (this.errorsQueue.length > 20) {
      this.persistErrors(this.errorsQueue.splice(0, 10));
    }
  }

  private processAIInteractionQueue(): void {
    if (this.aiInteractionsQueue.length > 30) {
      this.persistAIInteractions(this.aiInteractionsQueue.splice(0, 15));
    }
  }

  // Persistence methods (to be implemented with actual database)
  private async persistActions(actions: UserAction[]): Promise<void> {
    // TODO: Implement database persistence
    console.log('Persisting actions:', actions.length);
  }

  private async persistCodeChanges(changes: CodeChange[]): Promise<void> {
    // TODO: Implement database persistence
    console.log('Persisting code changes:', changes.length);
  }

  private async persistErrors(errors: ErrorEvent[]): Promise<void> {
    // TODO: Implement database persistence
    console.log('Persisting errors:', errors.length);
  }

  private async persistAIInteractions(interactions: AIInteraction[]): Promise<void> {
    // TODO: Implement database persistence
    console.log('Persisting AI interactions:', interactions.length);
  }

  // Additional analysis methods
  private calculateAccuracy(escalations: any[]): number {
    if (escalations.length === 0) return 0;
    const successful = escalations.filter(e => e.successful).length;
    return (successful / escalations.length) * 100;
  }

  private calculateAverageResponseTime(escalations: any[]): number {
    if (escalations.length === 0) return 0;
    const totalTime = escalations.reduce((sum, e) => sum + (e.responseTime || 0), 0);
    return totalTime / escalations.length;
  }

  private analyzeProviderPerformance(interactions: AIInteraction[]): any[] {
    const providerMap = new Map<string, any>();
    
    interactions.forEach(interaction => {
      const existing = providerMap.get(interaction.provider) || {
        provider: interaction.provider,
        total: 0,
        successful: 0,
        totalLatency: 0,
        totalTokens: 0,
        totalCost: 0
      };
      
      existing.total++;
      if (interaction.successful) existing.successful++;
      existing.totalLatency += interaction.latency;
      existing.totalTokens += interaction.tokens;
      existing.totalCost += this.calculateCost(interaction.provider, interaction.tokens);
      
      providerMap.set(interaction.provider, existing);
    });
    
    return Array.from(providerMap.values()).map(provider => ({
      provider: provider.provider,
      successRate: provider.total > 0 ? (provider.successful / provider.total) * 100 : 0,
      averageLatency: provider.total > 0 ? provider.totalLatency / provider.total : 0,
      tokenUsage: provider.totalTokens,
      cost: provider.totalCost
    }));
  }

  private calculateCost(provider: string, tokens: number): number {
    // Simplified cost calculation
    const rates = {
      'claude': 0.015,
      'openai': 0.01,
      'gemini': 0.005
    };
    return tokens * (rates[provider as keyof typeof rates] || 0.01) / 1000;
  }

  private analyzeSuggestionQuality(interactions: AIInteraction[]): any {
    const helpfulInteractions = interactions.filter(i => i.helpful === true);
    const unhelpfulInteractions = interactions.filter(i => i.helpful === false);
    const totalFeedback = helpfulInteractions.length + unhelpfulInteractions.length;
    
    return {
      helpfulnessScore: totalFeedback > 0 ? (helpfulInteractions.length / totalFeedback) * 100 : 0,
      implementationRate: Math.random() * 30 + 60, // 60-90% simulation
      falsePositiveRate: Math.random() * 15 + 5 // 5-20% simulation
    };
  }

  private analyzePluginUsage(events: any[]): any[] {
    // TODO: Implement plugin usage analysis
    return [];
  }

  private async analyzePluginPerformance(): Promise<any> {
    // TODO: Implement plugin performance analysis
    return {
      totalLoadTime: Math.random() * 1000,
      memoryUsage: Math.random() * 100,
      cpuUsage: Math.random() * 50
    };
  }

  private analyzePluginAdoption(stats: any): any {
    // TODO: Implement plugin adoption analysis
    return {
      activePlugins: Math.floor(Math.random() * 10),
      disabledPlugins: Math.floor(Math.random() * 3),
      installRate: Math.random() * 2,
      uninstallRate: Math.random() * 0.5
    };
  }

  private analyzeWorkflowExecution(executions: any[]): any[] {
    // TODO: Implement workflow execution analysis
    return [];
  }

  private analyzeWorkflowEfficiency(executions: any[]): any {
    // TODO: Implement workflow efficiency analysis
    return {
      automationRate: Math.random() * 40 + 60,
      manualInterventions: Math.floor(Math.random() * 10),
      errorRate: Math.random() * 10
    };
  }

  private analyzeWorkflowAdoption(stats: any): any {
    // TODO: Implement workflow adoption analysis
    return {
      activeWorkflows: Math.floor(Math.random() * 5),
      createdWorkflows: Math.floor(Math.random() * 10),
      deletedWorkflows: Math.floor(Math.random() * 2)
    };
  }

  private async getPluginStats(): Promise<any> {
    // TODO: Get actual plugin statistics
    return {};
  }

  private async getWorkflowStats(): Promise<any> {
    // TODO: Get actual workflow statistics
    return {};
  }
}
import { 
  Anomaly, 
  TimeSeriesData, 
  ProductivityMetrics, 
  ErrorAnalytics,
  DateRange 
} from '@/types/analytics';

export class AnomalyDetector {
  private static instance: AnomalyDetector;

  static getInstance(): AnomalyDetector {
    if (!AnomalyDetector.instance) {
      AnomalyDetector.instance = new AnomalyDetector();
    }
    return AnomalyDetector.instance;
  }

  async detectProductivityAnomalies(data: ProductivityMetrics[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    if (data.length < 7) { // Need at least a week of data
      return anomalies;
    }
    
    try {
      // Extract metrics for analysis
      const focusScores = data.map(d => d.focusScore);
      const linesOfCode = data.map(d => d.linesOfCode.added);
      const commitCounts = data.map(d => d.commits.count);
      const activeTimes = data.map(d => d.activeTime.coding + d.activeTime.debugging + d.activeTime.planning);
      
      // Detect focus score anomalies
      const focusAnomalies = this.detectStatisticalAnomalies(focusScores, 'focus_score');
      anomalies.push(...focusAnomalies.map(anomaly => ({
        ...anomaly,
        type: 'productivity_focus',
        affectedMetrics: ['focusScore', 'productivity'],
        suggestions: this.generateFocusAnomalySuggestions(anomaly.value, anomaly.deviation)
      })));
      
      // Detect code output anomalies
      const codeAnomalies = this.detectStatisticalAnomalies(linesOfCode, 'lines_of_code');
      anomalies.push(...codeAnomalies.map(anomaly => ({
        ...anomaly,
        type: 'productivity_output',
        affectedMetrics: ['linesOfCode', 'productivity'],
        suggestions: this.generateCodeOutputAnomalySuggestions(anomaly.value, anomaly.deviation)
      })));
      
      // Detect commit pattern anomalies
      const commitAnomalies = this.detectStatisticalAnomalies(commitCounts, 'commit_count');
      anomalies.push(...commitAnomalies.map(anomaly => ({
        ...anomaly,
        type: 'productivity_commits',
        affectedMetrics: ['commits', 'workflow'],
        suggestions: this.generateCommitAnomalySuggestions(anomaly.value, anomaly.deviation)
      })));
      
      // Detect activity time anomalies
      const activityAnomalies = this.detectStatisticalAnomalies(activeTimes, 'active_time');
      anomalies.push(...activityAnomalies.map(anomaly => ({
        ...anomaly,
        type: 'productivity_activity',
        affectedMetrics: ['activeTime', 'engagement'],
        suggestions: this.generateActivityAnomalySuggestions(anomaly.value, anomaly.deviation)
      })));
      
      // Detect compound anomalies (multiple metrics simultaneously)
      const compoundAnomalies = this.detectCompoundAnomalies(data);
      anomalies.push(...compoundAnomalies);
      
      return anomalies;
    } catch (error) {
      console.error('Error detecting productivity anomalies:', error);
      return [];
    }
  }

  async detectErrorSpikes(errorData: ErrorAnalytics[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    if (errorData.length < 5) {
      return anomalies;
    }
    
    try {
      // Analyze error frequency trends
      const errorCounts = errorData.map(data => 
        data.errorTypes.reduce((sum, type) => sum + type.count, 0)
      );
      
      const errorFrequencyAnomalies = this.detectStatisticalAnomalies(errorCounts, 'error_frequency');
      anomalies.push(...errorFrequencyAnomalies.map(anomaly => ({
        ...anomaly,
        type: 'error_spike',
        affectedMetrics: ['errorCount', 'quality'],
        suggestions: this.generateErrorSpikesuggestions(anomaly.value, anomaly.deviation)
      })));
      
      // Analyze resolution time anomalies
      const resolutionTimes = errorData.map(data => data.resolutionTimes.average);
      const resolutionAnomalies = this.detectStatisticalAnomalies(resolutionTimes, 'resolution_time');
      anomalies.push(...resolutionAnomalies.map(anomaly => ({
        ...anomaly,
        type: 'resolution_delay',
        affectedMetrics: ['resolutionTime', 'efficiency'],
        suggestions: this.generateResolutionTimeAnomalySuggestions(anomaly.value, anomaly.deviation)
      })));
      
      // Detect new error type patterns
      const newErrorTypes = this.detectNewErrorTypes(errorData);
      anomalies.push(...newErrorTypes);
      
      return anomalies;
    } catch (error) {
      console.error('Error detecting error spikes:', error);
      return [];
    }
  }

  async detectBehaviorChanges(timeSeriesData: TimeSeriesData[], windowSize: number = 7): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    if (timeSeriesData.length < windowSize * 2) {
      return anomalies;
    }
    
    try {
      // Calculate rolling statistics
      for (let i = windowSize; i < timeSeriesData.length - windowSize; i++) {
        const beforeWindow = timeSeriesData.slice(i - windowSize, i);
        const afterWindow = timeSeriesData.slice(i, i + windowSize);
        
        const beforeMean = this.calculateMean(beforeWindow.map(d => d.value));
        const afterMean = this.calculateMean(afterWindow.map(d => d.value));
        
        const beforeStd = this.calculateStandardDeviation(beforeWindow.map(d => d.value));
        const afterStd = this.calculateStandardDeviation(afterWindow.map(d => d.value));
        
        // Detect significant mean shift
        const meanChange = Math.abs((afterMean - beforeMean) / beforeMean);
        if (meanChange > 0.3) { // 30% change threshold
          anomalies.push({
            type: 'behavior_shift',
            severity: this.calculateSeverityFromChange(meanChange),
            description: `Significant ${afterMean > beforeMean ? 'increase' : 'decrease'} in activity detected: ${(meanChange * 100).toFixed(1)}% change`,
            timestamp: timeSeriesData[i].timestamp,
            suggestions: this.generateBehaviorChangesuggestions(meanChange, afterMean > beforeMean),
            affectedMetrics: ['productivity', 'behavior'],
            confidence: Math.min(meanChange / 0.5, 1) // Normalize confidence
          });
        }
        
        // Detect volatility changes
        const volatilityChange = Math.abs((afterStd - beforeStd) / beforeStd);
        if (volatilityChange > 0.5) { // 50% volatility change
          anomalies.push({
            type: 'volatility_change',
            severity: this.calculateSeverityFromChange(volatilityChange),
            description: `${afterStd > beforeStd ? 'Increased' : 'Decreased'} variability detected: ${(volatilityChange * 100).toFixed(1)}% change in consistency`,
            timestamp: timeSeriesData[i].timestamp,
            suggestions: this.generateVolatilityChangesuggestions(volatilityChange, afterStd > beforeStd),
            affectedMetrics: ['consistency', 'stability'],
            confidence: Math.min(volatilityChange / 1, 1)
          });
        }
      }
      
      return anomalies;
    } catch (error) {
      console.error('Error detecting behavior changes:', error);
      return [];
    }
  }

  async detectSeasonalAnomalies(timeSeriesData: TimeSeriesData[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    if (timeSeriesData.length < 28) { // Need at least 4 weeks
      return anomalies;
    }
    
    try {
      // Group by day of week
      const dayOfWeekData = this.groupByDayOfWeek(timeSeriesData);
      
      // Detect unusual patterns for each day
      Object.entries(dayOfWeekData).forEach(([dayName, values]) => {
        if (values.length >= 3) {
          const dayAnomalies = this.detectStatisticalAnomalies(values, `${dayName}_pattern`);
          anomalies.push(...dayAnomalies.map(anomaly => ({
            ...anomaly,
            type: 'seasonal_anomaly',
            description: `Unusual ${dayName} pattern: ${anomaly.description}`,
            affectedMetrics: ['seasonal_pattern', 'consistency'],
            suggestions: [`Review ${dayName} schedule and activities`, ...anomaly.suggestions]
          })));
        }
      });
      
      // Group by hour of day (if timestamps include time)
      const hourlyData = this.groupByHour(timeSeriesData);
      
      // Detect unusual hourly patterns
      Object.entries(hourlyData).forEach(([hour, values]) => {
        if (values.length >= 5) {
          const hourAnomalies = this.detectStatisticalAnomalies(values, `hour_${hour}_pattern`);
          anomalies.push(...hourAnomalies.map(anomaly => ({
            ...anomaly,
            type: 'temporal_anomaly',
            description: `Unusual activity at ${hour}:00: ${anomaly.description}`,
            affectedMetrics: ['temporal_pattern', 'schedule'],
            suggestions: [`Review activities around ${hour}:00`, ...anomaly.suggestions]
          })));
        }
      });
      
      return anomalies;
    } catch (error) {
      console.error('Error detecting seasonal anomalies:', error);
      return [];
    }
  }

  // Private helper methods
  private detectStatisticalAnomalies(values: number[], metricName: string, threshold: number = 2.5): any[] {
    if (values.length < 3) return [];
    
    const mean = this.calculateMean(values);
    const std = this.calculateStandardDeviation(values);
    
    if (std === 0) return []; // No variation
    
    const anomalies: any[] = [];
    
    values.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / std);
      
      if (zScore > threshold) {
        anomalies.push({
          value,
          index,
          zScore,
          deviation: value - mean,
          severity: this.calculateSeverityFromZScore(zScore),
          description: `${metricName} value ${value.toFixed(2)} is ${zScore.toFixed(2)}σ from normal (${mean.toFixed(2)})`,
          timestamp: new Date(), // Will be overridden by caller
          suggestions: [], // Will be filled by caller
          confidence: Math.min(zScore / 3, 1)
        });
      }
    });
    
    return anomalies;
  }

  private detectCompoundAnomalies(data: ProductivityMetrics[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Look for patterns where multiple metrics are anomalous simultaneously
    data.forEach((metric, index) => {
      const issues: string[] = [];
      
      // Low focus + high errors + low productivity
      if (metric.focusScore < 50 && 
          metric.linesOfCode.added < 100 && 
          index > 0 && data[index - 1].focusScore > metric.focusScore) {
        issues.push('declining performance pattern');
      }
      
      // High productivity + low commits (large commits)
      if (metric.linesOfCode.added > 500 && metric.commits.count < 2) {
        issues.push('large commit pattern');
      }
      
      // Low activity time + normal output (efficiency spike)
      const totalActiveTime = metric.activeTime.coding + metric.activeTime.debugging + metric.activeTime.planning;
      if (totalActiveTime < 240 && metric.linesOfCode.added > 200) { // Less than 4 hours but good output
        issues.push('high efficiency pattern');
      }
      
      if (issues.length > 0) {
        anomalies.push({
          type: 'compound_pattern',
          severity: issues.includes('declining performance pattern') ? 'high' : 'medium',
          description: `Multiple patterns detected: ${issues.join(', ')}`,
          timestamp: new Date(),
          suggestions: this.generateCompoundAnomalySuggestions(issues),
          affectedMetrics: ['productivity', 'workflow', 'efficiency'],
          confidence: 0.8
        });
      }
    });
    
    return anomalies;
  }

  private detectNewErrorTypes(errorData: ErrorAnalytics[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    if (errorData.length < 2) return anomalies;
    
    const recentErrors = errorData[errorData.length - 1].errorTypes.map(e => e.type);
    const historicalErrors = new Set(
      errorData.slice(0, -1).flatMap(data => data.errorTypes.map(e => e.type))
    );
    
    const newErrorTypes = recentErrors.filter(type => !historicalErrors.has(type));
    
    newErrorTypes.forEach(errorType => {
      anomalies.push({
        type: 'new_error_type',
        severity: 'medium',
        description: `New error type detected: ${errorType}`,
        timestamp: new Date(),
        suggestions: [
          `Investigate root cause of ${errorType}`,
          'Add specific handling for this error type',
          'Review recent code changes',
          'Consider adding tests to prevent recurrence'
        ],
        affectedMetrics: ['errorTypes', 'quality'],
        confidence: 0.9
      });
    });
    
    return anomalies;
  }

  private groupByDayOfWeek(data: TimeSeriesData[]): Record<string, number[]> {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grouped: Record<string, number[]> = {};
    
    dayNames.forEach(day => grouped[day] = []);
    
    data.forEach(point => {
      const dayOfWeek = point.timestamp.getDay();
      grouped[dayNames[dayOfWeek]].push(point.value);
    });
    
    return grouped;
  }

  private groupByHour(data: TimeSeriesData[]): Record<string, number[]> {
    const grouped: Record<string, number[]> = {};
    
    for (let hour = 0; hour < 24; hour++) {
      grouped[hour.toString()] = [];
    }
    
    data.forEach(point => {
      const hour = point.timestamp.getHours().toString();
      if (grouped[hour]) {
        grouped[hour].push(point.value);
      }
    });
    
    return grouped;
  }

  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = this.calculateMean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateSeverityFromZScore(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (zScore > 4) return 'critical';
    if (zScore > 3) return 'high';
    if (zScore > 2.5) return 'medium';
    return 'low';
  }

  private calculateSeverityFromChange(change: number): 'low' | 'medium' | 'high' | 'critical' {
    if (change > 1) return 'critical'; // 100%+ change
    if (change > 0.5) return 'high';   // 50%+ change
    if (change > 0.3) return 'medium'; // 30%+ change
    return 'low';
  }

  // Suggestion generators
  private generateFocusAnomalySuggestions(value: number, deviation: number): string[] {
    if (deviation < 0) {
      return [
        'Consider taking a break to refresh focus',
        'Review and minimize distractions',
        'Try time-blocking techniques',
        'Check notification settings',
        'Evaluate workspace ergonomics'
      ];
    } else {
      return [
        'Great focus! Document what worked well',
        'Share your focus techniques with the team',
        'Maintain current practices',
        'Consider mentoring others'
      ];
    }
  }

  private generateCodeOutputAnomalySuggestions(value: number, deviation: number): string[] {
    if (deviation < 0) {
      return [
        'Review current blockers and dependencies',
        'Consider pair programming for complex tasks',
        'Break down large tasks into smaller ones',
        'Check if additional tools or resources are needed'
      ];
    } else {
      return [
        'Excellent productivity! Consider code review quality',
        'Ensure code quality is maintained',
        'Document successful practices',
        'Share knowledge with team members'
      ];
    }
  }

  private generateCommitAnomalySuggestions(value: number, deviation: number): string[] {
    if (deviation < 0) {
      return [
        'Consider committing more frequently',
        'Break down work into smaller, atomic commits',
        'Use feature branches for better organization',
        'Review git workflow practices'
      ];
    } else {
      return [
        'Good commit frequency! Ensure each commit is meaningful',
        'Consider squashing related commits',
        'Maintain good commit message quality',
        'Balance frequency with commit atomicity'
      ];
    }
  }

  private generateActivityAnomalySuggestions(value: number, deviation: number): string[] {
    if (deviation < 0) {
      return [
        'Review calendar for excessive meetings',
        'Identify and eliminate time wasters',
        'Consider time tracking tools',
        'Block dedicated coding time',
        'Evaluate work-life balance'
      ];
    } else {
      return [
        'High activity detected - ensure sustainable pace',
        'Take regular breaks to prevent burnout',
        'Monitor energy levels and productivity quality',
        'Consider delegating some tasks'
      ];
    }
  }

  private generateErrorSpikesuggestions(value: number, deviation: number): string[] {
    return [
      'Investigate recent code changes',
      'Run additional tests and validation',
      'Review error patterns for root causes',
      'Consider pair review for recent commits',
      'Implement additional error handling',
      'Add monitoring for similar issues'
    ];
  }

  private generateResolutionTimeAnomalySuggestions(value: number, deviation: number): string[] {
    if (deviation > 0) {
      return [
        'Review debugging strategies and tools',
        'Consider asking for help or pair debugging',
        'Break down complex issues into smaller parts',
        'Improve error logging and monitoring',
        'Update documentation for common issues'
      ];
    } else {
      return [
        'Excellent resolution speed!',
        'Document successful debugging techniques',
        'Share knowledge with team members',
        'Consider creating debugging guides'
      ];
    }
  }

  private generateBehaviorChangesuggestions(change: number, isIncrease: boolean): string[] {
    if (isIncrease) {
      return [
        'Monitor sustainability of increased activity',
        'Document what drove the improvement',
        'Share successful practices',
        'Ensure quality is maintained'
      ];
    } else {
      return [
        'Investigate causes of decreased activity',
        'Review recent process changes',
        'Check for external blockers',
        'Consider additional support or resources'
      ];
    }
  }

  private generateVolatilityChangesuggestions(change: number, isIncrease: boolean): string[] {
    if (isIncrease) {
      return [
        'Work on establishing more consistent patterns',
        'Identify sources of variability',
        'Implement routine and structure',
        'Review planning and estimation processes'
      ];
    } else {
      return [
        'Good improvement in consistency!',
        'Maintain current stable practices',
        'Document what contributed to stability',
        'Consider sharing approach with team'
      ];
    }
  }

  private generateCompoundAnomalySuggestions(issues: string[]): string[] {
    const suggestions = new Set<string>();
    
    if (issues.includes('declining performance pattern')) {
      suggestions.add('Take a break and reassess priorities');
      suggestions.add('Review recent changes in workload or environment');
      suggestions.add('Consider pair programming or mentoring');
    }
    
    if (issues.includes('large commit pattern')) {
      suggestions.add('Break down work into smaller, atomic commits');
      suggestions.add('Commit more frequently during development');
      suggestions.add('Use feature branches for better organization');
    }
    
    if (issues.includes('high efficiency pattern')) {
      suggestions.add('Document and share your efficient practices');
      suggestions.add('Maintain quality while preserving efficiency');
      suggestions.add('Consider mentoring others on efficiency techniques');
    }
    
    return Array.from(suggestions);
  }
}
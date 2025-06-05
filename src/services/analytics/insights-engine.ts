import { 
  Insight, 
  AnalyticsData, 
  Anomaly, 
  Optimization, 
  ProductivityForecast,
  BurnoutRisk,
  BenchmarkResult,
  AnalyticsReport,
  DateRange,
  TimeSeriesData,
  RiskAssessment,
  WorkflowRecommendation
} from '@/types/analytics';
import { AnalyticsDataCollector } from './data-collector';

export class InsightsEngine {
  private static instance: InsightsEngine;
  private dataCollector: AnalyticsDataCollector;

  constructor() {
    this.dataCollector = AnalyticsDataCollector.getInstance();
  }

  static getInstance(): InsightsEngine {
    if (!InsightsEngine.instance) {
      InsightsEngine.instance = new InsightsEngine();
    }
    return InsightsEngine.instance;
  }

  async generateDailyInsights(): Promise<Insight[]> {
    const insights: Insight[] = [];
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const timeframe = { start: yesterday, end: today };
    
    try {
      // Collect data for analysis
      const productivity = await this.dataCollector.collectProductivityData(timeframe);
      const errors = await this.dataCollector.collectErrorData(timeframe);
      const ai = await this.dataCollector.collectAIData(timeframe);
      
      // Generate productivity insights
      const productivityInsights = await this.analyzeProductivityTrends(productivity);
      insights.push(...productivityInsights);
      
      // Generate error insights
      const errorInsights = await this.analyzeErrorPatterns(errors);
      insights.push(...errorInsights);
      
      // Generate AI effectiveness insights
      const aiInsights = await this.analyzeAIEffectiveness(ai);
      insights.push(...aiInsights);
      
      // Generate focus and workflow insights
      const focusInsights = await this.analyzeFocusPatterns(productivity);
      insights.push(...focusInsights);
      
      return insights;
    } catch (error) {
      console.error('Error generating daily insights:', error);
      return [];
    }
  }

  async generateWeeklyReport(): Promise<AnalyticsReport> {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const timeframe = { start: lastWeek, end: today };
    
    try {
      const productivity = await this.dataCollector.collectProductivityData(timeframe);
      const errors = await this.dataCollector.collectErrorData(timeframe);
      const ai = await this.dataCollector.collectAIData(timeframe);
      
      const insights = await this.generateInsightsForTimeframe(timeframe);
      const recommendations = await this.generateRecommendations(productivity, errors, ai);
      
      return {
        id: `weekly-${Date.now()}`,
        title: `Weekly Analytics Report - ${lastWeek.toLocaleDateString()} to ${today.toLocaleDateString()}`,
        timeframe,
        sections: {
          productivity,
          errors,
          ai,
          insights,
          recommendations
        },
        generatedAt: new Date(),
        format: 'json'
      };
    } catch (error) {
      console.error('Error generating weekly report:', error);
      throw error;
    }
  }

  async detectAnomalies(data: TimeSeriesData[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    if (data.length < 3) return anomalies;
    
    try {
      // Calculate baseline statistics
      const values = data.map(d => d.value);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      // Z-score based anomaly detection
      const threshold = 2.5; // 2.5 standard deviations
      
      data.forEach((point, index) => {
        const zScore = Math.abs((point.value - mean) / stdDev);
        
        if (zScore > threshold) {
          const severity = this.calculateAnomalySeverity(zScore);
          
          anomalies.push({
            type: 'statistical_outlier',
            severity,
            description: `Unusual ${point.value > mean ? 'increase' : 'decrease'} detected: ${point.value.toFixed(2)} (${zScore.toFixed(2)}σ from normal)`,
            timestamp: point.timestamp,
            suggestions: this.generateAnomalySuggestions(point, mean, zScore > 0),
            affectedMetrics: ['productivity', 'performance'],
            confidence: Math.min(zScore / 3, 1) // Normalize confidence
          });
        }
      });
      
      // Trend-based anomalies
      const trendAnomalies = await this.detectTrendAnomalies(data);
      anomalies.push(...trendAnomalies);
      
      return anomalies;
    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return [];
    }
  }

  async suggestOptimizations(): Promise<Optimization[]> {
    const optimizations: Optimization[] = [];
    
    try {
      const today = new Date();
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const timeframe = { start: lastMonth, end: today };
      
      const productivity = await this.dataCollector.collectProductivityData(timeframe);
      const errors = await this.dataCollector.collectErrorData(timeframe);
      const ai = await this.dataCollector.collectAIData(timeframe);
      
      // Productivity optimizations
      if (productivity.focusScore < 70) {
        optimizations.push({
          id: 'focus-improvement',
          category: 'productivity',
          title: 'Improve Focus and Reduce Interruptions',
          description: 'Your focus score is below optimal levels. Consider implementing focus techniques.',
          impact: 'high',
          effort: 'medium',
          estimatedBenefit: 'Increase productivity by 15-25%',
          actionItems: [
            'Use time-blocking techniques',
            'Implement notification management',
            'Create dedicated coding hours',
            'Use focus apps or browser extensions'
          ],
          relatedMetrics: ['focusScore', 'activeTime']
        });
      }
      
      // Error reduction optimizations
      if (errors.errorTypes.length > 0) {
        const topErrorType = errors.errorTypes.sort((a, b) => b.count - a.count)[0];
        
        optimizations.push({
          id: 'error-reduction',
          category: 'quality',
          title: `Reduce ${topErrorType.type} Errors`,
          description: `${topErrorType.type} errors are the most common in your codebase.`,
          impact: 'medium',
          effort: 'low',
          estimatedBenefit: 'Reduce debugging time by 20%',
          actionItems: [
            'Add specific linting rules',
            'Use TypeScript strict mode',
            'Implement better error handling',
            'Add unit tests for common patterns'
          ],
          relatedMetrics: ['errorCount', 'resolutionTime']
        });
      }
      
      // AI utilization optimizations
      if (ai.escalationStats.total < 5) {
        optimizations.push({
          id: 'ai-utilization',
          category: 'efficiency',
          title: 'Increase AI Assistance Usage',
          description: 'You might benefit from using AI assistance more frequently.',
          impact: 'medium',
          effort: 'low',
          estimatedBenefit: 'Faster problem resolution',
          actionItems: [
            'Set up automatic escalation triggers',
            'Use AI for code reviews',
            'Leverage AI for documentation',
            'Ask AI for optimization suggestions'
          ],
          relatedMetrics: ['aiInteractions', 'escalationStats']
        });
      }
      
      // Code quality optimizations
      const avgCommitSize = productivity.commits.averageSize;
      if (avgCommitSize > 500) {
        optimizations.push({
          id: 'commit-size',
          category: 'quality',
          title: 'Reduce Commit Size',
          description: 'Large commits can be harder to review and debug.',
          impact: 'medium',
          effort: 'low',
          estimatedBenefit: 'Better code review quality',
          actionItems: [
            'Break down features into smaller commits',
            'Commit more frequently',
            'Use feature branches',
            'Implement atomic commits'
          ],
          relatedMetrics: ['commitSize', 'codeQuality']
        });
      }
      
      return optimizations;
    } catch (error) {
      console.error('Error generating optimizations:', error);
      return [];
    }
  }

  async benchmarkPerformance(): Promise<BenchmarkResult> {
    try {
      const today = new Date();
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const timeframe = { start: lastMonth, end: today };
      const productivity = await this.dataCollector.collectProductivityData(timeframe);
      
      // Industry benchmarks (simplified)
      const industryBenchmarks = {
        linesPerDay: 200,
        commitsPerDay: 3,
        focusScore: 75,
        activeHours: 6
      };
      
      const userMetrics = {
        linesPerDay: productivity.linesOfCode.added / 30, // Assuming 30 days
        commitsPerDay: productivity.commits.count / 30,
        focusScore: productivity.focusScore,
        activeHours: productivity.activeTime.coding / 60 / 30 // Convert to hours per day
      };
      
      // Calculate percentile (simplified)
      const performanceScore = (
        Math.min(userMetrics.linesPerDay / industryBenchmarks.linesPerDay, 2) +
        Math.min(userMetrics.commitsPerDay / industryBenchmarks.commitsPerDay, 2) +
        Math.min(userMetrics.focusScore / industryBenchmarks.focusScore, 1.5) +
        Math.min(userMetrics.activeHours / industryBenchmarks.activeHours, 1.5)
      ) / 7 * 100;
      
      return {
        metric: 'Overall Productivity',
        userValue: performanceScore,
        industryAverage: 50,
        percentile: Math.min(performanceScore, 95),
        comparison: performanceScore > 50 ? 'above' : performanceScore < 45 ? 'below' : 'average',
        trend: Math.random() > 0.5 ? 'improving' : 'stable' // Simplified
      };
    } catch (error) {
      console.error('Error benchmarking performance:', error);
      throw error;
    }
  }

  async predictProductivityTrends(): Promise<ProductivityForecast> {
    try {
      const today = new Date();
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const historicalData = await this.dataCollector.collectProductivityData({
        start: lastMonth,
        end: today
      });
      
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      // Simple linear regression for prediction
      const trends = this.calculateTrends(historicalData.timeSeries);
      
      return {
        timeframe: { start: today, end: nextWeek },
        predictedProductivity: {
          linesOfCode: Math.max(0, historicalData.linesOfCode.added * (1 + trends.productivity)),
          commits: Math.max(0, Math.round(historicalData.commits.count * (1 + trends.commits))),
          activeTime: Math.max(0, historicalData.activeTime.coding * (1 + trends.activity))
        },
        confidence: 0.7, // 70% confidence
        factors: {
          historicalTrend: trends.productivity,
          seasonality: this.calculateSeasonality(),
          externalFactors: 0.1 // Simplified
        }
      };
    } catch (error) {
      console.error('Error predicting productivity trends:', error);
      throw error;
    }
  }

  async identifyRiskPatterns(): Promise<RiskAssessment> {
    try {
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      
      const timeframe = { start: lastWeek, end: today };
      
      const productivity = await this.dataCollector.collectProductivityData(timeframe);
      const errors = await this.dataCollector.collectErrorData(timeframe);
      
      const risks = [];
      
      // Burnout risk
      if (productivity.focusScore < 60) {
        risks.push({
          type: 'burnout',
          probability: 0.7,
          impact: 0.8,
          description: 'Low focus scores and irregular patterns indicate potential burnout',
          mitigation: [
            'Take regular breaks',
            'Reduce workload temporarily',
            'Improve work-life balance',
            'Consider vacation time'
          ]
        });
      }
      
      // Quality decline risk
      if (errors.errorFrequency.length > 0) {
        const recentErrors = errors.errorFrequency.slice(-3).reduce((sum, e) => sum + e.value, 0);
        if (recentErrors > 10) {
          risks.push({
            type: 'quality_decline',
            probability: 0.6,
            impact: 0.7,
            description: 'Increasing error rates suggest declining code quality',
            mitigation: [
              'Implement code reviews',
              'Add automated testing',
              'Use static analysis tools',
              'Slow down development pace'
            ]
          });
        }
      }
      
      // Productivity decline risk
      const avgProductivity = productivity.timeSeries.reduce((sum, p) => sum + p.value, 0) / productivity.timeSeries.length;
      if (avgProductivity < 150) {
        risks.push({
          type: 'productivity_decline',
          probability: 0.5,
          impact: 0.6,
          description: 'Productivity metrics are trending downward',
          mitigation: [
            'Identify and remove blockers',
            'Optimize development environment',
            'Consider pair programming',
            'Review current tools and processes'
          ]
        });
      }
      
      const overallRisk = risks.length === 0 ? 'low' : 
                         risks.length === 1 ? 'medium' : 
                         risks.length === 2 ? 'high' : 'critical';
      
      return {
        overallRisk: overallRisk as 'low' | 'medium' | 'high' | 'critical',
        risks,
        timeline: timeframe,
        monitoringRecommendations: [
          'Monitor focus scores daily',
          'Track error rates weekly',
          'Review productivity trends monthly',
          'Conduct regular retrospectives'
        ]
      };
    } catch (error) {
      console.error('Error identifying risk patterns:', error);
      throw error;
    }
  }

  async recommendWorkflowImprovements(): Promise<WorkflowRecommendation[]> {
    const recommendations: WorkflowRecommendation[] = [
      {
        id: 'automated-testing',
        title: 'Implement Automated Testing Workflow',
        description: 'Set up continuous testing to catch issues early',
        category: 'automation',
        potentialSavings: {
          time: 120, // 2 hours per week
          errors: 30, // 30% reduction
          efficiency: 25 // 25% improvement
        },
        implementationSteps: [
          'Set up test framework',
          'Write unit tests for critical functions',
          'Configure CI/CD pipeline',
          'Add automated test triggers'
        ],
        prerequisites: ['Test framework knowledge', 'CI/CD setup'],
        difficulty: 'medium'
      },
      {
        id: 'code-review-automation',
        title: 'Automated Code Review Workflow',
        description: 'Use AI-powered code review to improve quality',
        category: 'optimization',
        potentialSavings: {
          time: 60, // 1 hour per week
          errors: 40, // 40% reduction
          efficiency: 20 // 20% improvement
        },
        implementationSteps: [
          'Set up automated code analysis',
          'Configure review rules',
          'Integrate with version control',
          'Train team on new process'
        ],
        prerequisites: ['Version control system', 'Code analysis tools'],
        difficulty: 'easy'
      },
      {
        id: 'deployment-automation',
        title: 'Automated Deployment Pipeline',
        description: 'Streamline deployment process to reduce manual errors',
        category: 'automation',
        potentialSavings: {
          time: 180, // 3 hours per week
          errors: 50, // 50% reduction
          efficiency: 35 // 35% improvement
        },
        implementationSteps: [
          'Design deployment strategy',
          'Set up staging environment',
          'Configure automated deployments',
          'Add rollback mechanisms'
        ],
        prerequisites: ['Infrastructure access', 'DevOps knowledge'],
        difficulty: 'hard'
      }
    ];
    
    return recommendations;
  }

  // Private helper methods
  private async analyzeProductivityTrends(productivity: any): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    if (productivity.focusScore > 80) {
      insights.push({
        id: `focus-${Date.now()}`,
        type: 'productivity',
        severity: 'low',
        title: 'Excellent Focus Today',
        description: `Your focus score of ${productivity.focusScore} is excellent! You maintained good concentration throughout the day.`,
        recommendations: ['Keep up the good work', 'Share your focus techniques with the team'],
        timestamp: new Date(),
        read: false
      });
    } else if (productivity.focusScore < 50) {
      insights.push({
        id: `focus-low-${Date.now()}`,
        type: 'productivity',
        severity: 'medium',
        title: 'Low Focus Score Detected',
        description: `Your focus score of ${productivity.focusScore} is below average. Consider reviewing your work environment.`,
        recommendations: [
          'Take regular breaks',
          'Minimize distractions',
          'Try time-blocking techniques',
          'Review notification settings'
        ],
        timestamp: new Date(),
        read: false
      });
    }
    
    return insights;
  }

  private async analyzeErrorPatterns(errors: any): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    if (errors.errorTypes.length > 0) {
      const topError = errors.errorTypes[0];
      
      insights.push({
        id: `error-pattern-${Date.now()}`,
        type: 'error',
        severity: topError.count > 5 ? 'high' : 'medium',
        title: `${topError.type} Errors Detected`,
        description: `You've encountered ${topError.count} ${topError.type} errors recently.`,
        recommendations: [
          'Review common patterns causing these errors',
          'Add specific linting rules',
          'Consider using TypeScript for better type safety',
          'Implement error boundaries'
        ],
        data: { errorType: topError.type, count: topError.count },
        timestamp: new Date(),
        read: false
      });
    }
    
    return insights;
  }

  private async analyzeAIEffectiveness(ai: any): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    if (ai.escalationStats.accuracy > 80) {
      insights.push({
        id: `ai-effective-${Date.now()}`,
        type: 'ai',
        severity: 'low',
        title: 'AI Assistance Highly Effective',
        description: `AI suggestions have ${ai.escalationStats.accuracy}% accuracy rate.`,
        recommendations: ['Continue leveraging AI for complex problems'],
        timestamp: new Date(),
        read: false
      });
    }
    
    return insights;
  }

  private async analyzeFocusPatterns(productivity: any): Promise<Insight[]> {
    const insights: Insight[] = [];
    
    const totalActiveTime = productivity.activeTime.coding + productivity.activeTime.debugging + productivity.activeTime.planning;
    
    if (totalActiveTime < 240) { // Less than 4 hours
      insights.push({
        id: `low-activity-${Date.now()}`,
        type: 'productivity',
        severity: 'medium',
        title: 'Low Activity Time',
        description: `Only ${Math.round(totalActiveTime / 60)} hours of active time today.`,
        recommendations: [
          'Review calendar for excessive meetings',
          'Identify and eliminate time wasters',
          'Use time tracking tools',
          'Block dedicated coding time'
        ],
        timestamp: new Date(),
        read: false
      });
    }
    
    return insights;
  }

  private async generateInsightsForTimeframe(timeframe: DateRange): Promise<Insight[]> {
    // Aggregate insights from daily analysis
    const insights: Insight[] = [];
    
    const productivity = await this.dataCollector.collectProductivityData(timeframe);
    const errors = await this.dataCollector.collectErrorData(timeframe);
    
    // Weekly summary insights
    insights.push({
      id: `weekly-summary-${Date.now()}`,
      type: 'productivity',
      severity: 'low',
      title: 'Weekly Productivity Summary',
      description: `This week you wrote ${productivity.linesOfCode.added} lines of code across ${productivity.commits.count} commits.`,
      recommendations: ['Review weekly goals', 'Plan for next week'],
      timestamp: new Date(),
      read: false
    });
    
    return insights;
  }

  private async generateRecommendations(productivity: any, errors: any, ai: any): Promise<Optimization[]> {
    return this.suggestOptimizations();
  }

  private calculateAnomalySeverity(zScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (zScore > 4) return 'critical';
    if (zScore > 3) return 'high';
    if (zScore > 2.5) return 'medium';
    return 'low';
  }

  private generateAnomalySuggestions(point: TimeSeriesData, mean: number, isIncrease: boolean): string[] {
    if (isIncrease) {
      return [
        'Investigate what caused this spike',
        'Check if this is sustainable',
        'Document successful practices',
        'Consider if external factors contributed'
      ];
    } else {
      return [
        'Identify potential blockers',
        'Review recent changes in process',
        'Check for external distractions',
        'Consider taking a break if needed'
      ];
    }
  }

  private async detectTrendAnomalies(data: TimeSeriesData[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    if (data.length < 5) return anomalies;
    
    // Calculate rolling average
    const windowSize = 3;
    const trends = [];
    
    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i);
      const avg = window.reduce((sum, p) => sum + p.value, 0) / windowSize;
      const current = data[i].value;
      const change = ((current - avg) / avg) * 100;
      
      if (Math.abs(change) > 50) { // 50% change threshold
        anomalies.push({
          type: 'trend_anomaly',
          severity: Math.abs(change) > 100 ? 'high' : 'medium',
          description: `Significant ${change > 0 ? 'increase' : 'decrease'} of ${Math.abs(change).toFixed(1)}% detected`,
          timestamp: data[i].timestamp,
          suggestions: [
            'Review recent changes',
            'Check for external factors',
            'Validate data accuracy'
          ],
          affectedMetrics: ['trend'],
          confidence: Math.min(Math.abs(change) / 100, 1)
        });
      }
    }
    
    return anomalies;
  }

  private calculateTrends(timeSeries: TimeSeriesData[]): any {
    if (timeSeries.length < 2) {
      return { productivity: 0, commits: 0, activity: 0 };
    }
    
    // Simple linear regression
    const n = timeSeries.length;
    const sumX = timeSeries.reduce((sum, _, i) => sum + i, 0);
    const sumY = timeSeries.reduce((sum, point) => sum + point.value, 0);
    const sumXY = timeSeries.reduce((sum, point, i) => sum + i * point.value, 0);
    const sumXX = timeSeries.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const normalizedSlope = slope / (sumY / n); // Normalize by average
    
    return {
      productivity: normalizedSlope,
      commits: normalizedSlope * 0.8, // Slightly different for commits
      activity: normalizedSlope * 1.2 // Slightly different for activity
    };
  }

  private calculateSeasonality(): number {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    
    // Simple seasonality based on time patterns
    let seasonality = 0;
    
    // Weekend effect
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      seasonality -= 0.2;
    }
    
    // Time of day effect
    if (hour >= 9 && hour <= 17) {
      seasonality += 0.1;
    } else if (hour >= 18 && hour <= 22) {
      seasonality += 0.05;
    } else {
      seasonality -= 0.1;
    }
    
    return seasonality;
  }
}
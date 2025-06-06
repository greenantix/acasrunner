export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface ProductivityMetrics {
  timeframe: DateRange;
  linesOfCode: {
    added: number;
    deleted: number;
    modified: number;
  };
  commits: {
    count: number;
    averageSize: number;
    frequency: number;
  };
  activeTime: {
    coding: number;
    debugging: number;
    planning: number;
  };
  focusScore: number; // 0-100 based on interruption patterns
  timeSeries: TimeSeriesData[];
}

export interface ErrorAnalytics {
  errorFrequency: TimeSeriesData[];
  errorTypes: { type: string; count: number; trend: number }[];
  resolutionTimes: {
    average: number;
    median: number;
    p95: number;
  };
  recurringIssues: {
    pattern: string;
    occurrences: number;
    lastSeen: Date;
    aiSuggestion?: string;
  }[];
}

export interface AIEffectivenessMetrics {
  escalationStats: {
    total: number;
    resolved: number;
    accuracy: number;
    averageResponseTime: number;
  };
  providerPerformance: {
    provider: string;
    successRate: number;
    averageLatency: number;
    tokenUsage: number;
    cost: number;
  }[];
  suggestionQuality: {
    helpfulnessScore: number; // User feedback based
    implementationRate: number;
    falsePositiveRate: number;
  };
}

export interface PluginMetrics {
  usage: {
    pluginId: string;
    pluginName: string;
    invocations: number;
    averageExecutionTime: number;
    successRate: number;
    errorCount: number;
  }[];
  performance: {
    totalLoadTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  adoption: {
    activePlugins: number;
    disabledPlugins: number;
    installRate: number;
    uninstallRate: number;
  };
}

export interface WorkflowMetrics {
  execution: {
    workflowId: string;
    workflowName: string;
    executions: number;
    successRate: number;
    averageExecutionTime: number;
    timesSaved: number; // in minutes
  }[];
  efficiency: {
    automationRate: number;
    manualInterventions: number;
    errorRate: number;
  };
  adoption: {
    activeWorkflows: number;
    createdWorkflows: number;
    deletedWorkflows: number;
  };
}

export interface AnalyticsData {
  productivity: ProductivityMetrics;
  errors: ErrorAnalytics;
  ai: AIEffectivenessMetrics;
  plugins: PluginMetrics;
  workflows: WorkflowMetrics;
  generatedAt: Date;
}

export interface Insight {
  id: string;
  type: 'productivity' | 'error' | 'ai' | 'plugin' | 'workflow' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendations: string[];
  data?: any;
  timestamp: Date;
  read?: boolean;
  dismissed?: boolean;
}

export interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  suggestions: string[];
  affectedMetrics: string[];
  confidence: number; // 0-1
}

export interface ProductivityForecast {
  timeframe: DateRange;
  predictedProductivity: {
    linesOfCode: number;
    commits: number;
    activeTime: number;
  };
  confidence: number;
  factors: {
    historicalTrend: number;
    seasonality: number;
    externalFactors: number;
  };
}

export interface BurnoutRisk {
  score: number; // 0-100, higher = more risk
  factors: {
    overwork: number;
    errorIncrease: number;
    productivityDecline: number;
    irregularPatterns: number;
  };
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface BenchmarkResult {
  metric: string;
  userValue: number;
  industryAverage: number;
  percentile: number;
  comparison: 'above' | 'below' | 'average';
  trend: 'improving' | 'declining' | 'stable';
}

export interface Optimization {
  id: string;
  category: 'performance' | 'productivity' | 'quality' | 'efficiency';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  estimatedBenefit: string;
  actionItems: string[];
  relatedMetrics: string[];
}

export interface UserAction {
  userId: string;
  action: string;
  context: any;
  timestamp: Date;
}

export interface CodeChange {
  userId: string;
  file: string;
  linesAdded: number;
  linesDeleted: number;
  type: 'add' | 'modify' | 'delete';
  timestamp: Date;
}

export interface ErrorEvent {
  userId: string;
  error: string;
  file: string;
  line?: number;
  stack?: string;
  resolved?: boolean;
  resolutionTime?: number;
  timestamp: Date;
}

export interface AIInteraction {
  userId: string;
  provider: string;
  prompt: string;
  response: string;
  tokens: number;
  latency: number;
  successful: boolean;
  helpful?: boolean; // User feedback
  timestamp: Date;
}

export interface AnalyticsReport {
  id: string;
  title: string;
  timeframe: DateRange;
  sections: {
    productivity: ProductivityMetrics;
    errors: ErrorAnalytics;
    ai: AIEffectivenessMetrics;
    insights: Insight[];
    recommendations: Optimization[];
  };
  generatedAt: Date;
  format: 'json' | 'pdf' | 'csv';
}

export interface TeamReport {
  teamId: string;
  teamName: string;
  timeframe: DateRange;
  teamMetrics: {
    totalProductivity: ProductivityMetrics;
    averageProductivity: ProductivityMetrics;
    topPerformers: string[];
    improvementAreas: string[];
  };
  memberReports: {
    userId: string;
    userName: string;
    metrics: AnalyticsData;
    insights: Insight[];
  }[];
  insights: Insight[];
  recommendations: Optimization[];
  generatedAt: Date;
}

export interface IndustryBenchmark {
  metric: string;
  industry: string;
  teamSize: string;
  benchmarks: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  teamPosition: number;
  recommendedTargets: {
    short: number;
    medium: number;
    long: number;
  };
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  risks: {
    type: string;
    probability: number;
    impact: number;
    description: string;
    mitigation: string[];
  }[];
  timeline: DateRange;
  monitoringRecommendations: string[];
}

export interface WorkflowRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'automation' | 'optimization' | 'monitoring' | 'integration';
  potentialSavings: {
    time: number; // minutes per week
    errors: number; // reduction percentage
    efficiency: number; // improvement percentage
  };
  implementationSteps: string[];
  prerequisites: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

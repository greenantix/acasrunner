"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, TrendingUpIcon, AlertTriangleIcon, BrainIcon, Activity, Code, Bug, Zap } from 'lucide-react';
import {
  AnalyticsData,
  DateRange,
  Insight,
  Optimization,
  BenchmarkResult
} from '@/types/analytics';
import { ProductivityChart, ErrorTrendsChart, AIPerformanceChart, WorkflowEfficiencyChart } from '@/components/analytics/productivity-chart';
import { InsightsPanel } from '@/components/analytics/insights-panel';

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<string>('week');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeframe]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
      
      // Mock data for now
      const mockAnalytics: AnalyticsData = {
        productivity: {
          timeframe: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
          linesOfCode: { added: 1247, deleted: 342, modified: 89 },
          commits: { count: 23, averageSize: 156, frequency: 3.3 },
          activeTime: { coding: 1680, debugging: 320, planning: 180 },
          focusScore: 78,
          timeSeries: Array.from({ length: 7 }, (_, i) => ({
            timestamp: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
            value: Math.floor(Math.random() * 300) + 200
          }))
        },
        errors: {
          errorFrequency: Array.from({ length: 7 }, (_, i) => ({
            timestamp: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
            value: Math.floor(Math.random() * 10) + 2
          })),
          errorTypes: [
            { type: 'TypeError', count: 12, trend: -0.15 },
            { type: 'ReferenceError', count: 8, trend: 0.05 },
            { type: 'SyntaxError', count: 5, trend: -0.25 }
          ],
          resolutionTimes: { average: 45, median: 30, p95: 120 },
          recurringIssues: [
            { pattern: 'Cannot read property of undefined', occurrences: 3, lastSeen: new Date(), aiSuggestion: 'Add null checks' }
          ]
        },
        ai: {
          escalationStats: { total: 15, resolved: 12, accuracy: 80, averageResponseTime: 25 },
          providerPerformance: [
            { provider: 'claude', successRate: 85, averageLatency: 2.3, tokenUsage: 15420, cost: 2.15 },
            { provider: 'openai', successRate: 78, averageLatency: 3.1, tokenUsage: 8950, cost: 1.89 }
          ],
          suggestionQuality: { helpfulnessScore: 82, implementationRate: 68, falsePositiveRate: 12 }
        },
        plugins: {
          usage: [
            { pluginId: 'activity-logger', pluginName: 'Activity Logger', invocations: 45, averageExecutionTime: 120, successRate: 98, errorCount: 1 }
          ],
          performance: { totalLoadTime: 850, memoryUsage: 45, cpuUsage: 12 },
          adoption: { activePlugins: 3, disabledPlugins: 1, installRate: 1.2, uninstallRate: 0.3 }
        },
        workflows: {
          execution: [
            { workflowId: 'test-automation', workflowName: 'Test Automation', executions: 12, successRate: 95, averageExecutionTime: 180, timesSaved: 240 }
          ],
          efficiency: { automationRate: 65, manualInterventions: 3, errorRate: 5 },
          adoption: { activeWorkflows: 2, createdWorkflows: 5, deletedWorkflows: 1 }
        },
        generatedAt: new Date()
      };

      const mockInsights: Insight[] = [
        {
          id: '1',
          type: 'productivity',
          severity: 'low',
          title: 'Excellent Focus This Week',
          description: 'Your focus score of 78 is above average, indicating good concentration levels.',
          recommendations: ['Continue current practices', 'Share focus techniques with team'],
          timestamp: new Date(),
          read: false
        },
        {
          id: '2',
          type: 'error',
          severity: 'medium',
          title: 'TypeError Pattern Detected',
          description: 'Multiple TypeError occurrences suggest need for better null checking.',
          recommendations: ['Implement strict null checks', 'Use TypeScript strict mode', 'Add defensive programming'],
          timestamp: new Date(),
          read: false
        }
      ];

      const mockOptimizations: Optimization[] = [
        {
          id: '1',
          category: 'productivity',
          title: 'Implement Time Blocking',
          description: 'Structured time blocks can improve your already good focus score.',
          impact: 'medium',
          effort: 'low',
          estimatedBenefit: '10-15% productivity increase',
          actionItems: ['Schedule focused coding blocks', 'Use calendar blocking', 'Minimize context switching'],
          relatedMetrics: ['focusScore', 'activeTime']
        }
      ];

      const mockBenchmarks: BenchmarkResult = {
        metric: 'Overall Productivity',
        userValue: 78,
        industryAverage: 65,
        percentile: 72,
        comparison: 'above',
        trend: 'improving'
      };

      setAnalytics(mockAnalytics);
      setInsights(mockInsights);
      setOptimizations(mockOptimizations);
      setBenchmarks(mockBenchmarks);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeframeLabel = (value: string) => {
    const labels = {
      'day': 'Last 24 Hours',
      'week': 'Last 7 Days',
      'month': 'Last 30 Days',
      'quarter': 'Last 3 Months'
    };
    return labels[value as keyof typeof labels] || value;
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getImpactColor = (impact: string) => {
    const colors = {
      'low': 'text-green-600',
      'medium': 'text-yellow-600',
      'high': 'text-red-600'
    };
    return colors[impact as keyof typeof colors] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <div className="animate-pulse bg-gray-200 h-10 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-32 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Failed to load analytics data</p>
          <Button onClick={loadAnalyticsData} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Insights and metrics for {getTimeframeLabel(timeframe)}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-48">
              <CalendarIcon className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 Hours</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lines of Code</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.productivity.linesOfCode.added.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +{analytics.productivity.linesOfCode.added - analytics.productivity.linesOfCode.deleted} net lines
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Focus Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.productivity.focusScore}/100</div>
            <p className="text-xs text-muted-foreground">
              {analytics.productivity.focusScore > 70 ? 'Above average' : 'Below average'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.errors.errorTypes.reduce((sum, e) => sum + e.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg resolution: {analytics.errors.resolutionTimes.average}min
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Effectiveness</CardTitle>
            <BrainIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.ai.escalationStats.accuracy}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.ai.escalationStats.resolved}/{analytics.ai.escalationStats.total} resolved
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProductivityChart data={analytics.productivity} />
            <ErrorTrendsChart data={analytics.errors} />
            <AIPerformanceChart data={analytics.ai} />
            <WorkflowEfficiencyChart data={analytics.workflows} />
          </div>

          {/* Insights Panel */}
          <InsightsPanel 
            insights={insights}
            optimizations={optimizations}
            onInsightAction={(insightId, action) => {
              console.log(`${action} insight:`, insightId);
              // TODO: Implement actual insight action handling
            }}
          />
        </TabsContent>

        <TabsContent value="productivity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ProductivityChart data={analytics.productivity} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Activity Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Coding</span>
                    <span>{Math.round(analytics.productivity.activeTime.coding / 60)}h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: '70%' }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Debugging</span>
                    <span>{Math.round(analytics.productivity.activeTime.debugging / 60)}h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-600 h-2 rounded-full" 
                      style={{ width: '20%' }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Planning</span>
                    <span>{Math.round(analytics.productivity.activeTime.planning / 60)}h</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: '10%' }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Error Types</CardTitle>
                <CardDescription>Breakdown of errors by type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.errors.errorTypes.map((error, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{error.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{error.count}</span>
                        <Badge variant={error.trend < 0 ? 'default' : 'destructive'}>
                          {error.trend > 0 ? '+' : ''}{(error.trend * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resolution Times</CardTitle>
                <CardDescription>How quickly you resolve errors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Average</span>
                    <span className="font-medium">{analytics.errors.resolutionTimes.average} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Median</span>
                    <span className="font-medium">{analytics.errors.resolutionTimes.median} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">95th Percentile</span>
                    <span className="font-medium">{analytics.errors.resolutionTimes.p95} min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="space-y-4">
            {insights.map((insight) => (
              <Card key={insight.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{insight.title}</CardTitle>
                    <Badge className={getSeverityColor(insight.severity)}>
                      {insight.severity}
                    </Badge>
                  </div>
                  <CardDescription>
                    {insight.type} • {insight.timestamp.toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-4">{insight.description}</p>
                  <div>
                    <h4 className="font-medium mb-2">Recommendations:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {insight.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-600">{rec}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-6">
          {benchmarks && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Benchmark</CardTitle>
                <CardDescription>How you compare to industry standards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{benchmarks.metric}</span>
                      <Badge variant={benchmarks.comparison === 'above' ? 'default' : 'secondary'}>
                        {benchmarks.percentile}th percentile
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full relative" 
                        style={{ width: `${benchmarks.percentile}%` }}
                      >
                        <span className="absolute right-0 top-0 h-full w-1 bg-blue-800"></span>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0th</span>
                      <span>50th (Industry Avg)</span>
                      <span>100th</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Your Score:</span>
                      <span className="font-medium ml-2">{benchmarks.userValue}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Industry Average:</span>
                      <span className="font-medium ml-2">{benchmarks.industryAverage}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

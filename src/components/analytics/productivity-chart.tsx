"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, AreaChart, Area } from 'recharts';
import { ProductivityMetrics, TimeSeriesData } from '@/types/analytics';

interface ProductivityChartProps {
  data: ProductivityMetrics;
}

export function ProductivityChart({ data }: ProductivityChartProps) {
  // Transform data for the chart
  const chartData = data.timeSeries.map((point, index) => ({
    date: point.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    productivity: point.value,
    commits: Math.floor(Math.random() * 8) + 1, // Mock commit data
    focusScore: Math.floor(Math.random() * 20) + 60, // Mock focus data
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Productivity Trends</CardTitle>
        <CardDescription>Code output and activity patterns over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              fontSize={12}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              fontSize={12}
            />
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Legend />
            <Bar 
              dataKey="productivity" 
              fill="#3b82f6" 
              name="Lines of Code"
              radius={[2, 2, 0, 0]}
            />
            <Line 
              type="monotone" 
              dataKey="commits" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Commits"
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="focusScore" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="Focus Score"
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface ErrorTrendsChartProps {
  data: {
    errorFrequency: TimeSeriesData[];
    errorTypes: { type: string; count: number; trend: number }[];
  };
}

export function ErrorTrendsChart({ data }: ErrorTrendsChartProps) {
  const chartData = data.errorFrequency.map(point => ({
    date: point.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    errors: point.value,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Error Trends</CardTitle>
        <CardDescription>Error frequency over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              fontSize={12}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              fontSize={12}
            />
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="errors" 
              stroke="#ef4444" 
              fill="#fecaca" 
              strokeWidth={2}
              name="Errors"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface AIPerformanceChartProps {
  data: {
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
  };
}

export function AIPerformanceChart({ data }: AIPerformanceChartProps) {
  const chartData = data.providerPerformance.map(provider => ({
    provider: provider.provider.charAt(0).toUpperCase() + provider.provider.slice(1),
    successRate: provider.successRate,
    latency: provider.averageLatency,
    cost: provider.cost,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Performance</CardTitle>
        <CardDescription>AI provider effectiveness and performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <XAxis 
              dataKey="provider" 
              axisLine={false}
              tickLine={false}
              fontSize={12}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              fontSize={12}
            />
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Legend />
            <Bar 
              dataKey="successRate" 
              fill="#8b5cf6" 
              name="Success Rate (%)"
              radius={[2, 2, 0, 0]}
            />
            <Line 
              type="monotone" 
              dataKey="latency" 
              stroke="#06b6d4" 
              strokeWidth={2}
              name="Latency (s)"
              dot={{ fill: '#06b6d4', strokeWidth: 2, r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface WorkflowEfficiencyChartProps {
  data: {
    execution: {
      workflowId: string;
      workflowName: string;
      executions: number;
      successRate: number;
      averageExecutionTime: number;
      timesSaved: number;
    }[];
    efficiency: {
      automationRate: number;
      manualInterventions: number;
      errorRate: number;
    };
  };
}

export function WorkflowEfficiencyChart({ data }: WorkflowEfficiencyChartProps) {
  const chartData = data.execution.map(workflow => ({
    name: workflow.workflowName.length > 15 ? 
          workflow.workflowName.substring(0, 15) + '...' : 
          workflow.workflowName,
    executions: workflow.executions,
    successRate: workflow.successRate,
    timesSaved: workflow.timesSaved,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Efficiency</CardTitle>
        <CardDescription>Automation performance and time savings</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              fontSize={12}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              fontSize={12}
            />
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Legend />
            <Bar 
              dataKey="executions" 
              fill="#22c55e" 
              name="Executions"
              radius={[2, 2, 0, 0]}
            />
            <Line 
              type="monotone" 
              dataKey="successRate" 
              stroke="#f97316" 
              strokeWidth={2}
              name="Success Rate (%)"
              dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
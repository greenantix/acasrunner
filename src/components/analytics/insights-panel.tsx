"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUpIcon, 
  AlertTriangleIcon, 
  BrainIcon, 
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  EyeOffIcon
} from 'lucide-react';
import { Insight, Optimization, Anomaly } from '@/types/analytics';

interface InsightsPanelProps {
  insights: Insight[];
  optimizations?: Optimization[];
  anomalies?: Anomaly[];
  onInsightAction?: (insightId: string, action: 'read' | 'dismiss') => void;
}

export function InsightsPanel({ 
  insights, 
  optimizations = [], 
  anomalies = [],
  onInsightAction 
}: InsightsPanelProps) {
  const [filter, setFilter] = useState<'all' | 'unread' | 'high'>('all');

  const filteredInsights = insights.filter(insight => {
    if (filter === 'unread') return !insight.read;
    if (filter === 'high') return insight.severity === 'high' || insight.severity === 'critical';
    return true;
  });

  const getSeverityColor = (severity: string) => {
    const colors = {
      'low': 'bg-green-100 text-green-800 border-green-200',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'high': 'bg-orange-100 text-orange-800 border-orange-200',
      'critical': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      'productivity': TrendingUpIcon,
      'error': AlertTriangleIcon,
      'ai': BrainIcon,
      'plugin': CheckCircleIcon,
      'workflow': CheckCircleIcon,
      'anomaly': AlertTriangleIcon
    };
    const Icon = icons[type as keyof typeof icons] || TrendingUpIcon;
    return <Icon className="w-4 h-4" />;
  };

  const getImpactColor = (impact: string) => {
    const colors = {
      'low': 'text-green-600',
      'medium': 'text-yellow-600',
      'high': 'text-red-600'
    };
    return colors[impact as keyof typeof colors] || 'text-gray-600';
  };

  const handleInsightAction = (insightId: string, action: 'read' | 'dismiss') => {
    if (onInsightAction) {
      onInsightAction(insightId, action);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BrainIcon className="w-5 h-5" />
              AI Insights & Recommendations
            </CardTitle>
            <CardDescription>
              Automated analysis and optimization suggestions
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button 
              variant={filter === 'unread' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
            <Button 
              variant={filter === 'high' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('high')}
            >
              High Priority
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="insights">
              Insights ({filteredInsights.length})
            </TabsTrigger>
            <TabsTrigger value="optimizations">
              Optimizations ({optimizations.length})
            </TabsTrigger>
            <TabsTrigger value="anomalies">
              Anomalies ({anomalies.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="insights" className="mt-4 space-y-4">
            {filteredInsights.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BrainIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No insights match your current filter</p>
              </div>
            ) : (
              filteredInsights.map((insight) => (
                <div 
                  key={insight.id} 
                  className={`border rounded-lg p-4 transition-all ${
                    insight.read ? 'opacity-75' : 'bg-blue-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(insight.type)}
                        <Badge className={getSeverityColor(insight.severity)}>
                          {insight.severity}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        {insight.timestamp.toLocaleDateString()} • {insight.type}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInsightAction(insight.id, 'read')}
                        className="h-8 px-2"
                      >
                        {insight.read ? (
                          <EyeOffIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInsightAction(insight.id, 'dismiss')}
                        className="h-8 px-2"
                      >
                        <XCircleIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <h4 className="font-semibold mb-2">{insight.title}</h4>
                  <p className="text-gray-600 mb-3">{insight.description}</p>
                  
                  {insight.recommendations.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm mb-2">Recommendations:</h5>
                      <ul className="list-disc list-inside space-y-1">
                        {insight.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-gray-600">
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="optimizations" className="mt-4 space-y-4">
            {optimizations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <TrendingUpIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No optimization opportunities identified</p>
              </div>
            ) : (
              optimizations.map((optimization) => (
                <div key={optimization.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {optimization.category}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={getImpactColor(optimization.impact)}
                      >
                        {optimization.impact} impact
                      </Badge>
                      <Badge variant="outline">
                        {optimization.effort} effort
                      </Badge>
                    </div>
                  </div>
                  
                  <h4 className="font-semibold mb-2">{optimization.title}</h4>
                  <p className="text-gray-600 mb-3">{optimization.description}</p>
                  
                  <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
                    <p className="text-sm font-medium text-green-800">
                      Expected Benefit: {optimization.estimatedBenefit}
                    </p>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-sm mb-2">Action Items:</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {optimization.actionItems.map((item, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="anomalies" className="mt-4 space-y-4">
            {anomalies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircleIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No anomalies detected</p>
                <p className="text-sm">Everything looks normal!</p>
              </div>
            ) : (
              anomalies.map((anomaly, index) => (
                <div key={index} className="border rounded-lg p-4 border-orange-200 bg-orange-50/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangleIcon className="w-4 h-4 text-orange-600" />
                      <Badge className={getSeverityColor(anomaly.severity)}>
                        {anomaly.severity}
                      </Badge>
                      <Badge variant="outline">
                        {(anomaly.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    </div>
                    <span className="text-sm text-gray-500">
                      {anomaly.timestamp.toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h4 className="font-semibold mb-2 capitalize">
                    {anomaly.type.replace('_', ' ')} Detected
                  </h4>
                  <p className="text-gray-600 mb-3">{anomaly.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-sm mb-2">Affected Metrics:</h5>
                      <div className="flex flex-wrap gap-1">
                        {anomaly.affectedMetrics.map((metric, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {metric}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-sm mb-2">Suggestions:</h5>
                      <ul className="list-disc list-inside space-y-1">
                        {anomaly.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-sm text-gray-600">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Package,
  FileX,
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Activity,
  Eye,
  Zap
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface StopCatchEvent {
  id: string;
  taskId: string;
  taskName: string;
  timestamp: Date;
  completed: boolean;
  verified: boolean;
  errorType?: 'api_timeout' | 'dependency_error' | 'syntax_error' | 'build_failure';
  escalationPath: 'claude_realtime' | 'pause_and_notify' | 'auto_retry';
  addToStruggleSettings: boolean;
  plugin: string;
  model: string;
  details: string;
}

interface DependencyDrift {
  id: string;
  packageName: string;
  currentVersion: string;
  expectedVersion: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  driftType: 'version_mismatch' | 'missing_dependency' | 'unauthorized_import' | 'deprecated_package';
  detectedAt: Date;
  filePath: string;
  autoFixed: boolean;
}

const mockStopCatchEvents: StopCatchEvent[] = [
  {
    id: 'sc-1',
    taskId: 'task-123',
    taskName: 'Implement user authentication',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    completed: true,
    verified: false,
    escalationPath: 'claude_realtime',
    addToStruggleSettings: false,
    plugin: 'claude-code',
    model: 'claude-3-5-sonnet',
    details: 'Task marked complete but verification failed - missing test files'
  },
  {
    id: 'sc-2',
    taskId: 'task-124',
    taskName: 'Update API endpoints',
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
    completed: false,
    verified: false,
    errorType: 'api_timeout',
    escalationPath: 'auto_retry',
    addToStruggleSettings: true,
    plugin: 'claude-code',
    model: 'gpt-4-turbo',
    details: 'OpenAI API timeout after 30 seconds'
  },
  {
    id: 'sc-3',
    taskId: 'task-125',
    taskName: 'Fix dependency imports',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    completed: true,
    verified: true,
    escalationPath: 'claude_realtime',
    addToStruggleSettings: false,
    plugin: 'claude-code',
    model: 'claude-3-5-sonnet',
    details: 'Successfully completed and verified'
  }
];

const mockDependencyDrifts: DependencyDrift[] = [
  {
    id: 'dd-1',
    packageName: 'react',
    currentVersion: '18.2.0',
    expectedVersion: '19.1.0',
    severity: 'medium',
    driftType: 'version_mismatch',
    detectedAt: new Date(Date.now() - 15 * 60 * 1000),
    filePath: 'src/components/UserCard.tsx',
    autoFixed: false
  },
  {
    id: 'dd-2',
    packageName: 'lodash-es',
    currentVersion: 'missing',
    expectedVersion: '4.17.21',
    severity: 'high',
    driftType: 'missing_dependency',
    detectedAt: new Date(Date.now() - 30 * 60 * 1000),
    filePath: 'src/utils/helpers.ts',
    autoFixed: false
  },
  {
    id: 'dd-3',
    packageName: 'moment',
    currentVersion: '2.29.4',
    expectedVersion: 'deprecated',
    severity: 'critical',
    driftType: 'deprecated_package',
    detectedAt: new Date(Date.now() - 60 * 60 * 1000),
    filePath: 'src/components/DatePicker.tsx',
    autoFixed: false
  }
];

export default function StopCatchMonitorPage() {
  const [stopCatchEvents, setStopCatchEvents] = useState<StopCatchEvent[]>(mockStopCatchEvents);
  const [dependencyDrifts, setDependencyDrifts] = useState<DependencyDrift[]>(mockDependencyDrifts);
  const [isMonitoring, setIsMonitoring] = useState(true);

  const getSeverityColor = (severity: string) => {
    const colors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (event: StopCatchEvent) => {
    if (event.completed && event.verified) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (event.completed && !event.verified) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const handleVerifyTask = (taskId: string) => {
    setStopCatchEvents(prev => prev.map(event =>
      event.taskId === taskId ? { ...event, verified: true } : event
    ));
    toast({
      title: "Task Verified",
      description: "Task has been manually verified as complete"
    });
  };

  const handleRetryTask = (taskId: string) => {
    toast({
      title: "Task Retry Initiated",
      description: "Attempting to re-execute the failed task"
    });
  };

  const handleFixDependency = (driftId: string) => {
    setDependencyDrifts(prev => prev.map(drift =>
      drift.id === driftId ? { ...drift, autoFixed: true } : drift
    ));
    toast({
      title: "Dependency Fixed",
      description: "Dependency drift has been automatically resolved"
    });
  };

  const stats = {
    totalTasks: stopCatchEvents.length,
    completedAndVerified: stopCatchEvents.filter(e => e.completed && e.verified).length,
    pendingVerification: stopCatchEvents.filter(e => e.completed && !e.verified).length,
    failed: stopCatchEvents.filter(e => !e.completed).length,
    criticalDrifts: dependencyDrifts.filter(d => d.severity === 'critical').length,
    totalDrifts: dependencyDrifts.length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stop-Catch Monitor</h1>
          <p className="text-gray-600 mt-1">
            Task verification and dependency drift detection
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isMonitoring ? "default" : "outline"}
            onClick={() => setIsMonitoring(!isMonitoring)}
          >
            {isMonitoring ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isMonitoring ? "Monitoring" : "Paused"}
          </Button>
          <Button variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedAndVerified} verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingVerification}</div>
            <p className="text-xs text-muted-foreground">
              Need manual review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Tasks</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">
              Require retry or escalation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dependency Drifts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDrifts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.criticalDrifts} critical issues
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stop-catch" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stop-catch">Stop-Catch Events</TabsTrigger>
          <TabsTrigger value="dependency-drift">Dependency Drift</TabsTrigger>
        </TabsList>

        <TabsContent value="stop-catch" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Task Verification Status
              </CardTitle>
              <CardDescription>
                Monitor task completion and verify actual implementation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {stopCatchEvents.map((event) => (
                    <Card key={event.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(event)}
                          <div className="flex-1">
                            <h3 className="font-medium">{event.taskName}</h3>
                            <p className="text-sm text-gray-600">{event.details}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{event.plugin}</Badge>
                              <Badge variant="outline">{event.model}</Badge>
                              {event.errorType && (
                                <Badge className={getSeverityColor('high')}>
                                  {event.errorType}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {event.timestamp.toLocaleTimeString()}
                          </span>
                          {event.completed && !event.verified && (
                            <Button
                              size="sm"
                              onClick={() => handleVerifyTask(event.taskId)}
                            >
                              Verify
                            </Button>
                          )}
                          {!event.completed && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRetryTask(event.taskId)}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dependency-drift" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Dependency Drift Detection
              </CardTitle>
              <CardDescription>
                Monitor package.json baseline and detect unauthorized changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {dependencyDrifts.map((drift) => (
                    <Card key={drift.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{drift.packageName}</h3>
                            <Badge className={getSeverityColor(drift.severity)}>
                              {drift.severity}
                            </Badge>
                            <Badge variant="outline">{drift.driftType}</Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Current: {drift.currentVersion} → Expected: {drift.expectedVersion}</p>
                            <p>File: {drift.filePath}</p>
                            <p>Detected: {drift.detectedAt.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {drift.autoFixed ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Fixed
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleFixDependency(drift.id)}
                            >
                              <Zap className="h-4 w-4 mr-1" />
                              Auto Fix
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
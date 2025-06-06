'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  FileText, 
  RefreshCw,
  Wifi,
  WifiOff,
  Filter
} from 'lucide-react';
import { useFirebaseActivities } from '@/hooks/firebase/use-activities';
import { FirebaseActivityEvent } from '@/lib/firebase/activity-service';
import { formatDistanceToNow } from 'date-fns';

interface ActivityMonitorProps {
  userId?: string;
  sessionId?: string;
  className?: string;
}

export function FirebaseActivityMonitor({ userId, sessionId, className }: ActivityMonitorProps) {
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<string[]>([]);
  const [minutesBack, setMinutesBack] = useState(30);

  const {
    activities,
    stats,
    loading,
    error,
    isConnected,
    addActivity,
    refresh
  } = useFirebaseActivities({
    autoSync: realTimeEnabled,
    userId,
    sessionId,
    types: selectedTypes.length > 0 ? selectedTypes : undefined,
    severity: selectedSeverity.length > 0 ? selectedSeverity : undefined,
    minutesBack,
    limit: 50
  });

  // Test adding a new activity
  const addTestActivity = async () => {
    try {
      await addActivity({
        type: 'user_action',
        source: 'firebase-test',
        message: 'Test activity from Firebase integration',
        timestamp: new Date(),
        details: {
          severity: 'low',
          environment: 'web'
        },
        userId,
        sessionId
      });
    } catch (error) {
      console.error('Failed to add test activity:', error);
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Activity Monitor
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={addTestActivity}
            >
              Test
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="realtime"
                checked={realTimeEnabled}
                onCheckedChange={setRealTimeEnabled}
              />
              <Label htmlFor="realtime">Real-time Updates</Label>
            </div>
            
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>

            {error && (
              <Badge variant="destructive">{error}</Badge>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total Activities</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-red-500">{stats.recentErrors}</div>
                <p className="text-xs text-muted-foreground">Recent Errors</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-blue-500">
                  {stats.byType.file_change || 0}
                </div>
                <p className="text-xs text-muted-foreground">File Changes</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-purple-500">
                  {stats.byType.user_action || 0}
                </div>
                <p className="text-xs text-muted-foreground">User Actions</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 text-sm">
            <Filter className="h-4 w-4" />
            <span>Last {minutesBack} minutes</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMinutesBack(minutesBack === 30 ? 60 : 30)}
            >
              {minutesBack === 30 ? 'Show 1 hour' : 'Show 30 min'}
            </Button>
          </div>

          <Separator />

          {/* Activity List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {loading && activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  Loading activities...
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No activities found in the last {minutesBack} minutes
                </div>
              ) : (
                activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Individual activity item component
function ActivityItem({ activity }: { activity: FirebaseActivityEvent }) {
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50 dark:bg-red-950';
      case 'high': return 'border-orange-500 bg-orange-50 dark:bg-orange-950';
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950';
      case 'low': return 'border-green-500 bg-green-50 dark:bg-green-950';
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-950';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'file_change': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'system_event': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'user_action': return <Activity className="h-4 w-4 text-purple-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const timestamp = activity.timestamp instanceof Date 
    ? activity.timestamp 
    : activity.timestamp?.toDate?.() || new Date();

  return (
    <div className={`border-l-4 p-3 rounded-r-md ${getSeverityColor(activity.details?.severity)}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getActivityIcon(activity.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {activity.type.replace('_', ' ')}
            </Badge>
            
            {activity.details?.severity && (
              <Badge 
                variant="outline" 
                className={`text-xs ${getSeverityColor(activity.details.severity)}`}
              >
                {activity.details.severity}
              </Badge>
            )}
            
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(timestamp, { addSuffix: true })}
            </span>
          </div>
          
          <p className="text-sm font-medium mt-1">{activity.message}</p>
          
          <div className="text-xs text-muted-foreground mt-1">
            <span>Source: {activity.source}</span>
            {activity.details?.filePath && (
              <span className="ml-2">• {activity.details.filePath}</span>
            )}
            {activity.details?.environment && (
              <span className="ml-2">• {activity.details.environment}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

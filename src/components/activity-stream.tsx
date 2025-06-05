"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Download, Trash2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { ActivityEvent, ActivityFilter, activityService } from '@/services/activity-service';
import { getActivityWebSocketClient } from '@/lib/websocket';
import { useToast } from '@/hooks/use-toast';

interface ActivityStreamProps {
  maxHeight?: string;
  showHeader?: boolean;
  showFilters?: boolean;
  autoScroll?: boolean;
}

function ActivityBadge({ type, severity }: { 
  type: ActivityEvent['type']; 
  severity?: ActivityEvent['details']['severity'] 
}) {
  const getVariant = () => {
    if (severity === 'critical' || type === 'error') return 'destructive';
    if (severity === 'high') return 'destructive';
    if (severity === 'medium') return 'secondary';
    if (type === 'file_change') return 'outline';
    return 'default';
  };

  const getLabel = () => {
    switch (type) {
      case 'error': return 'Error';
      case 'file_change': return 'File';
      case 'user_action': return 'User';
      case 'system_event': return 'System';
      case 'plugin_event': return 'Plugin';
      default: return 'Unknown';
    }
  };

  return <Badge variant={getVariant()}>{getLabel()}</Badge>;
}

function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {isConnected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-green-600">Connected</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-red-600">Disconnected</span>
        </>
      )}
    </div>
  );
}

export function ActivityStream({ 
  maxHeight = "400px", 
  showHeader = true, 
  showFilters = true,
  autoScroll = true
}: ActivityStreamProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const { toast } = useToast();

  const loadActivities = useCallback(() => {
    setIsLoading(true);
    try {
      const allActivities = activityService.getActivities();
      setActivities(allActivities);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load activities:', error);
      toast({
        title: "Error loading activities",
        description: "Failed to fetch activity data",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  }, [toast]);

  const applyFilters = useCallback(() => {
    const filter: ActivityFilter = {};
    
    if (typeFilter !== 'all') {
      filter.types = [typeFilter as ActivityEvent['type']];
    }
    
    if (severityFilter !== 'all') {
      filter.severity = [severityFilter as ActivityEvent['details']['severity']];
    }
    
    if (searchText.trim()) {
      filter.searchText = searchText.trim();
    }

    const filtered = activityService.getActivities(filter, 100);
    setFilteredActivities(filtered);
  }, [searchText, typeFilter, severityFilter]);

  const handleExport = (format: 'json' | 'csv') => {
    try {
      const data = activityService.exportActivities(format);
      const blob = new Blob([data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activities-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: `Activities exported as ${format.toUpperCase()}`
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export activities",
        variant: "destructive"
      });
    }
  };

  const handleClearActivities = () => {
    activityService.clearActivities();
    setActivities([]);
    setFilteredActivities([]);
    toast({
      title: "Activities cleared",
      description: "All activity data has been removed"
    });
  };

  useEffect(() => {
    loadActivities();

    const wsClient = getActivityWebSocketClient();
    
    const handleActivity = (activity: ActivityEvent) => {
      setActivities(prev => [activity, ...prev.slice(0, 999)]);
    };

    const handleActivitiesUpdated = (updatedActivities: ActivityEvent[]) => {
      setActivities(updatedActivities);
    };

    const handleConnection = (data: any) => {
      setIsConnected(data.status === 'connected');
    };

    const handleError = (error: any) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    activityService.on('activity', handleActivity);
    activityService.on('activities-updated', handleActivitiesUpdated);
    
    wsClient.on('activity', handleActivity);
    wsClient.on('activities-updated', handleActivitiesUpdated);
    wsClient.on('connection', handleConnection);
    wsClient.on('error', handleError);

    // Try to connect to WebSocket
    wsClient.connect().catch((error) => {
      console.warn('WebSocket connection failed, using local events only:', error);
    });

    return () => {
      activityService.off('activity', handleActivity);
      activityService.off('activities-updated', handleActivitiesUpdated);
      wsClient.off('activity', handleActivity);
      wsClient.off('activities-updated', handleActivitiesUpdated);
      wsClient.off('connection', handleConnection);
      wsClient.off('error', handleError);
    };
  }, [loadActivities]);

  useEffect(() => {
    applyFilters();
  }, [activities, applyFilters]);

  const displayActivities = filteredActivities.length > 0 ? filteredActivities : activities;

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Activity Stream</h3>
            <ConnectionStatus isConnected={isConnected} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadActivities}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('json')}>
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearActivities}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {showFilters && (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Activities</TabsTrigger>
            <TabsTrigger value="filter">Filter</TabsTrigger>
            <TabsTrigger value="search">Search</TabsTrigger>
          </TabsList>
          
          <TabsContent value="filter" className="space-y-2 mt-4">
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="file_change">File Changes</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                  <SelectItem value="user_action">User Actions</SelectItem>
                  <SelectItem value="system_event">System Events</SelectItem>
                  <SelectItem value="plugin_event">Plugin Events</SelectItem>
                </SelectContent>
              </Select>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="search" className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

      <ScrollArea className="border rounded-md" style={{ height: maxHeight }}>
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading activities...
            </div>
          ) : displayActivities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No activities found
            </div>
          ) : (
            displayActivities.map((activity) => (
              <Card key={activity.id} className="p-3 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <ActivityBadge type={activity.type} severity={activity.details?.severity} />
                      <span className="text-xs text-muted-foreground">
                        {activity.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{activity.message}</p>
                    {activity.details?.filePath && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {activity.details.filePath}
                      </p>
                    )}
                    {activity.details?.changeType && (
                      <p className="text-xs text-muted-foreground">
                        Change: {activity.details.changeType}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Download, 
  Filter, 
  Search, 
  Trash2, 
  FileText, 
  AlertTriangle, 
  User, 
  Settings, 
  Puzzle,
  Clock
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { activityService, ActivityEvent, ActivityFilters } from "@/services/client-activity-service";

interface ActivityStreamProps {
  maxHeight?: string;
  showHeader?: boolean;
  showFilters?: boolean;
  autoScroll?: boolean;
  maxItems?: number;
}

const ActivityTypeIcons = {
  file_change: FileText,
  error: AlertTriangle,
  user_action: User,
  system_event: Settings,
  plugin_event: Puzzle,
};

const SeverityColors = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

export function ActivityStream({ 
  maxHeight = '400px',
  showHeader = true,
  showFilters = true,
  autoScroll = true,
  maxItems = 500
}: ActivityStreamProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Subscribe to activity updates
  useEffect(() => {
    const unsubscribe = activityService.subscribe((newActivities) => {
      setActivities(newActivities.slice(0, maxItems));
    });

    return unsubscribe;
  }, [maxItems]);

  // Apply filters
  const filteredActivities = useMemo(() => {
    const currentFilters: ActivityFilters = {
      search: searchTerm || undefined,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
      severity: selectedSeverities.length > 0 ? selectedSeverities : undefined,
    };

    return activityService.getActivities(currentFilters);
  }, [activities, searchTerm, selectedTypes, selectedSeverities]);

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleSeverityToggle = (severity: string) => {
    setSelectedSeverities(prev =>
      prev.includes(severity)
        ? prev.filter(s => s !== severity)
        : [...prev, severity]
    );
  };

  const handleExport = (format: 'json' | 'csv' | 'markdown') => {
    try {
      const exportData = activityService.exportActivities(format, {
        search: searchTerm || undefined,
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        severity: selectedSeverities.length > 0 ? selectedSeverities : undefined,
      });

      const blob = new Blob([exportData], { 
        type: format === 'json' ? 'application/json' : 'text/plain' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activities_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Activities exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not export activities",
        variant: "destructive",
      });
    }
  };

  const handleClear = () => {
    activityService.clearActivities();
    toast({
      title: "Activities Cleared",
      description: "All activity logs have been removed",
    });
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatRelativeTime = (timestamp: Date) => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  // Get available filter options
  const availableTypes = [...new Set(activities.map(a => a.type))];
  const availableSeverities = [...new Set(activities.map(a => a.details?.severity).filter(Boolean))];

  const stats = activityService.getStats();

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {filteredActivities.length} of {activities.length} activities
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                Last Hour: {stats.lastHour}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Last 24h: {stats.last24h}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>
            <Select onValueChange={(value) => handleExport(value as any)}>
              <SelectTrigger className="w-32">
                <Download className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {showFilters && showFiltersPanel && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Activity Types</label>
                <div className="space-y-2">
                  {availableTypes.map(type => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={`type-${type}`}
                        checked={selectedTypes.includes(type)}
                        onCheckedChange={() => handleTypeToggle(type)}
                      />
                      <label htmlFor={`type-${type}`} className="text-sm capitalize">
                        {type.replace('_', ' ')} ({stats.byType[type] || 0})
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Severity Levels</label>
                <div className="space-y-2">
                  {availableSeverities.map(severity => (
                    <div key={severity} className="flex items-center space-x-2">
                      <Checkbox
                        id={`severity-${severity}`}
                        checked={selectedSeverities.includes(severity)}
                        onCheckedChange={() => handleSeverityToggle(severity)}
                      />
                      <label htmlFor={`severity-${severity}`} className="text-sm capitalize">
                        {severity} ({stats.bySeverity[severity] || 0})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ScrollArea style={{ height: maxHeight }} className="rounded-md border">
        <div className="p-4 space-y-3">
          {filteredActivities.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No activities found</p>
              <p className="text-xs">Activities will appear here as they occur</p>
            </div>
          ) : (
            filteredActivities.map((activity) => {
              const IconComponent = ActivityTypeIcons[activity.type] || FileText;
              const severityColor = activity.details?.severity 
                ? SeverityColors[activity.details.severity as keyof typeof SeverityColors] 
                : 'bg-gray-100 text-gray-800 border-gray-200';

              return (
                <Card key={activity.id} className="p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.source}
                          </p>
                          {activity.details?.filePath && (
                            <p className="text-xs text-blue-600 font-mono">
                              {activity.details.filePath}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex-shrink-0 text-right">
                          <div className="flex items-center gap-2">
                            {activity.details?.severity && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${severityColor}`}
                              >
                                {activity.details.severity}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {activity.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span title={new Date(activity.timestamp).toLocaleString()}>
                              {formatRelativeTime(activity.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {activity.details?.errorStack && (
                        <details className="mt-2">
                          <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                            View Error Details
                          </summary>
                          <pre className="text-xs bg-red-50 p-2 rounded mt-1 overflow-x-auto">
                            {activity.details.errorStack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {filteredActivities.length > 0 && (
        <div className="text-xs text-center text-muted-foreground">
          Showing {filteredActivities.length} activities • 
          Last updated: {formatTime(new Date())}
        </div>
      )}
    </div>
  );
}
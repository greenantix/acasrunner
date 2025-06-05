'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  ActivityEvent,
  ActivityFilters,
  activityService,
} from '@/services/client-activity-service';
import {
  AlertTriangle,
  Clock,
  Download,
  FileText,
  Filter,
  Puzzle,
  Search,
  Settings,
  Trash2,
  User,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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
  maxItems = 500,
}: ActivityStreamProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Get available filter options from client-side only after hydration
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [availableSeverities, setAvailableSeverities] = useState<string[]>([]);

  // Mark when client-side rendering is active
  useEffect(() => {
    setIsClient(true);
  }, []); // Subscribe to activity updates
  useEffect(() => {
    const unsubscribe = activityService.subscribe(newActivities => {
      setActivities(newActivities.slice(0, maxItems));
    });

    return unsubscribe;
  }, [maxItems]);

  // Update filter options after client-side hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAvailableTypes([...new Set(activities.map(a => a.type))]);

      const severities = activities.map(a => a.details?.severity).filter(Boolean) as (
        | 'low'
        | 'medium'
        | 'high'
        | 'critical'
      )[];

      setAvailableSeverities([...new Set(severities)]);
    }
  }, [activities]);

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
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSeverityToggle = (severity: string) => {
    setSelectedSeverities(prev =>
      prev.includes(severity) ? prev.filter(s => s !== severity) : [...prev, severity]
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
        type: format === 'json' ? 'application/json' : 'text/plain',
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
        title: 'Export Complete',
        description: `Activities exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Could not export activities',
        variant: 'destructive',
      });
    }
  };

  const handleClear = () => {
    activityService.clearActivities();
    toast({
      title: 'Activities Cleared',
      description: 'All activity logs have been removed',
    });
  };
  const formatTime = (timestamp: Date) => {
    if (typeof window === 'undefined') {
      return ''; // Return empty during SSR
    }
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };
  const formatRelativeTime = (timestamp: Date) => {
    if (typeof window === 'undefined') {
      return ''; // Return empty string during server-side rendering
    }

    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }; // Get available filter options
  const stats = isClient
    ? activityService.getStats()
    : {
        total: 0,
        lastHour: 0,
        last24h: 0,
        byType: {},
        bySeverity: {},
      };

  return (
    <div className="space-y-4">
      {' '}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {isClient ? `${filteredActivities.length} of ${activities.length} activities` : ''}
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                Last Hour: {isClient ? stats.lastHour : ''}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Last 24h: {isClient ? stats.last24h : ''}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            >
              <Filter className="mr-1 h-4 w-4" />
              Filters
            </Button>
            <Select onValueChange={value => handleExport(value as any)}>
              <SelectTrigger className="w-32">
                <Download className="mr-1 h-4 w-4" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="mr-1 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      )}
      {showFilters && showFiltersPanel && isClient && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                  <Input
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Activity Types</label>
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
                <label className="mb-2 block text-sm font-medium">Severity Levels</label>
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
        {' '}
        <div className="space-y-3 p-4">
          {!isClient || filteredActivities.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p>No activities found</p>
              <p className="text-xs">Activities will appear here as they occur</p>
            </div>
          ) : (
            filteredActivities.map(activity => {
              const IconComponent = ActivityTypeIcons[activity.type] || FileText;
              const severityColor = activity.details?.severity
                ? SeverityColors[activity.details.severity as keyof typeof SeverityColors]
                : 'bg-gray-100 text-gray-800 border-gray-200';

              return (
                <Card key={activity.id} className="p-3 transition-shadow hover:shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.message}</p>
                          <p className="text-xs text-muted-foreground">{activity.source}</p>
                          {activity.details?.filePath && (
                            <p className="font-mono text-xs text-blue-600">
                              {activity.details.filePath}
                            </p>
                          )}
                        </div>

                        <div className="flex-shrink-0 text-right">
                          <div className="flex items-center gap-2">
                            {activity.details?.severity && (
                              <Badge variant="outline" className={`text-xs ${severityColor}`}>
                                {activity.details.severity}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {activity.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span title={new Date(activity.timestamp).toLocaleString()}>
                              {formatRelativeTime(activity.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {activity.details?.errorStack && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-red-600 hover:text-red-800">
                            View Error Details
                          </summary>
                          <pre className="mt-1 overflow-x-auto rounded bg-red-50 p-2 text-xs">
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
      </ScrollArea>{' '}
      {isClient && filteredActivities.length > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          Showing {filteredActivities.length} activities • Last updated: {formatTime(new Date())}
        </div>
      )}
    </div>
  );
}

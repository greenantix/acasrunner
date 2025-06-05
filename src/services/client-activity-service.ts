// Client-side activity service - browser-safe version
"use client";

import { toast } from '@/hooks/use-toast';

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: 'file_change' | 'error' | 'user_action' | 'system_event' | 'plugin_event';
  source: string;
  message: string;
  details?: {
    filePath?: string;
    changeType?: 'created' | 'modified' | 'deleted';
    linesChanged?: { added: number; removed: number };
    error?: string;
    message?: string;
    stack?: string;
    level?: string;
    errorStack?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    environment?: string;
    exitCode?: number;
  };
  metadata?: Record<string, any>;
}

export interface ActivityFilters {
  types?: string[];
  severity?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

class ClientActivityService {
  private activities: ActivityEvent[] = [];
  private listeners: ((activities: ActivityEvent[]) => void)[] = [];
  private eventSource: EventSource | null = null;
  private isInitialized = false;

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    if (this.isInitialized) return;
    
    this.initializeErrorHandling();
    this.connectToServer();
    this.addMockData();
    this.isInitialized = true;
  }

  private connectToServer(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Connect to server-sent events for real-time updates
      this.eventSource = new EventSource('/api/activities/stream');
      
      this.eventSource.onmessage = (event) => {
        try {
          const activityEvent: ActivityEvent = JSON.parse(event.data);
          this.addActivity(activityEvent);
        } catch (error) {
          console.error('Failed to parse activity event:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        // Will automatically reconnect
      };

      console.log('📡 Connected to activity stream');
    } catch (error) {
      console.error('Failed to connect to activity stream:', error);
    }
  }

  private initializeErrorHandling(): void {
    if (typeof window === 'undefined') return;
    
    // Global error handler
    window.addEventListener('error', (event) => {
      this.logError('JavaScript Error', event.error, 'high');
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('Unhandled Promise Rejection', event.reason, 'medium');
    });

    // Console error override
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      originalConsoleError.apply(console, args);
      this.logError('Console Error', args.join(' '), 'low');
    };
  }

  private addMockData(): void {
    // Add some initial mock data for immediate testing
    const mockActivities: ActivityEvent[] = [
      {
        id: 'mock_1',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        type: 'system_event',
        source: 'client-activity-service',
        message: 'Activity monitoring system initialized',
        details: { severity: 'low' }
      },
      {
        id: 'mock_2', 
        timestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
        type: 'user_action',
        source: 'dashboard',
        message: 'User opened dashboard page',
        details: { severity: 'low' }
      }
    ];

    mockActivities.forEach(activity => this.addActivity(activity));
  }

  private logError(type: string, error: any, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    const activity: ActivityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'error',
      source: 'client-error-monitor',
      message: `${type}: ${error?.message || error}`,
      details: {
        errorStack: error?.stack,
        severity,
      },
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      }
    };

    this.addActivity(activity);

    // Show toast for high severity errors
    if (typeof window !== 'undefined' && (severity === 'high' || severity === 'critical')) {
      toast({
        title: type,
        description: error?.message || error,
        variant: 'destructive',
      });
    }
  }

  addActivity(activity: ActivityEvent): void {
    this.activities.unshift(activity); // Add to beginning for newest first
    
    // Keep only last 1000 activities to prevent memory issues
    if (this.activities.length > 1000) {
      this.activities = this.activities.slice(0, 1000);
    }

    this.notifyListeners();
  }

  logUserAction(action: string, details?: any): void {
    if (typeof window === 'undefined') return;
    
    const activity: ActivityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'user_action',
      source: 'user-interface',
      message: action,
      details: {
        severity: 'low',
        ...details,
      },
      metadata: {
        page: window.location.pathname,
        timestamp: Date.now(),
      }
    };

    this.addActivity(activity);
  }

  getActivities(filters?: ActivityFilters): ActivityEvent[] {
    let filtered = [...this.activities];

    if (filters) {
      if (filters.types && filters.types.length > 0) {
        filtered = filtered.filter(activity => filters.types!.includes(activity.type));
      }

      if (filters.severity && filters.severity.length > 0) {
        filtered = filtered.filter(activity => 
          activity.details?.severity && filters.severity!.includes(activity.details.severity)
        );
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(activity =>
          activity.message.toLowerCase().includes(searchLower) ||
          activity.source.toLowerCase().includes(searchLower)
        );
      }

      if (filters.dateRange) {
        filtered = filtered.filter(activity =>
          activity.timestamp >= filters.dateRange!.start &&
          activity.timestamp <= filters.dateRange!.end
        );
      }
    }

    return filtered;
  }

  subscribe(listener: (activities: ActivityEvent[]) => void): () => void {
    // Ensure initialization in browser
    if (typeof window !== 'undefined' && !this.isInitialized) {
      this.initialize();
    }
    
    this.listeners.push(listener);
    
    // Immediately call with current activities
    listener(this.activities);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener([...this.activities]);
      } catch (error) {
        console.error('Error notifying activity listener:', error);
      }
    });
  }

  exportActivities(format: 'json' | 'csv' | 'markdown' = 'json', filters?: ActivityFilters): string {
    const activities = this.getActivities(filters);

    switch (format) {
      case 'json':
        return JSON.stringify(activities, null, 2);
      
      case 'csv':
        const headers = 'Timestamp,Type,Source,Message,Severity\n';
        const rows = activities.map(activity =>
          `"${activity.timestamp.toISOString()}","${activity.type}","${activity.source}","${activity.message.replace(/"/g, '""')}","${activity.details?.severity || 'unknown'}"`
        ).join('\n');
        return headers + rows;
      
      case 'markdown':
        let markdown = '# Activity Log\n\n';
        markdown += `Generated: ${new Date().toISOString()}\n\n`;
        activities.forEach(activity => {
          markdown += `## ${activity.message}\n`;
          markdown += `- **Time**: ${activity.timestamp.toLocaleString()}\n`;
          markdown += `- **Type**: ${activity.type}\n`;
          markdown += `- **Source**: ${activity.source}\n`;
          if (activity.details?.severity) {
            markdown += `- **Severity**: ${activity.details.severity}\n`;
          }
          markdown += '\n';
        });
        return markdown;
      
      default:
        return JSON.stringify(activities, null, 2);
    }
  }

  clearActivities(): void {
    this.activities = [];
    this.notifyListeners();
    this.logUserAction('Cleared activity log');
  }

  private generateId(): string {
    return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStats() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const last24h = this.activities.filter(a => a.timestamp >= oneDayAgo);
    const lastHour = this.activities.filter(a => a.timestamp >= oneHourAgo);

    const typeStats = this.activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severityStats = this.activities.reduce((acc, activity) => {
      const severity = activity.details?.severity || 'unknown';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: this.activities.length,
      last24h: last24h.length,
      lastHour: lastHour.length,
      byType: typeStats,
      bySeverity: severityStats,
    };
  }

  // Clean up resources
  destroy(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.listeners = [];
    this.activities = [];
  }
}

// Export singleton instance
export const activityService = new ClientActivityService();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    activityService.destroy();
  });
}
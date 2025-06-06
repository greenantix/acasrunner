import { EventEmitter } from 'events';

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

export interface ActivityFilter {
  types?: ActivityEvent['type'][];
  sources?: string[];
  severity?: ('low' | 'medium' | 'high' | 'critical')[];
  startDate?: Date;
  endDate?: Date;
  searchText?: string;
}

class ActivityService extends EventEmitter {
  private activities: ActivityEvent[] = [];
  private maxActivities = 1000;

  constructor() {
    super();
    this.setMaxListeners(20);
  }

  addActivity(activity: ActivityEvent): void {
    this.activities.unshift(activity);
    
    if (this.activities.length > this.maxActivities) {
      this.activities = this.activities.slice(0, this.maxActivities);
    }

    this.emit('activity', activity);
    this.emit('activities-updated', this.activities);
  }

  getActivities(filter?: ActivityFilter, limit = 50, offset = 0): ActivityEvent[] {
    let filtered = this.activities;

    if (filter) {
      filtered = this.applyFilter(filtered, filter);
    }

    return filtered.slice(offset, offset + limit);
  }

  getActivityCount(filter?: ActivityFilter): number {
    if (!filter) return this.activities.length;
    return this.applyFilter(this.activities, filter).length;
  }

  clearActivities(): void {
    this.activities = [];
    this.emit('activities-updated', this.activities);
  }

  exportActivities(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportToCSV();
    }
    return JSON.stringify(this.activities, null, 2);
  }

  logError(source: string, error: Error, details?: Record<string, any>): void {
    const activity: ActivityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'error',
      source,
      message: error.message,
      details: {
        errorStack: error.stack,
        severity: 'high',
        ...details
      }
    };

    this.addActivity(activity);
  }

  logUserAction(action: string, details?: Record<string, any>): void {
    const activity: ActivityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'user_action',
      source: 'user',
      message: action,
      details: {
        severity: 'low',
        ...details
      }
    };

    this.addActivity(activity);
  }

  logSystemEvent(message: string, source = 'system', details?: Record<string, any>): void {
    const activity: ActivityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'system_event',
      source,
      message,
      details: {
        severity: 'low',
        ...details
      }
    };

    this.addActivity(activity);
  }

  private applyFilter(activities: ActivityEvent[], filter: ActivityFilter): ActivityEvent[] {
    return activities.filter(activity => {
      if (filter.types && !filter.types.includes(activity.type)) {
        return false;
      }

      if (filter.sources && !filter.sources.includes(activity.source)) {
        return false;
      }

      if (filter.severity && activity.details?.severity && 
          !filter.severity.includes(activity.details.severity)) {
        return false;
      }

      if (filter.startDate && activity.timestamp < filter.startDate) {
        return false;
      }

      if (filter.endDate && activity.timestamp > filter.endDate) {
        return false;
      }

      if (filter.searchText) {
        const searchLower = filter.searchText.toLowerCase();
        return (
          activity.message.toLowerCase().includes(searchLower) ||
          activity.source.toLowerCase().includes(searchLower) ||
          (activity.details?.filePath && 
           activity.details.filePath.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  }

  private exportToCSV(): string {
    const headers = ['id', 'timestamp', 'type', 'source', 'message', 'filePath', 'changeType', 'severity'];
    const rows = this.activities.map(activity => [
      activity.id,
      activity.timestamp.toISOString(),
      activity.type,
      activity.source,
      activity.message.replace(/"/g, '""'),
      activity.details?.filePath || '',
      activity.details?.changeType || '',
      activity.details?.severity || ''
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
  }

  private generateId(): string {
    return `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const activityService = new ActivityService();
export default activityService;

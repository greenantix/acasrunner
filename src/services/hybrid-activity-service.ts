'use client';

import { activityService } from '@/services/client-activity-service';
import { firebaseActivityService } from '@/lib/firebase/activity-service';
import { ActivityEvent } from '@/services/client-activity-service';

export class HybridActivityService {
  private static instance: HybridActivityService;

  static getInstance(): HybridActivityService {
    if (!HybridActivityService.instance) {
      HybridActivityService.instance = new HybridActivityService();
    }
    return HybridActivityService.instance;
  }

  // Add activity to both local and Firebase
  async addActivity(activity: ActivityEvent): Promise<void> {
    try {
      // Add to local service immediately
      activityService.addActivity(activity);

      // Add to Firebase for persistence and real-time sync
      const firebaseActivity = {
        type: activity.type,
        source: activity.source,
        message: activity.message,
        timestamp: activity.timestamp,
        details: activity.details,
        metadata: activity.metadata
      };

      await firebaseActivityService.addActivity(firebaseActivity);
    } catch (error) {
      console.error('Failed to add activity to Firebase:', error);
      // Local activity already added, so continue gracefully
    }
  }

  // Log user action to both services
  logUserAction(action: string, details?: any): void {
    try {
      // Log to local service
      activityService.logUserAction(action, details);

      // Also log to Firebase
      this.addActivity({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        type: 'user_action',
        source: 'user-interface',
        message: action,
        details: {
          severity: 'low',
          environment: 'web',
          ...details,
        },
        metadata: {
          page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
          timestamp: Date.now(),
        }
      });
    } catch (error) {
      console.error('Failed to log user action:', error);
    }
  }

  // Log error to both services
  logError(type: string, error: any, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    const errorMessage = error?.message || String(error);
    
    const activity: ActivityEvent = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'error',
      source: 'error-monitor',
      message: `${type}: ${errorMessage}`,
      details: {
        error: errorMessage,
        stack: error?.stack,
        severity,
        environment: 'web'
      },
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      }
    };

    this.addActivity(activity);
  }

  // Log file change to both services
  logFileChange(filePath: string, changeType: 'created' | 'modified' | 'deleted'): void {
    const activity: ActivityEvent = {
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'file_change',
      source: 'file-monitor',
      message: `File ${changeType}: ${filePath}`,
      details: {
        filePath,
        changeType,
        severity: 'low',
        environment: 'filesystem'
      }
    };

    this.addActivity(activity);
  }

  // Get local activities (for immediate display)
  getLocalActivities(filters?: any): ActivityEvent[] {
    return activityService.getActivities(filters);
  }

  // Subscribe to local activities
  subscribeToLocalActivities(callback: (activities: ActivityEvent[]) => void): () => void {
    return activityService.subscribe(callback);
  }

  // Get local stats
  getLocalStats() {
    return activityService.getStats();
  }

  // Clear local activities
  clearLocalActivities(): void {
    activityService.clearActivities();
  }

  // Export activities from local service
  exportLocalActivities(format: 'json' | 'csv' | 'markdown' = 'json', filters?: any): string {
    return activityService.exportActivities(format, filters);
  }
}

// Export singleton instance
export const hybridActivityService = HybridActivityService.getInstance();

// Auto-setup error monitoring
if (typeof window !== 'undefined') {
  // Global error handler
  window.addEventListener('error', (event) => {
    hybridActivityService.logError('JavaScript Error', event.error, 'high');
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    hybridActivityService.logError('Unhandled Promise Rejection', event.reason, 'medium');
  });

  // Console error override
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    originalConsoleError.apply(console, args);
    hybridActivityService.logError('Console Error', args.join(' '), 'low');
  };
}

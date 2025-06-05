// Server-side bridge between activity monitoring and AI escalation

import { ActivityEvent } from './client-activity-service';
import { escalationManager } from './escalation-manager';

interface ServerActivityStore {
  activities: ActivityEvent[];
  addActivity(activity: ActivityEvent): void;
  getRecentErrors(timeWindowMinutes: number): ActivityEvent[];
  subscribe(callback: (activity: ActivityEvent) => void): void;
}

class ActivityEscalationBridge {
  private activityStore: ServerActivityStore;
  private isInitialized = false;

  constructor() {
    this.activityStore = {
      activities: [],
      addActivity: this.addActivity.bind(this),
      getRecentErrors: this.getRecentErrors.bind(this),
      subscribe: this.subscribe.bind(this)
    };
    
    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // Connect escalation manager to activity store
    escalationManager.setActivitySource(this.getRecentErrors.bind(this));
    
    console.log('🔗 Activity escalation bridge initialized');
    this.isInitialized = true;
  }

  private addActivity(activity: ActivityEvent): void {
    this.activityStore.activities.unshift(activity);
    
    // Keep only last 5000 activities to prevent memory issues
    if (this.activityStore.activities.length > 5000) {
      this.activityStore.activities = this.activityStore.activities.slice(0, 5000);
    }

    // Process for potential escalation
    this.processForEscalation(activity);
  }

  private async processForEscalation(activity: ActivityEvent): Promise<void> {
    // Only process error and warning events for escalation
    if (activity.type === 'error' || 
        (activity.type === 'system_event' && activity.details?.severity && 
         ['medium', 'high', 'critical'].includes(activity.details.severity))) {
      
      try {
        await escalationManager.processEvent(activity);
      } catch (error) {
        console.error('Failed to process activity for escalation:', error);
        // Log the escalation failure as an activity
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.addActivity({
          id: `escalation-error-${Date.now()}`,
          timestamp: new Date(),
          type: 'error',
          source: 'escalation-bridge',
          message: `Failed to process escalation for activity ${activity.id}: ${errorMessage}`,
          details: {
            severity: 'medium',
            error: errorMessage
          },
          metadata: {
            originalActivityId: activity.id
          }
        });
      }
    }
  }

  private getRecentErrors(timeWindowMinutes: number): ActivityEvent[] {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    return this.activityStore.activities.filter(activity => 
      activity.timestamp >= cutoffTime && 
      (activity.type === 'error' || 
       (activity.details?.severity && ['medium', 'high', 'critical'].includes(activity.details.severity)))
    );
  }

  private subscribe(callback: (activity: ActivityEvent) => void): void {
    // This would be used for real-time escalation processing
    // For now, we process immediately in addActivity
  }

  // Public API for receiving activities from various sources
  
  receiveFromClient(activity: ActivityEvent): void {
    this.addActivity(activity);
  }

  receiveFromFileMonitor(filePath: string, changeType: 'created' | 'modified' | 'deleted'): void {
    const activity: ActivityEvent = {
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'file_change',
      source: 'file-monitor',
      message: `File ${changeType}: ${filePath}`,
      details: {
        filePath,
        changeType,
        severity: 'low'
      }
    };
    
    this.addActivity(activity);
  }

  receiveServerError(error: Error, context?: any): void {
    const activity: ActivityEvent = {
      id: `server-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: 'error',
      source: 'server',
      message: `Server error: ${error.message}`,
      details: {
        error: error.message,
        stack: error.stack,
        severity: 'high',
        environment: 'server',
        ...context
      }
    };
    
    this.addActivity(activity);
  }

  receiveBuildError(buildOutput: string, exitCode: number): void {
    const severity = exitCode === 0 ? 'low' : 'high';
    
    const activity: ActivityEvent = {
      id: `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type: exitCode === 0 ? 'system_event' : 'error',
      source: 'build-system',
      message: exitCode === 0 ? 'Build completed successfully' : `Build failed with exit code ${exitCode}`,
      details: {
        severity,
        error: exitCode !== 0 ? buildOutput : undefined,
        exitCode,
        environment: 'build'
      }
    };
    
    this.addActivity(activity);
  }

  // API for integration with activity stream endpoints
  getActivitiesForStream(since?: Date): ActivityEvent[] {
    let activities = [...this.activityStore.activities];
    
    if (since) {
      activities = activities.filter(activity => activity.timestamp > since);
    }
    
    // Return newest first, limited to last 100 for streaming
    return activities.slice(0, 100);
  }

  getActivityStats(): {
    total: number;
    recentErrors: number;
    escalations: number;
    lastActivity?: Date;
  } {
    const recentErrors = this.getRecentErrors(60); // Last hour
    const escalationStats = escalationManager.getEscalationStats();
    
    return {
      total: this.activityStore.activities.length,
      recentErrors: recentErrors.length,
      escalations: escalationStats.total,
      lastActivity: this.activityStore.activities.length > 0 
        ? this.activityStore.activities[0].timestamp 
        : undefined
    };
  }

  // Testing utilities
  async simulateError(errorMessage: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<void> {
    const activity: ActivityEvent = {
      id: `test-error-${Date.now()}`,
      timestamp: new Date(),
      type: 'error',
      source: 'test-simulation',
      message: `Simulated error: ${errorMessage}`,
      details: {
        error: errorMessage,
        severity,
        environment: 'test'
      }
    };
    
    this.addActivity(activity);
  }

  async testEscalationFlow(): Promise<{
    activityCreated: boolean;
    escalationTriggered: boolean;
    aiResponseReceived: boolean;
  }> {
    const testErrorMessage = 'Test escalation: Cannot read property "length" of undefined';
    
    try {
      await this.simulateError(testErrorMessage, 'high');
      
      // Give escalation a moment to process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const escalationHistory = escalationManager.getEscalationHistory(5);
      const recentEscalation = escalationHistory.find(e => 
        e.aiResponse?.includes('Test escalation') || 
        e.context?.error?.includes('Test escalation')
      );
      
      return {
        activityCreated: true,
        escalationTriggered: !!recentEscalation,
        aiResponseReceived: !!(recentEscalation?.aiResponse)
      };
    } catch (error) {
      console.error('Test escalation flow failed:', error);
      return {
        activityCreated: false,
        escalationTriggered: false,
        aiResponseReceived: false
      };
    }
  }
}

// Singleton instance
export const activityEscalationBridge = new ActivityEscalationBridge();

// Export for use in API routes
export { ActivityEscalationBridge };
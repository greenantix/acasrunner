import { EventEmitter } from 'events';
import { FirebaseCollections, ActivityEventDoc, EscalationEventDoc } from '../firebase/collections';
import { ActivityEvent } from '@/services/client-activity-service';

// Sync service to handle data synchronization between local storage and Firebase
export class DatabaseSyncService extends EventEmitter {
  private isOnline = true;
  private pendingOperations: Array<{
    id: string;
    type: 'activity' | 'escalation' | 'analytics';
    operation: 'create' | 'update' | 'delete';
    data: any;
    timestamp: Date;
    retryCount: number;
  }> = [];
  
  private readonly MAX_RETRIES = 3;
  private readonly SYNC_INTERVAL = 5000; // 5 seconds
  private syncInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor() {
    super();
    this.initializeSync();
  }

  private async initializeSync(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Check online status
      if (typeof window !== 'undefined') {
        this.isOnline = navigator.onLine;
        
        window.addEventListener('online', () => {
          this.isOnline = true;
          this.emit('online');
          this.processPendingOperations();
        });
        
        window.addEventListener('offline', () => {
          this.isOnline = false;
          this.emit('offline');
        });
      }

      // Start periodic sync
      this.startPeriodicSync();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('📊 Database sync service initialized');
    } catch (error) {
      console.error('Failed to initialize sync service:', error);
      this.emit('error', error);
    }
  }

  // Sync activities from local to Firebase
  async syncActivities(localActivities: ActivityEvent[]): Promise<void> {
    if (!this.isOnline) {
      console.log('Offline - queueing activities for sync');
      localActivities.forEach(activity => {
        this.queueOperation('activity', 'create', activity);
      });
      return;
    }

    try {
      const syncPromises = localActivities.map(async (activity) => {
        try {
          await FirebaseCollections.addActivity({
            type: activity.type,
            source: activity.source,
            message: activity.message,
            details: activity.details,
            metadata: activity.metadata,
            sessionId: activity.metadata?.sessionId || 'default'
          });
          
          this.emit('activity_synced', activity);
        } catch (error) {
          console.error(`Failed to sync activity ${activity.id}:`, error);
          this.queueOperation('activity', 'create', activity);
        }
      });

      await Promise.allSettled(syncPromises);
      
      this.emit('activities_synced', localActivities.length);
    } catch (error) {
      console.error('Batch activity sync failed:', error);
      this.emit('sync_error', error);
    }
  }

  // Sync escalations to Firebase
  async syncEscalations(escalations: any[]): Promise<void> {
    if (!this.isOnline) {
      console.log('Offline - queueing escalations for sync');
      escalations.forEach(escalation => {
        this.queueOperation('escalation', 'create', escalation);
      });
      return;
    }

    try {
      const syncPromises = escalations.map(async (escalation) => {
        try {
          await FirebaseCollections.addEscalation({
            ...escalation,
            timestamp: escalation.timestamp as any,
            sessionId: escalation.sessionId || 'default'
          });
          
          this.emit('escalation_synced', escalation);
        } catch (error) {
          console.error(`Failed to sync escalation ${escalation.id}:`, error);
          this.queueOperation('escalation', 'create', escalation);
        }
      });

      await Promise.allSettled(syncPromises);
      
      this.emit('escalations_synced', escalations.length);
    } catch (error) {
      console.error('Batch escalation sync failed:', error);
      this.emit('sync_error', error);
    }
  }

  // Get latest data from Firebase and merge with local
  async pullLatestData(sessionId: string, lastSyncTime?: Date): Promise<{
    activities: ActivityEventDoc[];
    escalations: EscalationEventDoc[];
  }> {
    if (!this.isOnline) {
      throw new Error('Cannot pull data while offline');
    }

    try {
      // Get activities since last sync
      const activities = await FirebaseCollections.getActivities({
        sessionId,
        limit: 100 // Reasonable limit for performance
      });

      // Get escalations since last sync  
      const escalations = await FirebaseCollections.getEscalations({
        sessionId,
        limit: 50
      });

      // Filter by lastSyncTime if provided
      const filteredActivities = lastSyncTime
        ? activities.filter(a => a.timestamp.toDate() > lastSyncTime)
        : activities;
        
      const filteredEscalations = lastSyncTime
        ? escalations.filter(e => e.timestamp.toDate() > lastSyncTime)
        : escalations;

      this.emit('data_pulled', {
        activities: filteredActivities.length,
        escalations: filteredEscalations.length
      });

      return {
        activities: filteredActivities,
        escalations: filteredEscalations
      };
    } catch (error) {
      console.error('Failed to pull latest data:', error);
      this.emit('pull_error', error);
      throw error;
    }
  }

  // Merge local and remote data, resolving conflicts
  async mergeData<T extends { id: string; timestamp: Date | any }>(
    localData: T[],
    remoteData: T[],
    conflictResolver: (local: T, remote: T) => T = (local, remote) => {
      // Default: last write wins based on timestamp
      const localTime = local.timestamp instanceof Date 
        ? local.timestamp 
        : local.timestamp.toDate();
      const remoteTime = remote.timestamp instanceof Date 
        ? remote.timestamp 
        : remote.timestamp.toDate();
      
      return localTime > remoteTime ? local : remote;
    }
  ): Promise<T[]> {
    const localMap = new Map(localData.map(item => [item.id, item]));
    const remoteMap = new Map(remoteData.map(item => [item.id, item]));
    const mergedMap = new Map<string, T>();

    // Add all remote items
    remoteMap.forEach((item, id) => {
      mergedMap.set(id, item);
    });

    // Process local items, handling conflicts
    localMap.forEach((localItem, id) => {
      const remoteItem = remoteMap.get(id);
      
      if (remoteItem) {
        // Conflict - use resolver
        const resolved = conflictResolver(localItem, remoteItem);
        mergedMap.set(id, resolved);
        
        this.emit('conflict_resolved', {
          id,
          local: localItem,
          remote: remoteItem,
          resolved
        });
      } else {
        // Local only - add to merged
        mergedMap.set(id, localItem);
      }
    });

    const mergedData = Array.from(mergedMap.values());
    
    this.emit('data_merged', {
      local: localData.length,
      remote: remoteData.length,
      merged: mergedData.length,
      conflicts: localData.filter(l => remoteData.some(r => r.id === l.id)).length
    });

    return mergedData;
  }

  // Queue operations for offline handling
  private queueOperation(
    type: 'activity' | 'escalation' | 'analytics',
    operation: 'create' | 'update' | 'delete',
    data: any
  ): void {
    const queuedOperation = {
      id: `${type}_${operation}_${Date.now()}_${Math.random()}`,
      type,
      operation,
      data,
      timestamp: new Date(),
      retryCount: 0
    };

    this.pendingOperations.push(queuedOperation);
    
    this.emit('operation_queued', queuedOperation);
    
    // Persist to localStorage for browser refresh resilience
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'leo_pending_operations',
          JSON.stringify(this.pendingOperations)
        );
      } catch (error) {
        console.warn('Failed to persist pending operations:', error);
      }
    }
  }

  // Process all pending operations when back online
  private async processPendingOperations(): Promise<void> {
    if (!this.isOnline || this.pendingOperations.length === 0) {
      return;
    }

    console.log(`Processing ${this.pendingOperations.length} pending operations`);

    const operationsToProcess = [...this.pendingOperations];
    this.pendingOperations = [];

    for (const operation of operationsToProcess) {
      try {
        await this.executeOperation(operation);
        
        this.emit('operation_processed', operation);
      } catch (error) {
        console.error(`Failed to process operation ${operation.id}:`, error);
        
        operation.retryCount++;
        
        if (operation.retryCount < this.MAX_RETRIES) {
          this.pendingOperations.push(operation);
          this.emit('operation_retry', operation);
        } else {
          this.emit('operation_failed', operation);
        }
      }
    }

    // Update localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'leo_pending_operations',
          JSON.stringify(this.pendingOperations)
        );
      } catch (error) {
        console.warn('Failed to update pending operations:', error);
      }
    }
  }

  // Execute a queued operation
  private async executeOperation(operation: any): Promise<void> {
    switch (operation.type) {
      case 'activity':
        if (operation.operation === 'create') {
          await FirebaseCollections.addActivity(operation.data);
        }
        break;
        
      case 'escalation':
        if (operation.operation === 'create') {
          await FirebaseCollections.addEscalation(operation.data);
        }
        break;
        
      case 'analytics':
        if (operation.operation === 'create') {
          await FirebaseCollections.addAnalyticsEvent(operation.data);
        }
        break;
        
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  // Load pending operations from localStorage on startup
  private loadPendingOperations(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = localStorage.getItem('leo_pending_operations');
      if (stored) {
        this.pendingOperations = JSON.parse(stored);
        console.log(`Loaded ${this.pendingOperations.length} pending operations from storage`);
      }
    } catch (error) {
      console.warn('Failed to load pending operations:', error);
      this.pendingOperations = [];
    }
  }

  // Start periodic sync process
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(async () => {
      if (this.isOnline && this.pendingOperations.length > 0) {
        await this.processPendingOperations();
      }
    }, this.SYNC_INTERVAL);
  }

  // Stop sync service
  async stop(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }

    // Process any remaining pending operations
    if (this.isOnline && this.pendingOperations.length > 0) {
      await this.processPendingOperations();
    }

    this.emit('stopped');
  }

  // Get sync status
  getSyncStatus(): {
    isOnline: boolean;
    pendingOperations: number;
    isInitialized: boolean;
    lastSyncAttempt?: Date;
  } {
    return {
      isOnline: this.isOnline,
      pendingOperations: this.pendingOperations.length,
      isInitialized: this.isInitialized,
      lastSyncAttempt: this.pendingOperations.length > 0 
        ? this.pendingOperations[this.pendingOperations.length - 1].timestamp
        : undefined
    };
  }

  // Force sync now
  async forcSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot force sync while offline');
    }

    await this.processPendingOperations();
    this.emit('force_sync_completed');
  }

  // Clear all pending operations (use with caution)
  clearPendingOperations(): void {
    this.pendingOperations = [];
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('leo_pending_operations');
    }
    
    this.emit('pending_operations_cleared');
  }
}

// Singleton instance
let syncService: DatabaseSyncService | null = null;

export function getSyncService(): DatabaseSyncService {
  if (!syncService) {
    syncService = new DatabaseSyncService();
  }
  return syncService;
}

export function destroySyncService(): void {
  if (syncService) {
    syncService.stop();
    syncService = null;
  }
}

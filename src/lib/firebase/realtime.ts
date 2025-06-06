import { EventEmitter } from 'events';
import { FirebaseCollections, ActivityEventDoc, EscalationEventDoc } from './collections';

// Real-time communication layer using Firebase Firestore
export class FirebaseRealtimeService extends EventEmitter {
  private isConnected = false;
  private subscriptions: Array<() => void> = [];
  private userId?: string;
  private sessionId: string;
  private heartbeatInterval?: NodeJS.Timeout;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor(sessionId: string, userId?: string) {
    super();
    this.sessionId = sessionId;
    this.userId = userId;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // Start subscriptions
      this.startActivitySubscription();
      this.startEscalationSubscription();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.isConnected = true;
      this.emit('connected');
      
      console.log('🔌 Firebase realtime service connected');
    } catch (error) {
      console.error('Failed to connect Firebase realtime service:', error);
      this.emit('error', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    // Unsubscribe from all Firebase listeners
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    this.isConnected = false;
    this.emit('disconnected');
    
    console.log('🔌 Firebase realtime service disconnected');
  }

  // Subscribe to specific event types
  subscribe<T>(eventType: string, callback: (data: T) => void): () => void {
    this.on(eventType, callback);
    
    return () => {
      this.off(eventType, callback);
    };
  }

  // Publish events (add to Firebase collections)
  async publish(eventType: string, data: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Firebase realtime service not connected');
    }

    try {
      switch (eventType) {
        case 'activity':
          await FirebaseCollections.addActivity({
            ...data,
            userId: this.userId,
            sessionId: this.sessionId
          });
          break;
          
        case 'escalation':
          await FirebaseCollections.addEscalation({
            ...data,
            userId: this.userId,
            sessionId: this.sessionId
          });
          break;
          
        case 'analytics':
          await FirebaseCollections.addAnalyticsEvent({
            ...data,
            userId: this.userId,
            sessionId: this.sessionId
          });
          break;
          
        default:
          console.warn(`Unknown event type: ${eventType}`);
      }
    } catch (error) {
      console.error(`Failed to publish ${eventType}:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  // Broadcast to all connected clients (via Firebase)
  async broadcast(eventType: string, data: any): Promise<void> {
    // Broadcasting is handled automatically by Firebase Firestore real-time listeners
    await this.publish(eventType, data);
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    return this.isConnected ? 'connected' : 'disconnected';
  }

  // Presence system
  async setPresence(status: 'online' | 'offline' | 'away'): Promise<void> {
    if (!this.userId) {
      return;
    }

    try {
      await FirebaseCollections.updateUser(this.userId, {
        lastActive: new Date() as any, // Will be converted to Timestamp by Firebase
        status
      } as any);
      
      this.emit('presence', { userId: this.userId, status });
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  }

  // Message routing with type safety
  async sendMessage(targetType: 'user' | 'session' | 'broadcast', targetId: string, message: any): Promise<void> {
    const messageData = {
      from: this.userId,
      to: targetId,
      targetType,
      message,
      timestamp: new Date(),
      sessionId: this.sessionId
    };

    await this.publish('message', messageData);
  }

  // Conflict resolution for concurrent edits
  async resolveConflict(resourceType: string, resourceId: string, conflictData: any): Promise<any> {
    // Simple last-write-wins for now
    // In a more sophisticated system, you'd implement operational transforms
    const resolution = {
      resourceType,
      resourceId,
      resolvedAt: new Date(),
      strategy: 'last_write_wins',
      data: conflictData,
      resolvedBy: this.userId
    };

    await this.publish('conflict_resolution', resolution);
    return resolution;
  }

  // Event sourcing - get audit trail
  async getEventHistory(
    resourceType: string, 
    resourceId: string, 
    limit = 100
  ): Promise<ActivityEventDoc[]> {
    return await FirebaseCollections.getActivities({
      types: [resourceType],
      limit,
      sessionId: this.sessionId
    });
  }

  // Private methods

  private startActivitySubscription(): void {
    const unsubscribe = FirebaseCollections.subscribeToActivities(
      (activities) => {
        activities.forEach(activity => {
          this.emit('activity', activity);
          this.emit(`activity:${activity.type}`, activity);
        });
      },
      {
        sessionId: this.sessionId,
        limit: 50
      }
    );

    this.subscriptions.push(unsubscribe);
  }

  private startEscalationSubscription(): void {
    const unsubscribe = FirebaseCollections.subscribeToEscalations(
      (escalations) => {
        escalations.forEach(escalation => {
          this.emit('escalation', escalation);
          this.emit(`escalation:${escalation.status}`, escalation);
        });
      },
      {
        sessionId: this.sessionId,
        limit: 20
      }
    );

    this.subscriptions.push(unsubscribe);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.setPresence('online');
        this.emit('heartbeat', { timestamp: new Date() });
      } catch (error) {
        console.error('Heartbeat failed:', error);
        this.emit('error', error);
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  // Connection recovery
  async reconnect(): Promise<void> {
    if (this.isConnected) {
      await this.disconnect();
    }
    
    // Wait a bit before reconnecting
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      await this.connect();
      this.emit('reconnected');
    } catch (error) {
      this.emit('reconnection_failed', error);
      throw error;
    }
  }

  // Auto-reconnect with exponential backoff
  private async autoReconnect(attempt = 1): Promise<void> {
    const maxAttempts = 5;
    const baseDelay = 1000;
    
    if (attempt > maxAttempts) {
      this.emit('reconnection_exhausted');
      return;
    }

    const delay = baseDelay * Math.pow(2, attempt - 1);
    
    setTimeout(async () => {
      try {
        await this.reconnect();
      } catch (error) {
        console.error(`Reconnection attempt ${attempt} failed:`, error);
        await this.autoReconnect(attempt + 1);
      }
    }, delay);
  }

  // Handle connection errors
  private handleConnectionError(error: any): void {
    console.error('Firebase realtime connection error:', error);
    this.emit('connection_error', error);
    
    if (this.isConnected) {
      this.isConnected = false;
      this.emit('disconnected');
      
      // Start auto-reconnect
      this.autoReconnect();
    }
  }
}

// Singleton instance for the application
let realtimeService: FirebaseRealtimeService | null = null;

export function getRealtimeService(sessionId: string, userId?: string): FirebaseRealtimeService {
  if (!realtimeService) {
    realtimeService = new FirebaseRealtimeService(sessionId, userId);
  }
  return realtimeService;
}

export function destroyRealtimeService(): void {
  if (realtimeService) {
    realtimeService.disconnect();
    realtimeService = null;
  }
}

// Type-safe event interfaces
export interface RealtimeEvents {
  connected: () => void;
  disconnected: () => void;
  reconnected: () => void;
  reconnection_failed: (error: any) => void;
  reconnection_exhausted: () => void;
  error: (error: any) => void;
  connection_error: (error: any) => void;
  heartbeat: (data: { timestamp: Date }) => void;
  presence: (data: { userId: string; status: string }) => void;
  activity: (activity: ActivityEventDoc) => void;
  escalation: (escalation: EscalationEventDoc) => void;
  message: (message: any) => void;
  conflict_resolution: (resolution: any) => void;
}

// Helper for typed event listening
export function createTypedRealtimeService(sessionId: string, userId?: string) {
  const service = getRealtimeService(sessionId, userId);
  
  return {
    service,
    on: <K extends keyof RealtimeEvents>(
      event: K, 
      listener: RealtimeEvents[K]
    ) => service.on(event, listener),
    
    off: <K extends keyof RealtimeEvents>(
      event: K, 
      listener: RealtimeEvents[K]
    ) => service.off(event, listener),
    
    once: <K extends keyof RealtimeEvents>(
      event: K, 
      listener: RealtimeEvents[K]
    ) => service.once(event, listener)
  };
}

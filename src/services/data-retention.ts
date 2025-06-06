import { EventEmitter } from 'events';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit as limitQuery,
  getDocs, 
  deleteDoc, 
  doc, 
  addDoc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FirebaseCollections, COLLECTIONS } from '../lib/firebase/collections';

export interface RetentionPolicy {
  collection: string;
  retentionDays: number;
  notificationDays: number; // Days before deletion to notify users
  batchSize: number;
  enabled: boolean;
}

export interface RetentionStats {
  collection: string;
  totalDocuments: number;
  expiredDocuments: number;
  deletedDocuments: number;
  lastCleanup: Date;
  nextCleanup: Date;
}

export interface UserNotification {
  userId: string;
  collection: string;
  documentsToDelete: number;
  deletionDate: Date;
  notificationSent: Date;
}

export class DataRetentionService extends EventEmitter {
  private isActive = false;
  private cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  private intervalId?: NodeJS.Timeout;
  private isRunningCleanup = false;

  // Default retention policies based on claude.md specification
  private readonly retentionPolicies: RetentionPolicy[] = [
    {
      collection: COLLECTIONS.CHAT_MESSAGES,
      retentionDays: 30, // Hard limit: 30 days for chat history
      notificationDays: 3,
      batchSize: 100,
      enabled: true
    },
    {
      collection: COLLECTIONS.CHAT_SESSIONS,
      retentionDays: 30,
      notificationDays: 3,
      batchSize: 100,
      enabled: true
    },
    {
      collection: COLLECTIONS.SESSIONS,
      retentionDays: 90, // Session data: 90 days
      notificationDays: 7,
      batchSize: 100,
      enabled: true
    },
    {
      collection: COLLECTIONS.ACTIVITIES,
      retentionDays: 60, // Activity events: 60 days
      notificationDays: 7,
      batchSize: 500,
      enabled: true
    },
    {
      collection: COLLECTIONS.ESCALATIONS,
      retentionDays: 180, // Keep escalations longer for analysis
      notificationDays: 14,
      batchSize: 100,
      enabled: true
    },
    {
      collection: COLLECTIONS.ANALYTICS,
      retentionDays: 365, // Analytics data: 1 year
      notificationDays: 30,
      batchSize: 1000,
      enabled: true
    }
  ];

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    console.log('[Data Retention] Initializing data retention service...');
    this.isActive = true;
    
    // Start periodic cleanup job
    await this.startPeriodicCleanup();
    
    // Run initial cleanup check
    setTimeout(() => {
      this.runCleanupJob();
    }, 60000); // Wait 1 minute after startup
  }

  async cleanup(): Promise<void> {
    console.log('[Data Retention] Cleaning up data retention service...');
    this.isActive = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private startPeriodicCleanup(): void {
    console.log('[Data Retention] Starting periodic cleanup job (24h interval)');
    
    this.intervalId = setInterval(async () => {
      if (this.isActive && !this.isRunningCleanup) {
        await this.runCleanupJob();
      }
    }, this.cleanupInterval);
  }

  async runCleanupJob(): Promise<RetentionStats[]> {
    if (this.isRunningCleanup) {
      console.log('[Data Retention] Cleanup already running, skipping...');
      return [];
    }

    this.isRunningCleanup = true;
    const stats: RetentionStats[] = [];

    try {
      console.log('[Data Retention] Starting scheduled cleanup job...');
      
      for (const policy of this.retentionPolicies) {
        if (!policy.enabled) {
          console.log(`[Data Retention] Skipping disabled policy for ${policy.collection}`);
          continue;
        }

        try {
          // Send notifications first
          await this.sendExpirationNotifications(policy);
          
          // Then perform cleanup
          const policyStats = await this.cleanupCollection(policy);
          stats.push(policyStats);
          
          // Small delay between collections to avoid overwhelming Firebase
          await this.delay(1000);
        } catch (error) {
          console.error(`[Data Retention] Error processing policy for ${policy.collection}:`, error);
        }
      }

      console.log('[Data Retention] Cleanup job completed successfully');
      this.emit('cleanup-completed', stats);
      
    } catch (error) {
      console.error('[Data Retention] Error during cleanup job:', error);
      this.emit('cleanup-error', error);
    } finally {
      this.isRunningCleanup = false;
    }

    return stats;
  }

  private async cleanupCollection(policy: RetentionPolicy): Promise<RetentionStats> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    console.log(`[Data Retention] Cleaning up ${policy.collection} (${policy.retentionDays} day retention)`);

    const stats: RetentionStats = {
      collection: policy.collection,
      totalDocuments: 0,
      expiredDocuments: 0,
      deletedDocuments: 0,
      lastCleanup: new Date(),
      nextCleanup: new Date(Date.now() + this.cleanupInterval)
    };

    try {
      // Query for expired documents
      const collectionRef = collection(db, policy.collection);
      const expiredQuery = query(
        collectionRef,
        where('timestamp', '<', Timestamp.fromDate(cutoffDate)),
        orderBy('timestamp', 'asc'),
        limitQuery(policy.batchSize)
      );

      let hasMore = true;
      let totalDeleted = 0;

      while (hasMore && this.isActive) {
        const snapshot = await getDocs(expiredQuery);
        
        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        stats.expiredDocuments += snapshot.size;

        // Use batch delete for efficiency
        const batch = writeBatch(db);
        const documentsToDelete: string[] = [];

        for (const docSnapshot of snapshot.docs) {
          batch.delete(doc(db, policy.collection, docSnapshot.id));
          documentsToDelete.push(docSnapshot.id);
        }

        try {
          await batch.commit();
          totalDeleted += documentsToDelete.length;
          stats.deletedDocuments = totalDeleted;

          console.log(`[Data Retention] Deleted ${documentsToDelete.length} documents from ${policy.collection}`);

          // If we got less than the batch size, we're done
          if (snapshot.size < policy.batchSize) {
            hasMore = false;
          }

          // Small delay between batches
          await this.delay(500);
        } catch (error) {
          console.error(`[Data Retention] Error deleting batch from ${policy.collection}:`, error);
          break;
        }
      }

      if (totalDeleted > 0) {
        console.log(`[Data Retention] ✅ Successfully deleted ${totalDeleted} expired documents from ${policy.collection}`);
      }

    } catch (error) {
      console.error(`[Data Retention] Error cleaning up ${policy.collection}:`, error);
    }

    return stats;
  }

  private async sendExpirationNotifications(policy: RetentionPolicy): Promise<void> {
    const notificationDate = new Date();
    notificationDate.setDate(notificationDate.getDate() - (policy.retentionDays - policy.notificationDays));

    try {
      // Query for documents that will expire soon
      const collectionRef = collection(db, policy.collection);
      const expiringQuery = query(
        collectionRef,
        where('timestamp', '<', Timestamp.fromDate(notificationDate)),
        where('timestamp', '>=', Timestamp.fromDate(new Date(notificationDate.getTime() - 24 * 60 * 60 * 1000))), // Last 24 hours
        limitQuery(100)
      );

      const snapshot = await getDocs(expiringQuery);
      
      if (snapshot.empty) {
        return;
      }

      // Group by userId for batch notifications
      const userGroups = new Map<string, number>();
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const userId = data.userId || 'unknown';
        userGroups.set(userId, (userGroups.get(userId) || 0) + 1);
      }

      // Send notifications to affected users
      for (const [userId, count] of userGroups) {
        await this.sendUserNotification({
          userId,
          collection: policy.collection,
          documentsToDelete: count,
          deletionDate: new Date(Date.now() + policy.notificationDays * 24 * 60 * 60 * 1000),
          notificationSent: new Date()
        });
      }

      if (userGroups.size > 0) {
        console.log(`[Data Retention] 📧 Sent expiration notifications to ${userGroups.size} users for ${policy.collection}`);
      }

    } catch (error) {
      console.error(`[Data Retention] Error sending notifications for ${policy.collection}:`, error);
    }
  }

  private async sendUserNotification(notification: UserNotification): Promise<void> {
    try {
      // Store notification in database
      await addDoc(collection(db, 'user_notifications'), {
        ...notification,
        type: 'data_retention_warning',
        read: false,
        timestamp: Timestamp.now()
      });

      // Emit event for external notification systems
      this.emit('user-notification', notification);

      console.log(`[Data Retention] 📩 Notification sent to user ${notification.userId}: ${notification.documentsToDelete} documents in ${notification.collection} will be deleted on ${notification.deletionDate.toDateString()}`);

    } catch (error) {
      console.error('[Data Retention] Error sending user notification:', error);
    }
  }

  async getRetentionStats(): Promise<RetentionStats[]> {
    const stats: RetentionStats[] = [];

    for (const policy of this.retentionPolicies) {
      if (!policy.enabled) continue;

      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

        const collectionRef = collection(db, policy.collection);
        
        // Count total documents
        const totalQuery = query(collectionRef, limitQuery(1000));
        const totalSnapshot = await getDocs(totalQuery);
        
        // Count expired documents
        const expiredQuery = query(
          collectionRef,
          where('timestamp', '<', Timestamp.fromDate(cutoffDate)),
          limitQuery(1000)
        );
        const expiredSnapshot = await getDocs(expiredQuery);

        stats.push({
          collection: policy.collection,
          totalDocuments: totalSnapshot.size,
          expiredDocuments: expiredSnapshot.size,
          deletedDocuments: 0, // Would need separate tracking
          lastCleanup: new Date(), // Would come from metadata
          nextCleanup: new Date(Date.now() + this.cleanupInterval)
        });

      } catch (error) {
        console.error(`[Data Retention] Error getting stats for ${policy.collection}:`, error);
      }
    }

    return stats;
  }

  async getRetentionPolicies(): Promise<RetentionPolicy[]> {
    return [...this.retentionPolicies];
  }

  async updateRetentionPolicy(collection: string, updates: Partial<RetentionPolicy>): Promise<boolean> {
    try {
      const policyIndex = this.retentionPolicies.findIndex(p => p.collection === collection);
      
      if (policyIndex === -1) {
        console.error(`[Data Retention] Policy not found for collection: ${collection}`);
        return false;
      }

      this.retentionPolicies[policyIndex] = {
        ...this.retentionPolicies[policyIndex],
        ...updates
      };

      console.log(`[Data Retention] Updated retention policy for ${collection}`);
      this.emit('policy-updated', { collection, policy: this.retentionPolicies[policyIndex] });
      
      return true;
    } catch (error) {
      console.error(`[Data Retention] Error updating policy for ${collection}:`, error);
      return false;
    }
  }

  async manualCleanup(collection?: string): Promise<RetentionStats[]> {
    if (this.isRunningCleanup) {
      throw new Error('Cleanup already in progress');
    }

    console.log(`[Data Retention] Manual cleanup triggered${collection ? ` for ${collection}` : ''}`);

    if (collection) {
      const policy = this.retentionPolicies.find(p => p.collection === collection);
      if (!policy) {
        throw new Error(`No retention policy found for collection: ${collection}`);
      }
      
      this.isRunningCleanup = true;
      try {
        const stats = await this.cleanupCollection(policy);
        return [stats];
      } finally {
        this.isRunningCleanup = false;
      }
    } else {
      return await this.runCleanupJob();
    }
  }

  async getUserRetentionInfo(userId: string): Promise<{
    upcomingDeletions: Array<{
      collection: string;
      documentCount: number;
      deletionDate: Date;
    }>;
  }> {
    const upcomingDeletions = [];

    for (const policy of this.retentionPolicies) {
      if (!policy.enabled) continue;

      try {
        const notificationDate = new Date();
        notificationDate.setDate(notificationDate.getDate() - (policy.retentionDays - policy.notificationDays));

        const collectionRef = collection(db, policy.collection);
        const userQuery = query(
          collectionRef,
          where('userId', '==', userId),
          where('timestamp', '<', Timestamp.fromDate(notificationDate)),
          limitQuery(100)
        );

        const snapshot = await getDocs(userQuery);
        
        if (!snapshot.empty) {
          upcomingDeletions.push({
            collection: policy.collection,
            documentCount: snapshot.size,
            deletionDate: new Date(Date.now() + policy.notificationDays * 24 * 60 * 60 * 1000)
          });
        }

      } catch (error) {
        console.error(`[Data Retention] Error checking user retention info for ${policy.collection}:`, error);
      }
    }

    return { upcomingDeletions };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  isCleanupRunning(): boolean {
    return this.isRunningCleanup;
  }

  getNextCleanupTime(): Date {
    return new Date(Date.now() + this.cleanupInterval);
  }

  // Emergency stop for cleanup operations
  emergencyStop(): void {
    console.log('[Data Retention] 🚨 Emergency stop triggered');
    this.isRunningCleanup = false;
    this.isActive = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.emit('emergency-stop');
  }
}
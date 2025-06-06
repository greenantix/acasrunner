import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './config';

export interface FirebaseActivityEvent {
  id?: string;
  timestamp: Timestamp | Date;
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
  userId?: string;
  sessionId?: string;
}

export class FirebaseActivityService {
  private unsubscribeCallbacks: (() => void)[] = [];

  // Add a new activity to Firestore
  async addActivity(activity: Omit<FirebaseActivityEvent, 'id'>): Promise<string> {
    try {
      const activityData = {
        ...activity,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'activities'), activityData);
      console.log('Activity added to Firestore:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding activity to Firestore:', error);
      throw error;
    }
  }

  // Subscribe to real-time activity updates
  subscribeToActivities(
    callback: (activities: FirebaseActivityEvent[]) => void,
    options: {
      limit?: number;
      userId?: string;
      sessionId?: string;
      types?: string[];
      severity?: string[];
    } = {}
  ): () => void {
    try {
      const constraints: QueryConstraint[] = [
        orderBy('timestamp', 'desc'),
        limit(options.limit || 50)
      ];

      // Add filters based on options
      if (options.userId) {
        constraints.push(where('userId', '==', options.userId));
      }

      if (options.sessionId) {
        constraints.push(where('sessionId', '==', options.sessionId));
      }

      if (options.types && options.types.length > 0) {
        constraints.push(where('type', 'in', options.types));
      }

      if (options.severity && options.severity.length > 0) {
        constraints.push(where('details.severity', 'in', options.severity));
      }

      const q = query(collection(db, 'activities'), ...constraints);

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const activities: FirebaseActivityEvent[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            activities.push({
              id: doc.id,
              ...data,
              timestamp: data.timestamp || new Date(),
            } as FirebaseActivityEvent);
          });

          callback(activities);
        },
        (error) => {
          console.error('Error subscribing to activities:', error);
        }
      );

      this.unsubscribeCallbacks.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up activity subscription:', error);
      return () => {};
    }
  }

  // Subscribe to activities from the last N minutes
  subscribeToRecentActivities(
    callback: (activities: FirebaseActivityEvent[]) => void,
    minutesBack: number = 30
  ): () => void {
    const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000);

    const q = query(
      collection(db, 'activities'),
      where('timestamp', '>=', Timestamp.fromDate(cutoffTime)),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const activities: FirebaseActivityEvent[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as FirebaseActivityEvent);
      });

      callback(activities);
    });

    this.unsubscribeCallbacks.push(unsubscribe);
    return unsubscribe;
  }

  // Update activity status
  async updateActivity(
    id: string, 
    updates: Partial<FirebaseActivityEvent>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'activities', id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  }

  // Delete an activity
  async deleteActivity(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'activities', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  }

  // Clean up all subscriptions
  unsubscribeAll(): void {
    this.unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    this.unsubscribeCallbacks = [];
  }

  // Batch add multiple activities (useful for initial sync)
  async batchAddActivities(activities: Omit<FirebaseActivityEvent, 'id'>[]): Promise<void> {
    try {
      const promises = activities.map(activity => this.addActivity(activity));
      await Promise.all(promises);
      console.log(`Successfully added ${activities.length} activities to Firestore`);
    } catch (error) {
      console.error('Error batch adding activities:', error);
      throw error;
    }
  }

  // Get activity statistics
  subscribeToActivityStats(
    callback: (stats: {
      total: number;
      byType: Record<string, number>;
      bySeverity: Record<string, number>;
      recentErrors: number;
    }) => void,
    timeWindowMinutes: number = 60
  ): () => void {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    const q = query(
      collection(db, 'activities'),
      where('timestamp', '>=', Timestamp.fromDate(cutoffTime)),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const stats = {
        total: querySnapshot.size,
        byType: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        recentErrors: 0
      };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Count by type
        stats.byType[data.type] = (stats.byType[data.type] || 0) + 1;
        
        // Count by severity
        const severity = data.details?.severity || 'unknown';
        stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
        
        // Count recent errors
        if (data.type === 'error') {
          stats.recentErrors++;
        }
      });

      callback(stats);
    });

    this.unsubscribeCallbacks.push(unsubscribe);
    return unsubscribe;
  }
}

// Export singleton instance
export const firebaseActivityService = new FirebaseActivityService();

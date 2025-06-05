import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
  DocumentReference 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export class DatabaseService {
  private static instance: DatabaseService;

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // Chat Sessions
  async createChatSession(sessionData: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'chat_sessions'), {
        ...sessionData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  async getChatSession(sessionId: string): Promise<any> {
    try {
      const docRef = doc(db, 'chat_sessions', sessionId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Chat session not found');
      }
    } catch (error) {
      console.error('Error getting chat session:', error);
      throw error;
    }
  }

  async updateChatSession(sessionId: string, updates: any): Promise<void> {
    try {
      const docRef = doc(db, 'chat_sessions', sessionId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating chat session:', error);
      throw error;
    }
  }

  async getChatSessions(userId?: string, limitCount: number = 50): Promise<any[]> {
    try {
      let q = query(
        collection(db, 'chat_sessions'),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      if (userId) {
        q = query(
          collection(db, 'chat_sessions'),
          where('userId', '==', userId),
          orderBy('updatedAt', 'desc'),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting chat sessions:', error);
      throw error;
    }
  }

  // Chat Messages
  async addChatMessage(sessionId: string, messageData: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'chat_messages'), {
        ...messageData,
        sessionId,
        createdAt: Timestamp.now()
      });
      
      // Update session's last activity
      await this.updateChatSession(sessionId, {
        lastMessageAt: Timestamp.now(),
        messageCount: (messageData.messageCount || 0) + 1
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding chat message:', error);
      throw error;
    }
  }

  async getChatMessages(sessionId: string, limitCount: number = 100): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'chat_messages'),
        where('sessionId', '==', sessionId),
        orderBy('createdAt', 'asc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting chat messages:', error);
      throw error;
    }
  }

  // Activity Logs
  async logActivity(activityData: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'activities'), {
        ...activityData,
        timestamp: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }

  async getActivities(filters: any = {}, limitCount: number = 100): Promise<any[]> {
    try {
      let q = query(
        collection(db, 'activities'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      if (filters.type) {
        q = query(
          collection(db, 'activities'),
          where('type', '==', filters.type),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
      }

      if (filters.source) {
        q = query(
          collection(db, 'activities'),
          where('source', '==', filters.source),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting activities:', error);
      throw error;
    }
  }

  // Escalations
  async createEscalation(escalationData: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'escalations'), {
        ...escalationData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating escalation:', error);
      throw error;
    }
  }

  async updateEscalation(escalationId: string, updates: any): Promise<void> {
    try {
      const docRef = doc(db, 'escalations', escalationId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating escalation:', error);
      throw error;
    }
  }

  async getEscalations(status?: string, limitCount: number = 50): Promise<any[]> {
    try {
      let q = query(
        collection(db, 'escalations'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (status) {
        q = query(
          collection(db, 'escalations'),
          where('status', '==', status),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting escalations:', error);
      throw error;
    }
  }

  // Workflows
  async createWorkflow(workflowData: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'workflows'), {
        ...workflowData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating workflow:', error);
      throw error;
    }
  }

  async getWorkflows(userId?: string): Promise<any[]> {
    try {
      let q = query(
        collection(db, 'workflows'),
        orderBy('updatedAt', 'desc')
      );

      if (userId) {
        q = query(
          collection(db, 'workflows'),
          where('userId', '==', userId),
          orderBy('updatedAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting workflows:', error);
      throw error;
    }
  }

  async createWorkflowExecution(executionData: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'workflow_executions'), {
        ...executionData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating workflow execution:', error);
      throw error;
    }
  }

  async updateWorkflowExecution(executionId: string, updates: any): Promise<void> {
    try {
      const docRef = doc(db, 'workflow_executions', executionId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating workflow execution:', error);
      throw error;
    }
  }

  // Analytics Data
  async saveAnalyticsData(analyticsData: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'analytics'), {
        ...analyticsData,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving analytics data:', error);
      throw error;
    }
  }

  async getAnalyticsData(dateRange: { start: Date; end: Date }): Promise<any[]> {
    try {
      const q = query(
        collection(db, 'analytics'),
        where('createdAt', '>=', Timestamp.fromDate(dateRange.start)),
        where('createdAt', '<=', Timestamp.fromDate(dateRange.end)),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting analytics data:', error);
      throw error;
    }
  }

  // Real-time subscriptions
  subscribeToChatMessages(sessionId: string, callback: (messages: any[]) => void): () => void {
    const q = query(
      collection(db, 'chat_messages'),
      where('sessionId', '==', sessionId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const messages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(messages);
    });
  }

  subscribeToActivities(callback: (activities: any[]) => void): () => void {
    const q = query(
      collection(db, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (querySnapshot) => {
      const activities = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(activities);
    });
  }

  // Health check
  async testConnection(): Promise<boolean> {
    try {
      // Try to read from a test collection
      const testQuery = query(collection(db, 'chat_sessions'), limit(1));
      await getDocs(testQuery);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}
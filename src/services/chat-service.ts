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
  startAfter,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ChatSession, 
  ChatMessage, 
  ChatSettings, 
  ChatAttachment, 
  SessionFilters,
  ChatSessionSummary,
  ChatMetrics,
  ChatStreamEvent,
  StreamingResponse
} from '@/types/chat';

export class ChatService {
  private readonly SESSIONS_COLLECTION = 'chat_sessions';
  private readonly MESSAGES_COLLECTION = 'chat_messages';
  private readonly ATTACHMENTS_COLLECTION = 'chat_attachments';

  // Session Management
  async createSession(
    provider: string, 
    model: string,
    name?: string,
    settings?: Partial<ChatSettings>
  ): Promise<ChatSession> {
    const defaultSettings: ChatSettings = {
      temperature: 0.7,
      maxTokens: 4000,
      autoContext: true,
      contextWindow: 10,
      ...settings
    };

    const sessionData = {
      name: name || `Chat ${new Date().toLocaleDateString()}`,
      provider,
      model,
      settings: defaultSettings,
      messages: [],
      metadata: {
        messageCount: 0,
        totalTokens: 0,
        tags: [],
        starred: false,
        archived: false
      },
      created: serverTimestamp(),
      lastUpdated: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, this.SESSIONS_COLLECTION), sessionData);
    
    return {
      id: docRef.id,
      ...sessionData,
      created: new Date(),
      lastUpdated: new Date()
    } as ChatSession;
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const docRef = doc(db, this.SESSIONS_COLLECTION, sessionId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        created: data.created?.toDate() || new Date(),
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      } as ChatSession;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<void> {
    try {
      const docRef = doc(db, this.SESSIONS_COLLECTION, sessionId);
      const updateData = {
        ...updates,
        lastUpdated: serverTimestamp()
      };
      
      // Remove computed fields
      delete updateData.id;
      delete updateData.created;
      delete updateData.messages;
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      // Delete all messages first
      const messagesQuery = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('sessionId', '==', sessionId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Delete the session
      const sessionRef = doc(db, this.SESSIONS_COLLECTION, sessionId);
      await deleteDoc(sessionRef);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  async listSessions(filters?: SessionFilters): Promise<ChatSessionSummary[]> {
    try {
      let q = query(
        collection(db, this.SESSIONS_COLLECTION),
        orderBy('lastUpdated', 'desc')
      );

      if (filters?.provider) {
        q = query(q, where('provider', '==', filters.provider));
      }

      if (filters?.archived !== undefined) {
        q = query(q, where('metadata.archived', '==', filters.archived));
      }

      if (filters?.starred !== undefined) {
        q = query(q, where('metadata.starred', '==', filters.starred));
      }

      const snapshot = await getDocs(q);
      const sessions: ChatSessionSummary[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Get last message
        const messagesQuery = query(
          collection(db, this.MESSAGES_COLLECTION),
          where('sessionId', '==', doc.id),
          orderBy('timestamp', 'desc'),
          limit(1)
        );
        const lastMessageSnap = await getDocs(messagesQuery);
        const lastMessage = lastMessageSnap.docs[0]?.data()?.content || 'No messages';

        sessions.push({
          id: doc.id,
          name: data.name,
          lastMessage: lastMessage.slice(0, 100) + (lastMessage.length > 100 ? '...' : ''),
          lastUpdated: data.lastUpdated?.toDate() || new Date(),
          messageCount: data.metadata?.messageCount || 0,
          provider: data.provider,
          starred: data.metadata?.starred || false,
          archived: data.metadata?.archived || false
        });
      }

      return sessions;
    } catch (error) {
      console.error('Error listing sessions:', error);
      return [];
    }
  }

  // Message Management
  async sendMessage(
    sessionId: string, 
    content: string, 
    role: 'user' | 'assistant' | 'system' = 'user',
    attachments?: ChatAttachment[]
  ): Promise<ChatMessage> {
    try {
      const messageData = {
        sessionId,
        role,
        content,
        timestamp: serverTimestamp(),
        metadata: {
          attachments: attachments || [],
          reactions: [],
          edits: []
        },
        context: {}
      };

      const docRef = await addDoc(collection(db, this.MESSAGES_COLLECTION), messageData);
      
      // Update session message count
      const sessionRef = doc(db, this.SESSIONS_COLLECTION, sessionId);
      await updateDoc(sessionRef, {
        'metadata.messageCount': (await this.getMessageCount(sessionId)),
        lastUpdated: serverTimestamp()
      });

      return {
        id: docRef.id,
        ...messageData,
        timestamp: new Date()
      } as ChatMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async getMessages(sessionId: string, limit?: number): Promise<ChatMessage[]> {
    try {
      let q = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('sessionId', '==', sessionId),
        orderBy('timestamp', 'asc')
      );

      if (limit) {
        q = query(q, limit(limit));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as ChatMessage));
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  async editMessage(messageId: string, newContent: string): Promise<void> {
    try {
      const messageRef = doc(db, this.MESSAGES_COLLECTION, messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const originalContent = messageDoc.data().content;
      const editRecord = {
        id: Date.now().toString(),
        userId: 'current_user', // TODO: Get from auth
        originalContent,
        newContent,
        timestamp: new Date(),
        reason: 'User edit'
      };

      await updateDoc(messageRef, {
        content: newContent,
        'metadata.edits': [...(messageDoc.data().metadata?.edits || []), editRecord]
      });
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      const messageRef = doc(db, this.MESSAGES_COLLECTION, messageId);
      await deleteDoc(messageRef);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Session Operations
  async branchSession(sessionId: string, fromMessageId?: string): Promise<ChatSession> {
    try {
      const originalSession = await this.getSession(sessionId);
      if (!originalSession) {
        throw new Error('Original session not found');
      }

      const messages = await this.getMessages(sessionId);
      let branchMessages = messages;

      if (fromMessageId) {
        const messageIndex = messages.findIndex(m => m.id === fromMessageId);
        if (messageIndex !== -1) {
          branchMessages = messages.slice(0, messageIndex + 1);
        }
      }

      // Create new session
      const newSession = await this.createSession(
        originalSession.provider,
        originalSession.model,
        `${originalSession.name} (Branch)`,
        originalSession.settings
      );

      // Copy messages to new session
      for (const message of branchMessages) {
        await this.sendMessage(
          newSession.id,
          message.content,
          message.role,
          message.metadata.attachments
        );
      }

      // Update new session to reference parent
      await this.updateSession(newSession.id, {
        parentSessionId: sessionId
      });

      return newSession;
    } catch (error) {
      console.error('Error branching session:', error);
      throw error;
    }
  }

  async duplicateSession(sessionId: string): Promise<ChatSession> {
    try {
      const originalSession = await this.getSession(sessionId);
      if (!originalSession) {
        throw new Error('Original session not found');
      }

      const messages = await this.getMessages(sessionId);

      // Create new session
      const newSession = await this.createSession(
        originalSession.provider,
        originalSession.model,
        `${originalSession.name} (Copy)`,
        originalSession.settings
      );

      // Copy all messages
      for (const message of messages) {
        await this.sendMessage(
          newSession.id,
          message.content,
          message.role,
          message.metadata.attachments
        );
      }

      return newSession;
    } catch (error) {
      console.error('Error duplicating session:', error);
      throw error;
    }
  }

  async clearMessages(sessionId: string): Promise<void> {
    try {
      const messagesQuery = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('sessionId', '==', sessionId)
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const deletePromises = messagesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Update session message count
      await this.updateSession(sessionId, {
        metadata: {
          messageCount: 0,
          totalTokens: 0,
          tags: [],
          starred: false,
          archived: false
        }
      });
    } catch (error) {
      console.error('Error clearing messages:', error);
      throw error;
    }
  }

  // Utility Methods
  private async getMessageCount(sessionId: string): Promise<number> {
    try {
      const messagesQuery = query(
        collection(db, this.MESSAGES_COLLECTION),
        where('sessionId', '==', sessionId)
      );
      const snapshot = await getDocs(messagesQuery);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting message count:', error);
      return 0;
    }
  }

  // Real-time subscriptions
  subscribeToSession(sessionId: string, callback: (session: ChatSession | null) => void) {
    const sessionRef = doc(db, this.SESSIONS_COLLECTION, sessionId);
    return onSnapshot(sessionRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          id: doc.id,
          ...data,
          created: data.created?.toDate() || new Date(),
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        } as ChatSession);
      } else {
        callback(null);
      }
    });
  }

  subscribeToMessages(sessionId: string, callback: (messages: ChatMessage[]) => void) {
    const messagesQuery = query(
      collection(db, this.MESSAGES_COLLECTION),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as ChatMessage));
      callback(messages);
    });
  }

  // Search functionality
  async searchMessages(query: string, sessionId?: string): Promise<ChatMessage[]> {
    try {
      let q = collection(db, this.MESSAGES_COLLECTION);
      
      if (sessionId) {
        q = query(q, where('sessionId', '==', sessionId)) as any;
      }

      const snapshot = await getDocs(q);
      const allMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as ChatMessage));

      // Client-side text search (for now)
      return allMessages.filter(message => 
        message.content.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }

  // Analytics
  async getMetrics(): Promise<ChatMetrics> {
    try {
      const sessionsSnapshot = await getDocs(collection(db, this.SESSIONS_COLLECTION));
      const messagesSnapshot = await getDocs(collection(db, this.MESSAGES_COLLECTION));

      const sessions = sessionsSnapshot.docs.map(doc => doc.data());
      const messages = messagesSnapshot.docs.map(doc => doc.data());

      const totalTokens = sessions.reduce((sum, session) => 
        sum + (session.metadata?.totalTokens || 0), 0
      );

      const providerCount = sessions.reduce((acc, session) => {
        acc[session.provider] = (acc[session.provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostUsedProvider = Object.entries(providerCount)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

      return {
        totalSessions: sessions.length,
        totalMessages: messages.length,
        totalTokens,
        averageSessionLength: sessions.length > 0 ? messages.length / sessions.length : 0,
        mostUsedProvider,
        dailyUsage: [], // TODO: Implement daily usage calculation
        providerUsage: Object.entries(providerCount).map(([provider, count]) => ({
          provider,
          sessions: count,
          messages: messages.filter(m => sessions.find(s => s.provider === provider && s.id === m.sessionId)).length,
          tokens: 0 // TODO: Calculate token usage per provider
        }))
      };
    } catch (error) {
      console.error('Error getting metrics:', error);
      return {
        totalSessions: 0,
        totalMessages: 0,
        totalTokens: 0,
        averageSessionLength: 0,
        mostUsedProvider: 'none',
        dailyUsage: [],
        providerUsage: []
      };
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();
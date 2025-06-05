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
  limit as limitQuery,
  startAfter,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  DocumentData,
  Query,
  DocumentReference
} from 'firebase/firestore';
import { db } from '../firebase';

// Collection names
export const COLLECTIONS = {
  ACTIVITIES: 'activities',
  ESCALATIONS: 'escalations', 
  WORKFLOWS: 'workflows',
  PLUGINS: 'plugins',
  USERS: 'users',
  SESSIONS: 'sessions',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
  CHAT_SESSIONS: 'chat_sessions',
  CHAT_MESSAGES: 'chat_messages'
} as const;

// Activity Events Collection
export interface ActivityEventDoc {
  id: string;
  timestamp: Timestamp;
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
  sessionId: string;
}

// Escalation Events Collection  
export interface EscalationEventDoc {
  id: string;
  activityEventId: string;
  timestamp: Timestamp;
  problemType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  provider: string;
  context: any;
  aiResponse?: string;
  suggestions: string[];
  status: 'pending' | 'resolved' | 'escalated_to_human' | 'ignored';
  humanFeedback?: string;
  resolutionTime?: Timestamp;
  confidence: number;
  userId?: string;
  sessionId: string;
}

// Workflow Definitions Collection
export interface WorkflowDoc {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  steps: any[]; // WorkflowStep[]
  triggers: any[]; // WorkflowTrigger[]
  variables: any[]; // WorkflowVariable[]
  settings: any; // WorkflowSettings
  tags: string[];
  executionCount: number;
  successRate: number;
}

// Plugin Manifests Collection
export interface PluginDoc {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  icon?: string;
  main: string;
  permissions: any[]; // PluginPermission[]
  dependencies?: string[];
  engines?: {
    node?: string;
    acas?: string;
  };
  keywords?: string[];
  repository?: {
    type: string;
    url: string;
  };
  license?: string;
  status: 'installed' | 'enabled' | 'disabled' | 'error';
  installedAt: Timestamp;
  enabledAt?: Timestamp;
  config?: any;
  error?: string;
  userId: string;
}

// User Profiles Collection
export interface UserDoc {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastActive: Timestamp;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    aiProvider: string;
    workspaceSettings: any;
  };
  workspaces: string[];
  role: 'user' | 'admin' | 'developer';
}

// User Sessions Collection
export interface SessionDoc {
  id: string;
  userId: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  duration?: number;
  activities: number;
  escalations: number;
  workflowExecutions: number;
  status: 'active' | 'ended';
  metadata: Record<string, any>;
}

// Analytics Events Collection
export interface AnalyticsEventDoc {
  id: string;
  eventType: string;
  timestamp: Timestamp;
  userId?: string;
  sessionId: string;
  data: Record<string, any>;
  category: string;
  action: string;
  label?: string;
  value?: number;
}

// System Settings Collection
export interface SettingsDoc {
  id: string;
  category: string;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  isSystem: boolean;
  updatedAt: Timestamp;
  updatedBy: string;
}

// Collection utilities
export class FirebaseCollections {
  
  // Activities
  static getActivitiesCollection() {
    return collection(db, COLLECTIONS.ACTIVITIES);
  }

  static async addActivity(activity: Omit<ActivityEventDoc, 'id' | 'timestamp'>): Promise<string> {
    const docRef = await addDoc(this.getActivitiesCollection(), {
      ...activity,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  }

  static async getActivities(filters?: {
    types?: string[];
    severity?: string[];
    userId?: string;
    sessionId?: string;
    limit?: number;
    startAfter?: DocumentData;
  }): Promise<ActivityEventDoc[]> {
    let q: Query = this.getActivitiesCollection();

    if (filters?.types && filters.types.length > 0) {
      q = query(q, where('type', 'in', filters.types));
    }

    if (filters?.severity && filters.severity.length > 0) {
      q = query(q, where('details.severity', 'in', filters.severity));
    }

    if (filters?.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    if (filters?.sessionId) {
      q = query(q, where('sessionId', '==', filters.sessionId));
    }

    q = query(q, orderBy('timestamp', 'desc'));

    if (filters?.limit) {
      q = query(q, limitQuery(filters.limit));
    }

    if (filters?.startAfter) {
      q = query(q, startAfter(filters.startAfter));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ActivityEventDoc[];
  }

  // Escalations
  static getEscalationsCollection() {
    return collection(db, COLLECTIONS.ESCALATIONS);
  }

  static async addEscalation(escalation: Omit<EscalationEventDoc, 'id' | 'timestamp'>): Promise<string> {
    const docRef = await addDoc(this.getEscalationsCollection(), {
      ...escalation,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  }

  static async getEscalations(filters?: {
    status?: string[];
    severity?: string[];
    userId?: string;
    sessionId?: string;
    limit?: number;
  }): Promise<EscalationEventDoc[]> {
    let q: Query = this.getEscalationsCollection();

    if (filters?.status && filters.status.length > 0) {
      q = query(q, where('status', 'in', filters.status));
    }

    if (filters?.severity && filters.severity.length > 0) {
      q = query(q, where('severity', 'in', filters.severity));
    }

    if (filters?.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    if (filters?.sessionId) {
      q = query(q, where('sessionId', '==', filters.sessionId));
    }

    q = query(q, orderBy('timestamp', 'desc'));

    if (filters?.limit) {
      q = query(q, limitQuery(filters.limit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EscalationEventDoc[];
  }

  static async updateEscalation(id: string, updates: Partial<EscalationEventDoc>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.ESCALATIONS, id);
    await updateDoc(docRef, updates);
  }

  // Workflows
  static getWorkflowsCollection() {
    return collection(db, COLLECTIONS.WORKFLOWS);
  }

  static async addWorkflow(workflow: Omit<WorkflowDoc, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(this.getWorkflowsCollection(), {
      ...workflow,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  static async getWorkflows(filters?: {
    status?: string[];
    createdBy?: string;
    limit?: number;
  }): Promise<WorkflowDoc[]> {
    let q: Query = this.getWorkflowsCollection();

    if (filters?.status && filters.status.length > 0) {
      q = query(q, where('status', 'in', filters.status));
    }

    if (filters?.createdBy) {
      q = query(q, where('createdBy', '==', filters.createdBy));
    }

    q = query(q, orderBy('updatedAt', 'desc'));

    if (filters?.limit) {
      q = query(q, limitQuery(filters.limit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as WorkflowDoc[];
  }

  static async updateWorkflow(id: string, updates: Partial<WorkflowDoc>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.WORKFLOWS, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  // Plugins
  static getPluginsCollection() {
    return collection(db, COLLECTIONS.PLUGINS);
  }

  static async addPlugin(plugin: Omit<PluginDoc, 'id' | 'installedAt'>): Promise<string> {
    const docRef = await addDoc(this.getPluginsCollection(), {
      ...plugin,
      installedAt: serverTimestamp()
    });
    return docRef.id;
  }

  static async getPlugins(filters?: {
    status?: string[];
    userId?: string;
    limit?: number;
  }): Promise<PluginDoc[]> {
    let q: Query = this.getPluginsCollection();

    if (filters?.status && filters.status.length > 0) {
      q = query(q, where('status', 'in', filters.status));
    }

    if (filters?.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    q = query(q, orderBy('installedAt', 'desc'));

    if (filters?.limit) {
      q = query(q, limitQuery(filters.limit));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PluginDoc[];
  }

  static async updatePlugin(id: string, updates: Partial<PluginDoc>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PLUGINS, id);
    await updateDoc(docRef, updates);
  }

  // Users
  static getUsersCollection() {
    return collection(db, COLLECTIONS.USERS);
  }

  static async getUserById(id: string): Promise<UserDoc | null> {
    const docRef = doc(db, COLLECTIONS.USERS, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as UserDoc;
    }
    
    return null;
  }

  static async createUser(user: Omit<UserDoc, 'id' | 'createdAt' | 'lastActive'>): Promise<string> {
    const docRef = await addDoc(this.getUsersCollection(), {
      ...user,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp()
    });
    return docRef.id;
  }

  static async updateUser(id: string, updates: Partial<UserDoc>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USERS, id);
    await updateDoc(docRef, {
      ...updates,
      lastActive: serverTimestamp()
    });
  }

  // Sessions
  static getSessionsCollection() {
    return collection(db, COLLECTIONS.SESSIONS);
  }

  static async createSession(session: Omit<SessionDoc, 'id' | 'startTime'>): Promise<string> {
    const docRef = await addDoc(this.getSessionsCollection(), {
      ...session,
      startTime: serverTimestamp()
    });
    return docRef.id;
  }

  static async endSession(id: string, updates: Partial<SessionDoc>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SESSIONS, id);
    await updateDoc(docRef, {
      ...updates,
      endTime: serverTimestamp(),
      status: 'ended'
    });
  }

  // Analytics
  static getAnalyticsCollection() {
    return collection(db, COLLECTIONS.ANALYTICS);
  }

  static async addAnalyticsEvent(event: Omit<AnalyticsEventDoc, 'id' | 'timestamp'>): Promise<string> {
    const docRef = await addDoc(this.getAnalyticsCollection(), {
      ...event,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  }

  // Settings
  static getSettingsCollection() {
    return collection(db, COLLECTIONS.SETTINGS);
  }

  static async getSetting(category: string, key: string): Promise<SettingsDoc | null> {
    const q = query(
      this.getSettingsCollection(),
      where('category', '==', category),
      where('key', '==', key),
      limitQuery(1)
    );
    
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as SettingsDoc;
    }
    
    return null;
  }

  static async setSetting(setting: Omit<SettingsDoc, 'id' | 'updatedAt'>): Promise<string> {
    // Check if setting already exists
    const existing = await this.getSetting(setting.category, setting.key);
    
    if (existing) {
      await updateDoc(doc(db, COLLECTIONS.SETTINGS, existing.id), {
        ...setting,
        updatedAt: serverTimestamp()
      });
      return existing.id;
    } else {
      const docRef = await addDoc(this.getSettingsCollection(), {
        ...setting,
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    }
  }

  // Real-time subscriptions
  static subscribeToActivities(
    callback: (activities: ActivityEventDoc[]) => void,
    filters?: { 
      userId?: string; 
      sessionId?: string; 
      limit?: number 
    }
  ): () => void {
    let q: Query = this.getActivitiesCollection();

    if (filters?.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    if (filters?.sessionId) {
      q = query(q, where('sessionId', '==', filters.sessionId));
    }

    q = query(q, orderBy('timestamp', 'desc'));

    if (filters?.limit) {
      q = query(q, limitQuery(filters.limit));
    }

    return onSnapshot(q, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityEventDoc[];
      callback(activities);
    });
  }

  static subscribeToEscalations(
    callback: (escalations: EscalationEventDoc[]) => void,
    filters?: { 
      userId?: string; 
      sessionId?: string; 
      status?: string[]; 
      limit?: number 
    }
  ): () => void {
    let q: Query = this.getEscalationsCollection();

    if (filters?.userId) {
      q = query(q, where('userId', '==', filters.userId));
    }

    if (filters?.sessionId) {
      q = query(q, where('sessionId', '==', filters.sessionId));
    }

    if (filters?.status && filters.status.length > 0) {
      q = query(q, where('status', 'in', filters.status));
    }

    q = query(q, orderBy('timestamp', 'desc'));

    if (filters?.limit) {
      q = query(q, limitQuery(filters.limit));
    }

    return onSnapshot(q, (snapshot) => {
      const escalations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EscalationEventDoc[];
      callback(escalations);
    });
  }
}
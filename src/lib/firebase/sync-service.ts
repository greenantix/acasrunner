import { firebaseAdmin } from './admin';

export interface ProjectStats {
  totalFiles: number;
  indexedFiles: number;
  status: 'indexing' | 'completed' | 'error';
}

export interface StruggleData {
  userUid: string;
  projectId: string;
  patternType: 'import_error' | 'syntax_error' | 'dependency_issue' | 'other';
  errorMessage: string;
  errorHash: string;
  status: 'active' | 'resolved' | 'ignored';
  frequency: number;
  context: {
    filePath?: string;
    lineNumber?: number;
    surroundingCode?: string;
    projectState?: any;
  };
  resolution?: {
    method: 'auto_fix' | 'escalation' | 'manual';
    description: string;
    helpful: boolean;
    resolvedAt: Date;
  };
}

export interface SearchActivity {
  userUid: string;
  projectId: string;
  queryHash: string;
  resultsCount: number;
}

export class SyncService {
  private static instance: SyncService;
  private syncQueue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  private constructor() {}

  public static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  async syncProjectMetadata(projectId: string, stats: ProjectStats): Promise<boolean> {
    try {
      const indexingStatus = {
        totalFiles: stats.totalFiles,
        indexedFiles: stats.indexedFiles,
        lastIndexed: new Date(),
        status: stats.status,
      };

      return await firebaseAdmin.updateProjectIndexingStatus(projectId, indexingStatus);
    } catch (error) {
      console.error(`Sync failed for project ${projectId}:`, error);
      return false;
    }
  }

  async recordSearchActivity(activity: SearchActivity): Promise<boolean> {
    return new Promise((resolve) => {
      this.syncQueue.push(async () => {
        try {
          await firebaseAdmin.recordSearchActivity(
            activity.userUid,
            activity.projectId,
            activity.queryHash,
            activity.resultsCount
          );
          resolve(true);
        } catch (error) {
          console.error('Failed to record search activity:', error);
          resolve(false);
        }
      });
      
      this.processQueue();
    });
  }

  async syncStrugglePattern(struggleData: StruggleData): Promise<string | null> {
    try {
      return await firebaseAdmin.recordStrugglePattern(struggleData);
    } catch (error) {
      console.error('Failed to sync struggle pattern:', error);
      return null;
    }
  }

  async updateStruggleResolution(
    struggleId: string,
    resolution: StruggleData['resolution']
  ): Promise<boolean> {
    try {
      const db = firebaseAdmin.getFirestore();
      await db.collection('struggles').doc(struggleId).update({
        resolution,
        status: 'resolved',
        updatedAt: new Date(),
      });
      return true;
    } catch (error) {
      console.error('Failed to update struggle resolution:', error);
      return false;
    }
  }

  async getProjectStruggles(projectId: string, userUid: string): Promise<(StruggleData & { id: string })[]> {
    try {
      const db = firebaseAdmin.getFirestore();
      
      // Get user's own struggles
      const userStruggleQuery = db
        .collection('struggles')
        .where('userUid', '==', userUid)
        .where('projectId', '==', projectId);

      const userSnapshot = await userStruggleQuery.get();
      const struggles: (StruggleData & { id: string })[] = [];

      userSnapshot.forEach((doc) => {
        const data = doc.data();
        struggles.push({
          ...data,
          id: doc.id
        } as StruggleData & { id: string });
      });

      // Get project-wide struggles (if user is collaborator)
      const projectRef = db.collection('projects').doc(projectId);
      const projectDoc = await projectRef.get();
      
      if (projectDoc.exists) {
        const projectData = projectDoc.data();
        const userRole = projectData?.collaborators?.[userUid];
        
        if (userRole && ['owner', 'editor', 'viewer'].includes(userRole)) {
          const projectStruggleQuery = db
            .collection('struggles')
            .where('projectId', '==', projectId)
            .where('userUid', '!=', userUid);

          const projectSnapshot = await projectStruggleQuery.get();
          
          projectSnapshot.forEach((doc) => {
            const data = doc.data();
            struggles.push({
              ...data,
              id: doc.id
            } as StruggleData & { id: string });
          });
        }
      }

      return struggles;
    } catch (error) {
      console.error('Failed to get project struggles:', error);
      return [];
    }
  }

  async recordSession(sessionData: {
    userUid: string;
    projectId: string;
    sessionType: 'coding' | 'debugging' | 'search';
    metrics?: {
      searchesPerformed?: number;
      embeddingsGenerated?: number;
      escalationsTriggered?: number;
      timeSavedEstimate?: number;
    };
    context?: {
      activeFiles?: string[];
      currentSearch?: string;
      workspaceState?: any;
    };
  }): Promise<string | null> {
    try {
      const db = firebaseAdmin.getFirestore();
      const sessionRef = db.collection('sessions').doc();
      
      const sessionDoc = {
        sessionId: sessionRef.id,
        ...sessionData,
        createdAt: new Date(),
        status: 'active',
      };

      await sessionRef.set(sessionDoc);
      return sessionRef.id;
    } catch (error) {
      console.error('Failed to record session:', error);
      return null;
    }
  }

  async endSession(sessionId: string, finalMetrics?: any): Promise<boolean> {
    try {
      const db = firebaseAdmin.getFirestore();
      await db.collection('sessions').doc(sessionId).update({
        endedAt: new Date(),
        status: 'completed',
        ...(finalMetrics && { metrics: finalMetrics }),
      });
      return true;
    } catch (error) {
      console.error('Failed to end session:', error);
      return false;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.syncQueue.length > 0) {
      const task = this.syncQueue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Sync queue task failed:', error);
        }
      }
    }

    this.isProcessing = false;
  }

  async getUsageAnalytics(userUid: string, timeRange?: { start: Date; end: Date }) {
    try {
      const db = firebaseAdmin.getFirestore();
      
      let query = db.collection('searchEvents').where('userUid', '==', userUid);
      
      if (timeRange) {
        query = query
          .where('timestamp', '>=', timeRange.start)
          .where('timestamp', '<=', timeRange.end);
      }

      const snapshot = await query.get();
      const events: any[] = [];
      
      snapshot.forEach((doc) => {
        events.push(doc.data());
      });

      // Aggregate data
      const analytics = {
        totalSearches: events.length,
        averageResultsPerSearch: events.length > 0 
          ? events.reduce((sum, event) => sum + event.resultsCount, 0) / events.length 
          : 0,
        searchesByProject: events.reduce((acc, event) => {
          acc[event.projectId] = (acc[event.projectId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        searchPatterns: events.map(event => ({
          timestamp: event.timestamp,
          projectId: event.projectId,
          resultsCount: event.resultsCount,
        })),
      };

      return analytics;
    } catch (error) {
      console.error('Failed to get usage analytics:', error);
      return null;
    }
  }
}

export const syncService = SyncService.getInstance();

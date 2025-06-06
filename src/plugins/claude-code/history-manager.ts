import { EventEmitter } from 'events';
import { ClaudeCodeProcess } from './process-detector';

interface ActivityEvent {
  id: string;
  timestamp: Date;
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
}

export interface ClaudeSession {
  id: string;
  processId: number;
  startTime: Date;
  endTime?: Date;
  workingDirectory: string;
  command: string;
  user: string;
  activities: ActivityEvent[];
  metadata: Record<string, any>;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  totalEvents: number;
  lastActivity?: Date;
  averageSessionDuration: number;
}

export class ClaudeCodeHistoryManager extends EventEmitter {
  private sessions = new Map<string, ClaudeSession>();
  private activeSessions = new Map<number, string>(); // pid -> sessionId
  private isActive = false;
  private maxStoredSessions = 1000;
  private maxEventsPerSession = 10000;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    console.log('[History Manager] Initializing session and activity tracking...');
    this.isActive = true;
    
    // Load existing sessions from persistent storage if available
    await this.loadExistingSessions();
  }

  async cleanup(): Promise<void> {
    console.log('[History Manager] Cleaning up history manager...');
    this.isActive = false;
    
    // Save current sessions to persistent storage
    await this.saveActiveSessions();
    
    this.sessions.clear();
    this.activeSessions.clear();
  }

  async startSession(process: ClaudeCodeProcess): Promise<string> {
    const sessionId = this.generateSessionId(process);
    
    const session: ClaudeSession = {
      id: sessionId,
      processId: process.pid,
      startTime: process.startTime,
      workingDirectory: process.workingDirectory,
      command: process.command,
      user: process.user,
      activities: [],
      metadata: {
        detectedAt: new Date(),
        version: '1.0.0'
      }
    };

    this.sessions.set(sessionId, session);
    this.activeSessions.set(process.pid, sessionId);
    
    console.log(`[History Manager] Started session ${sessionId} for PID ${process.pid}`);
    
    this.emit('session-started', session);
    
    // Cleanup old sessions if we have too many
    await this.cleanupOldSessions();
    
    return sessionId;
  }

  async endSession(process: ClaudeCodeProcess): Promise<void> {
    const sessionId = this.activeSessions.get(process.pid);
    if (!sessionId) {
      console.warn(`[History Manager] No active session found for PID ${process.pid}`);
      return;
    }

    const session = this.sessions.get(sessionId);
    if (session) {
      session.endTime = new Date();
      session.metadata.duration = session.endTime.getTime() - session.startTime.getTime();
      
      console.log(`[History Manager] Ended session ${sessionId} for PID ${process.pid}`);
      
      this.emit('session-ended', session);
    }

    this.activeSessions.delete(process.pid);
  }

  async recordActivity(event: ActivityEvent): Promise<void> {
    if (!this.isActive) return;

    // Find the relevant session(s) for this activity
    const relevantSessions = this.findRelevantSessions(event);
    
    for (const session of relevantSessions) {
      if (session.activities.length < this.maxEventsPerSession) {
        session.activities.push({
          ...event,
          timestamp: event.timestamp instanceof Date ? event.timestamp : new Date(event.timestamp)
        });
        
        session.metadata.lastActivity = new Date();
      } else {
        // Remove old activities to make room for new ones
        session.activities.shift();
        session.activities.push(event);
      }
    }

    this.emit('activity-recorded', event);
  }

  async recordCommand(command: string, result: any): Promise<void> {
    const commandEvent: ActivityEvent = {
      id: `command-${Date.now()}`,
      type: 'system_event',
      timestamp: new Date(),
      source: 'claude-code-plugin',
      message: `Command executed: ${command}`,
      details: {
        exitCode: result.exitCode
      },
      metadata: {
        command,
        result,
        workingDirectory: process.cwd()
      }
    };

    await this.recordActivity(commandEvent);
  }

  private findRelevantSessions(event: ActivityEvent): ClaudeSession[] {
    const sessions: ClaudeSession[] = [];
    
    // Add to all active sessions
    for (const sessionId of this.activeSessions.values()) {
      const session = this.sessions.get(sessionId);
      if (session) {
        sessions.push(session);
      }
    }
    
    // If no active sessions, try to find by working directory or other context
    if (sessions.length === 0 && event.metadata?.workingDirectory) {
      for (const session of this.sessions.values()) {
        if (!session.endTime && session.workingDirectory === event.metadata.workingDirectory) {
          sessions.push(session);
        }
      }
    }
    
    return sessions;
  }

  private generateSessionId(process: ClaudeCodeProcess): string {
    const timestamp = process.startTime.getTime();
    const pidHex = process.pid.toString(16);
    const random = Math.random().toString(36).substring(2, 8);
    return `claude-${timestamp}-${pidHex}-${random}`;
  }

  async getSession(sessionId: string): Promise<ClaudeSession | undefined> {
    return this.sessions.get(sessionId);
  }

  async getActiveSessions(): Promise<ClaudeSession[]> {
    const activeSessions: ClaudeSession[] = [];
    
    for (const sessionId of this.activeSessions.values()) {
      const session = this.sessions.get(sessionId);
      if (session) {
        activeSessions.push(session);
      }
    }
    
    return activeSessions;
  }

  async getAllSessions(): Promise<ClaudeSession[]> {
    return Array.from(this.sessions.values());
  }

  async getSessionsByTimeRange(startTime: Date, endTime: Date): Promise<ClaudeSession[]> {
    return Array.from(this.sessions.values()).filter(session => {
      return session.startTime >= startTime && 
             (session.endTime ? session.endTime <= endTime : new Date() <= endTime);
    });
  }

  async searchSessions(query: string): Promise<ClaudeSession[]> {
    // Simple text-based search for now
    // TODO: integrate with Ollama for semantic search
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.sessions.values()).filter(session => {
      return session.command.toLowerCase().includes(lowerQuery) ||
             session.workingDirectory.toLowerCase().includes(lowerQuery) ||
             session.user.toLowerCase().includes(lowerQuery) ||
             session.activities.some(activity => 
               activity.message.toLowerCase().includes(lowerQuery) ||
               JSON.stringify(activity.metadata || {}).toLowerCase().includes(lowerQuery)
             );
    });
  }

  async getSessionStats(): Promise<SessionStats> {
    const allSessions = Array.from(this.sessions.values());
    const activeSessions = Array.from(this.activeSessions.values());
    
    const totalEvents = allSessions.reduce((sum, session) => sum + session.activities.length, 0);
    
    const completedSessions = allSessions.filter(session => session.endTime);
    const totalDuration = completedSessions.reduce((sum, session) => {
      if (session.endTime) {
        return sum + (session.endTime.getTime() - session.startTime.getTime());
      }
      return sum;
    }, 0);
    
    const averageSessionDuration = completedSessions.length > 0 ? 
      totalDuration / completedSessions.length : 0;

    const lastActivityTimes = allSessions
      .map(session => session.metadata.lastActivity)
      .filter(Boolean) as Date[];
    
    const lastActivity = lastActivityTimes.length > 0 ? 
      new Date(Math.max(...lastActivityTimes.map(d => d.getTime()))) : undefined;

    return {
      totalSessions: allSessions.length,
      activeSessions: activeSessions.length,
      totalEvents,
      lastActivity,
      averageSessionDuration
    };
  }

  async getActiveSessionCount(): Promise<number> {
    return this.activeSessions.size;
  }

  async getTotalEventCount(): Promise<number> {
    return Array.from(this.sessions.values())
      .reduce((sum, session) => sum + session.activities.length, 0);
  }

  async getLastActivityTime(): Promise<Date | undefined> {
    const stats = await this.getSessionStats();
    return stats.lastActivity;
  }

  private async cleanupOldSessions(): Promise<void> {
    if (this.sessions.size <= this.maxStoredSessions) return;

    const sessions = Array.from(this.sessions.values())
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    const sessionsToRemove = sessions.slice(0, sessions.length - this.maxStoredSessions);
    
    for (const session of sessionsToRemove) {
      this.sessions.delete(session.id);
    }

    console.log(`[History Manager] Cleaned up ${sessionsToRemove.length} old sessions`);
  }

  private async loadExistingSessions(): Promise<void> {
    // TODO: Implement persistent storage loading
    // For now, start with empty state
    console.log('[History Manager] No persistent storage configured, starting with empty state');
  }

  private async saveActiveSessions(): Promise<void> {
    // TODO: Implement persistent storage saving
    // For now, just log the session count
    console.log(`[History Manager] Would save ${this.sessions.size} sessions to persistent storage`);
  }

  async exportSessionData(sessionIds?: string[]): Promise<any> {
    const sessionsToExport = sessionIds ? 
      sessionIds.map(id => this.sessions.get(id)).filter(Boolean) :
      Array.from(this.sessions.values());

    return {
      exportTime: new Date().toISOString(),
      sessions: sessionsToExport,
      stats: await this.getSessionStats()
    };
  }

  async clearHistory(olderThan?: Date): Promise<number> {
    const beforeSize = this.sessions.size;
    
    if (olderThan) {
      for (const [id, session] of this.sessions) {
        if (session.startTime < olderThan && !this.activeSessions.has(session.processId)) {
          this.sessions.delete(id);
        }
      }
    } else {
      // Clear all non-active sessions
      for (const [id, session] of this.sessions) {
        if (!this.activeSessions.has(session.processId)) {
          this.sessions.delete(id);
        }
      }
    }
    
    const cleared = beforeSize - this.sessions.size;
    console.log(`[History Manager] Cleared ${cleared} sessions from history`);
    
    return cleared;
  }
}
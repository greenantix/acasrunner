import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { FirebaseCollections } from '../../lib/firebase/collections';

export interface CrashContext {
  sessionId: string;
  timestamp: Date;
  activeTask: TaskContext;
  fileStates: FileSnapshot[];
  conversationHistory: Message[];
  errorDetails: ErrorInfo;
  recoveryInstructions: string;
  systemState: SystemState;
  userContext: UserContext;
}

export interface TaskContext {
  id: string;
  description: string;
  startTime: Date;
  expectedOutputs: string[];
  workingDirectory: string;
  commandHistory: CommandExecution[];
  currentStep: string;
  progress: number; // 0-1
  metadata: Record<string, any>;
}

export interface FileSnapshot {
  filePath: string;
  content: string;
  hash: string;
  size: number;
  lastModified: Date;
  isNew: boolean;
  isModified: boolean;
  backupPath?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ErrorInfo {
  type: 'crash' | 'timeout' | 'api_failure' | 'memory_error' | 'user_interrupt';
  message: string;
  stack?: string;
  code?: string | number;
  signal?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SystemState {
  memory: {
    used: number;
    total: number;
    available: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  disk: {
    available: number;
    total: number;
  };
  processes: ProcessInfo[];
  networkStatus: 'online' | 'offline' | 'limited';
}

export interface UserContext {
  userId: string;
  currentProject: string;
  recentFiles: string[];
  preferences: Record<string, any>;
  struggleSettings?: any;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
  command: string;
}

export interface CommandExecution {
  command: string;
  timestamp: Date;
  exitCode?: number;
  output?: string;
  error?: string;
  workingDirectory: string;
}

export interface RestoreResult {
  success: boolean;
  restoredFiles: string[];
  restoredContext: Partial<CrashContext>;
  warnings: string[];
  errors: string[];
  nextSteps: string[];
}

export interface SystemEvent {
  type: 'memory_warning' | 'disk_full' | 'process_crash' | 'api_timeout' | 'connection_lost';
  timestamp: Date;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class CrashRecoveryManager extends EventEmitter {
  private isActive = false;
  private autoSaveInterval = 30000; // 30 seconds
  private intervalId?: NodeJS.Timeout;
  private recoveryDir: string;
  private currentContext?: CrashContext;
  private fileWatchers = new Map<string, any>();
  private maxContextHistory = 10;

  constructor(recoveryDir: string = join(process.cwd(), '.claude-recovery')) {
    super();
    this.recoveryDir = recoveryDir;
    this.ensureRecoveryDir();
  }

  async initialize(): Promise<void> {
    console.log('[Crash Recovery] Initializing crash recovery system...');
    this.isActive = true;
    
    // Start auto-save context
    this.startAutoSaveContext();
    
    // Set up crash detection
    this.setupCrashDetection();
    
    // Check for existing recovery data
    await this.checkForExistingRecovery();
    
    console.log(`[Crash Recovery] ✅ Initialized with recovery directory: ${this.recoveryDir}`);
  }

  async cleanup(): Promise<void> {
    console.log('[Crash Recovery] Cleaning up crash recovery manager...');
    this.isActive = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    // Stop file watchers
    for (const [, watcher] of this.fileWatchers) {
      try {
        watcher.close();
      } catch (error) {
        // Ignore errors when closing watchers
      }
    }
    this.fileWatchers.clear();
    
    // Save final context if active
    if (this.currentContext) {
      await this.saveCrashContext(this.currentContext);
    }
  }

  // Auto-save context every 30 seconds during active tasks
  private startAutoSaveContext(): void {
    this.intervalId = setInterval(async () => {
      if (this.isActive && this.currentContext) {
        try {
          await this.updateCurrentContext();
          await this.saveCrashContext(this.currentContext);
        } catch (error) {
          console.error('[Crash Recovery] Error during auto-save:', error);
        }
      }
    }, this.autoSaveInterval);
  }

  // Detect crashes: memory dumps, process exits, API timeouts
  detectCrash(event: SystemEvent): boolean {
    const crashEvents = ['process_crash', 'memory_warning', 'api_timeout'];
    
    if (crashEvents.includes(event.type)) {
      console.log(`[Crash Recovery] 🚨 Crash detected: ${event.type}`);
      
      this.emit('crash-detected', {
        event,
        timestamp: new Date(),
        hasRecoveryData: this.currentContext !== undefined
      });
      
      return true;
    }
    
    return false;
  }

  // Save full context + error reason
  async saveCrashContext(context: CrashContext): Promise<void> {
    try {
      const contextPath = join(this.recoveryDir, `context-${context.sessionId}.json`);
      const backupPath = join(this.recoveryDir, `context-${context.sessionId}-${Date.now()}.json`);
      
      // Save current context
      writeFileSync(contextPath, JSON.stringify(context, null, 2));
      
      // Save backup copy
      writeFileSync(backupPath, JSON.stringify(context, null, 2));
      
      // Save to Firebase for persistence
      try {
        await FirebaseCollections.setSetting({
          category: 'crash-recovery',
          key: `context-${context.sessionId}`,
          value: context,
          type: 'object',
          description: `Crash recovery context for session ${context.sessionId}`,
          isSystem: true,
          updatedBy: 'crash-recovery-system'
        });
      } catch (firebaseError) {
        console.warn('[Crash Recovery] Firebase save failed, using local storage only:', firebaseError);
      }
      
      console.log(`[Crash Recovery] 💾 Context saved: ${contextPath}`);
      
      // Cleanup old contexts
      await this.cleanupOldContexts();
      
    } catch (error) {
      console.error('[Crash Recovery] Error saving crash context:', error);
    }
  }

  // Restore session from crash
  async restoreFromCrash(sessionId: string): Promise<RestoreResult> {
    const result: RestoreResult = {
      success: false,
      restoredFiles: [],
      restoredContext: {},
      warnings: [],
      errors: [],
      nextSteps: []
    };

    try {
      console.log(`[Crash Recovery] 🔄 Attempting to restore session: ${sessionId}`);
      
      // Try to load context from local file first
      let context: CrashContext | null = null;
      const contextPath = join(this.recoveryDir, `context-${sessionId}.json`);
      
      if (existsSync(contextPath)) {
        const contextData = readFileSync(contextPath, 'utf-8');
        context = JSON.parse(contextData);
        console.log('[Crash Recovery] Loaded context from local file');
      } else {
        // Try Firebase
        try {
          const setting = await FirebaseCollections.getSetting('crash-recovery', `context-${sessionId}`);
          if (setting && setting.value) {
            context = setting.value as CrashContext;
            console.log('[Crash Recovery] Loaded context from Firebase');
          }
        } catch (error) {
          console.warn('[Crash Recovery] Could not load from Firebase:', error);
        }
      }

      if (!context) {
        result.errors.push(`No recovery context found for session ${sessionId}`);
        return result;
      }

      // Restore file states
      result.restoredFiles = await this.restoreFileStates(context.fileStates);
      
      // Restore context
      result.restoredContext = context;
      
      // Generate recovery instructions
      result.nextSteps = this.generateRecoverySteps(context);
      
      result.success = true;
      
      console.log(`[Crash Recovery] ✅ Successfully restored session ${sessionId}`);
      console.log(`[Crash Recovery] Restored ${result.restoredFiles.length} files`);
      
      this.emit('session-restored', {
        sessionId,
        context,
        result
      });

    } catch (error) {
      console.error('[Crash Recovery] Error during session restore:', error);
      result.errors.push(`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  // Smart restart with preserved context
  async smartRestart(context: CrashContext): Promise<void> {
    try {
      console.log(`[Crash Recovery] 🚀 Smart restart for session: ${context.sessionId}`);
      
      // Update current context
      this.currentContext = {
        ...context,
        timestamp: new Date()
      };
      
      // Resume file watching for tracked files
      for (const fileSnapshot of context.fileStates) {
        this.watchFile(fileSnapshot.filePath);
      }
      
      // Resume active task if possible
      if (context.activeTask && context.activeTask.progress < 1) {
        await this.resumeTask(context.activeTask);
      }
      
      // Emit restart event
      this.emit('smart-restart', {
        sessionId: context.sessionId,
        task: context.activeTask,
        fileCount: context.fileStates.length
      });
      
      console.log(`[Crash Recovery] ✅ Smart restart completed for session ${context.sessionId}`);
      
    } catch (error) {
      console.error('[Crash Recovery] Error during smart restart:', error);
      throw error;
    }
  }

  // Public API methods
  async startSession(sessionId: string, task: TaskContext, userContext: UserContext): Promise<void> {
    try {
      this.currentContext = {
        sessionId,
        timestamp: new Date(),
        activeTask: task,
        fileStates: [],
        conversationHistory: [],
        errorDetails: {
          type: 'crash',
          message: 'No error',
          timestamp: new Date(),
          severity: 'low'
        },
        recoveryInstructions: '',
        systemState: await this.captureSystemState(),
        userContext
      };
      
      // Watch task working directory
      this.watchDirectory(task.workingDirectory);
      
      console.log(`[Crash Recovery] 📝 Started session tracking: ${sessionId}`);
      
    } catch (error) {
      console.error('[Crash Recovery] Error starting session:', error);
    }
  }

  async updateTask(taskUpdate: Partial<TaskContext>): Promise<void> {
    if (this.currentContext) {
      this.currentContext.activeTask = {
        ...this.currentContext.activeTask,
        ...taskUpdate
      };
    }
  }

  async addMessage(message: Message): Promise<void> {
    if (this.currentContext) {
      this.currentContext.conversationHistory.push(message);
      
      // Keep only recent messages to avoid bloat
      if (this.currentContext.conversationHistory.length > 50) {
        this.currentContext.conversationHistory = this.currentContext.conversationHistory.slice(-50);
      }
    }
  }

  async addFileSnapshot(filePath: string): Promise<void> {
    if (!this.currentContext) return;
    
    try {
      if (existsSync(filePath)) {
        const content = readFileSync(filePath, 'utf-8');
        const stats = await import('fs').then(fs => fs.promises.stat(filePath));
        
        const snapshot: FileSnapshot = {
          filePath,
          content,
          hash: this.hashString(content),
          size: stats.size,
          lastModified: stats.mtime,
          isNew: !this.currentContext.fileStates.some(f => f.filePath === filePath),
          isModified: this.isFileModified(filePath, content)
        };
        
        // Update or add snapshot
        const existingIndex = this.currentContext.fileStates.findIndex(f => f.filePath === filePath);
        if (existingIndex >= 0) {
          this.currentContext.fileStates[existingIndex] = snapshot;
        } else {
          this.currentContext.fileStates.push(snapshot);
        }
        
        // Start watching this file
        this.watchFile(filePath);
      }
    } catch (error) {
      console.error(`[Crash Recovery] Error adding file snapshot for ${filePath}:`, error);
    }
  }

  async recordError(error: ErrorInfo): Promise<void> {
    if (this.currentContext) {
      this.currentContext.errorDetails = error;
      this.currentContext.recoveryInstructions = this.generateRecoveryInstructions(error);
      
      // Save immediately on error
      await this.saveCrashContext(this.currentContext);
    }
  }

  getRecoveryStatus(): {
    hasActiveSession: boolean;
    sessionId?: string;
    lastSave?: Date;
    trackedFiles: number;
    recoveryDataAvailable: boolean;
  } {
    return {
      hasActiveSession: this.currentContext !== undefined,
      sessionId: this.currentContext?.sessionId,
      lastSave: this.currentContext?.timestamp,
      trackedFiles: this.currentContext?.fileStates.length || 0,
      recoveryDataAvailable: this.hasRecoveryData()
    };
  }

  async listAvailableRecoveries(): Promise<Array<{
    sessionId: string;
    timestamp: Date;
    taskDescription: string;
    fileCount: number;
  }>> {
    const recoveries: Array<{
      sessionId: string;
      timestamp: Date;
      taskDescription: string;
      fileCount: number;
    }> = [];

    try {
      const { readdir } = await import('fs').then(fs => fs.promises);
      const files = await readdir(this.recoveryDir);
      
      for (const file of files) {
        if (file.startsWith('context-') && file.endsWith('.json')) {
          try {
            const filePath = join(this.recoveryDir, file);
            const content = readFileSync(filePath, 'utf-8');
            const context: CrashContext = JSON.parse(content);
            
            recoveries.push({
              sessionId: context.sessionId,
              timestamp: new Date(context.timestamp),
              taskDescription: context.activeTask.description,
              fileCount: context.fileStates.length
            });
          } catch (error) {
            console.warn(`[Crash Recovery] Could not parse recovery file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('[Crash Recovery] Error listing recoveries:', error);
    }

    return recoveries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async clearRecoveryData(sessionId?: string): Promise<void> {
    try {
      if (sessionId) {
        // Clear specific session
        const contextPath = join(this.recoveryDir, `context-${sessionId}.json`);
        if (existsSync(contextPath)) {
          unlinkSync(contextPath);
        }
        
        // Clear from Firebase
        try {
          // Note: Firebase doesn't have a direct delete for settings, would need to implement
          console.log(`[Crash Recovery] Cleared recovery data for session ${sessionId}`);
        } catch (error) {
          console.warn('[Crash Recovery] Could not clear Firebase data:', error);
        }
      } else {
        // Clear all recovery data
        const { readdir } = await import('fs').then(fs => fs.promises);
        const files = await readdir(this.recoveryDir);
        
        for (const file of files) {
          if (file.startsWith('context-') && file.endsWith('.json')) {
            unlinkSync(join(this.recoveryDir, file));
          }
        }
        
        console.log('[Crash Recovery] Cleared all recovery data');
      }
    } catch (error) {
      console.error('[Crash Recovery] Error clearing recovery data:', error);
    }
  }

  // Private helper methods
  private ensureRecoveryDir(): void {
    if (!existsSync(this.recoveryDir)) {
      mkdirSync(this.recoveryDir, { recursive: true });
    }
  }

  private async updateCurrentContext(): Promise<void> {
    if (!this.currentContext) return;
    
    // Update system state
    this.currentContext.systemState = await this.captureSystemState();
    
    // Update timestamp
    this.currentContext.timestamp = new Date();
  }

  private async captureSystemState(): Promise<SystemState> {
    try {
      const os = await import('os');
      
      return {
        memory: {
          used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024 * 100) / 100,
          total: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100,
          available: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100
        },
        cpu: {
          usage: 0, // Would need additional logic to calculate
          loadAverage: os.loadavg()
        },
        disk: {
          available: 0, // Would need platform-specific logic
          total: 0
        },
        processes: [], // Would need process enumeration
        networkStatus: 'online' // Would need network check
      };
    } catch (error) {
      console.error('[Crash Recovery] Error capturing system state:', error);
      return {
        memory: { used: 0, total: 0, available: 0 },
        cpu: { usage: 0, loadAverage: [0, 0, 0] },
        disk: { available: 0, total: 0 },
        processes: [],
        networkStatus: 'offline'
      };
    }
  }

  private async restoreFileStates(fileStates: FileSnapshot[]): Promise<string[]> {
    const restoredFiles: string[] = [];
    
    for (const snapshot of fileStates) {
      try {
        // Check if file has been modified since crash
        if (existsSync(snapshot.filePath)) {
          const currentContent = readFileSync(snapshot.filePath, 'utf-8');
          const currentHash = this.hashString(currentContent);
          
          if (currentHash !== snapshot.hash) {
            // File has been modified, create backup before restoring
            const backupPath = `${snapshot.filePath}.pre-recovery-backup`;
            writeFileSync(backupPath, currentContent);
            console.log(`[Crash Recovery] Created backup: ${backupPath}`);
          }
        }
        
        // Restore file content
        const dir = dirname(snapshot.filePath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        
        writeFileSync(snapshot.filePath, snapshot.content);
        restoredFiles.push(snapshot.filePath);
        
      } catch (error) {
        console.error(`[Crash Recovery] Error restoring file ${snapshot.filePath}:`, error);
      }
    }
    
    return restoredFiles;
  }

  private generateRecoverySteps(context: CrashContext): string[] {
    const steps: string[] = [];
    
    steps.push('Review the restored file states for any conflicts');
    
    if (context.activeTask.progress < 1) {
      steps.push(`Resume task: ${context.activeTask.description}`);
      steps.push(`Continue from step: ${context.activeTask.currentStep}`);
    }
    
    if (context.errorDetails.type !== 'crash') {
      steps.push(`Address the error: ${context.errorDetails.message}`);
    }
    
    if (context.conversationHistory.length > 0) {
      steps.push('Review conversation history for context');
    }
    
    steps.push('Run tests or verification to ensure system stability');
    
    return steps;
  }

  private generateRecoveryInstructions(error: ErrorInfo): string {
    switch (error.type) {
      case 'memory_error':
        return 'System ran out of memory. Consider restarting with more memory or reducing concurrent operations.';
      case 'api_failure':
        return 'API call failed. Check network connectivity and API credentials before resuming.';
      case 'timeout':
        return 'Operation timed out. Review the last command and consider breaking it into smaller steps.';
      case 'user_interrupt':
        return 'User interrupted the process. Resume from the last completed step.';
      default:
        return 'Unexpected error occurred. Review system logs and error details before resuming.';
    }
  }

  private watchFile(filePath: string): void {
    if (this.fileWatchers.has(filePath)) return;
    
    try {
      const { watch } = require('fs');
      const watcher = watch(filePath, (eventType: string) => {
        if (eventType === 'change') {
          this.addFileSnapshot(filePath);
        }
      });
      
      this.fileWatchers.set(filePath, watcher);
    } catch (error) {
      console.warn(`[Crash Recovery] Could not watch file ${filePath}:`, error);
    }
  }

  private watchDirectory(dirPath: string): void {
    // Basic directory watching - could be enhanced
    this.watchFile(dirPath);
  }

  private isFileModified(filePath: string, content: string): boolean {
    if (!this.currentContext) return false;
    
    const existing = this.currentContext.fileStates.find(f => f.filePath === filePath);
    if (!existing) return true;
    
    return this.hashString(content) !== existing.hash;
  }

  private hashString(str: string): string {
    // Simple hash function - could use crypto for better hashing
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private async resumeTask(task: TaskContext): Promise<void> {
    console.log(`[Crash Recovery] 🔄 Resuming task: ${task.description} (${Math.round(task.progress * 100)}% complete)`);
    
    this.emit('task-resumed', {
      taskId: task.id,
      description: task.description,
      progress: task.progress,
      currentStep: task.currentStep
    });
  }

  private setupCrashDetection(): void {
    // Set up crash detection handlers
    process.on('uncaughtException', (error) => {
      this.handleCrash('uncaughtException', error);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.handleCrash('unhandledRejection', reason);
    });
    
    process.on('SIGTERM', () => {
      this.handleGracefulShutdown('SIGTERM');
    });
    
    process.on('SIGINT', () => {
      this.handleGracefulShutdown('SIGINT');
    });
  }

  private async handleCrash(type: string, error: any): Promise<void> {
    console.error(`[Crash Recovery] 💥 ${type} detected:`, error);
    
    if (this.currentContext) {
      this.currentContext.errorDetails = {
        type: 'crash',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date(),
        severity: 'critical'
      };
      
      await this.saveCrashContext(this.currentContext);
    }
    
    this.emit('crash-detected', {
      type,
      error,
      hasRecoveryData: this.currentContext !== undefined
    });
  }

  private async handleGracefulShutdown(signal: string): Promise<void> {
    console.log(`[Crash Recovery] 🛑 Graceful shutdown (${signal})`);
    
    if (this.currentContext) {
      this.currentContext.errorDetails = {
        type: 'user_interrupt',
        message: `Process interrupted by ${signal}`,
        signal,
        timestamp: new Date(),
        severity: 'medium'
      };
      
      await this.saveCrashContext(this.currentContext);
    }
    
    await this.cleanup();
  }

  private async checkForExistingRecovery(): Promise<void> {
    const recoveries = await this.listAvailableRecoveries();
    
    if (recoveries.length > 0) {
      console.log(`[Crash Recovery] 📋 Found ${recoveries.length} existing recovery contexts`);
      
      this.emit('recovery-data-found', {
        count: recoveries.length,
        latest: recoveries[0]
      });
    }
  }

  private hasRecoveryData(): boolean {
    try {
      const { readdirSync } = require('fs');
      const files = readdirSync(this.recoveryDir);
      return files.some((file: string) => file.startsWith('context-') && file.endsWith('.json'));
    } catch (error) {
      return false;
    }
  }

  private async cleanupOldContexts(): Promise<void> {
    try {
      const recoveries = await this.listAvailableRecoveries();
      
      if (recoveries.length > this.maxContextHistory) {
        const toDelete = recoveries.slice(this.maxContextHistory);
        
        for (const recovery of toDelete) {
          const contextPath = join(this.recoveryDir, `context-${recovery.sessionId}.json`);
          if (existsSync(contextPath)) {
            unlinkSync(contextPath);
          }
        }
        
        console.log(`[Crash Recovery] 🧹 Cleaned up ${toDelete.length} old recovery contexts`);
      }
    } catch (error) {
      console.error('[Crash Recovery] Error cleaning up old contexts:', error);
    }
  }
}
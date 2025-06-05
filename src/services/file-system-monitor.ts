import * as chokidar from 'chokidar';
import { ActivityEvent } from './activity-service';
import { getIndexingService } from './vector-storage';
import path from 'path';

export interface FileSystemMonitorConfig {
  watchPaths: string[];
  ignored?: string[];
  ignoreInitial?: boolean;
  enableVectorIndexing?: boolean;
  projectId?: string;
  indexingDelay?: number;
}

export class FileSystemMonitor {
  private watcher: any | null = null;
  private config: FileSystemMonitorConfig;
  private onActivity: (event: ActivityEvent) => void;
  private indexingService?: any;
  private indexingQueue = new Map<string, NodeJS.Timeout>();

  constructor(config: FileSystemMonitorConfig, onActivity: (event: ActivityEvent) => void) {
    this.config = config;
    this.onActivity = onActivity;
    
    // Initialize indexing service if vector indexing is enabled
    if (this.config.enableVectorIndexing) {
      this.indexingService = getIndexingService(this.config.projectId || 'default');
    }
  }

  start(): void {
    if (this.watcher) {
      console.warn('File system monitor is already running');
      return;
    }

    const defaultIgnored = [
      '**/node_modules/**',
      '**/.git/**',
      '**/.next/**',
      '**/dist/**',
      '**/.claude-cache/**',
      '**/lib/**',
      '**/*.log',
      '**/package-lock.json',
    ];

    this.watcher = chokidar.watch(this.config.watchPaths, {
      ignored: [...defaultIgnored, ...(this.config.ignored || [])],
      ignoreInitial: this.config.ignoreInitial ?? true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    this.watcher
      .on('add', (path: string) => this.handleFileEvent('created', path))
      .on('change', (path: string) => this.handleFileEvent('modified', path))
      .on('unlink', (path: string) => this.handleFileEvent('deleted', path))
      .on('addDir', (path: string) => this.handleDirectoryEvent('created', path))
      .on('unlinkDir', (path: string) => this.handleDirectoryEvent('deleted', path))
      .on('error', (error: Error) => this.handleError(error))
      .on('ready', () => {
        console.log('File system monitor is ready and watching for changes');
        this.emitSystemEvent('File system monitoring started');
      });
  }


  private handleFileEvent(changeType: 'created' | 'modified' | 'deleted', filePath: string): void {
    const relativePath = this.getRelativePath(filePath);
    const fileName = this.getFileName(filePath);

    const message = `File ${changeType}: ${fileName}`;

    this.onActivity({
      id: this.generateId(),
      timestamp: new Date(),
      type: 'file_change',
      source: relativePath,
      message,
      details: {
        filePath: relativePath,
        changeType,
        severity: 'low',
      },
    });

    // Handle vector indexing for code files
    if (this.config.enableVectorIndexing && this.indexingService) {
      this.handleVectorIndexing(changeType, filePath);
    }
  }

  private handleDirectoryEvent(changeType: 'created' | 'deleted', dirPath: string): void {
    const relativePath = this.getRelativePath(dirPath);
    const dirName = this.getFileName(dirPath);

    const message = `Directory ${changeType}: ${dirName}`;

    this.onActivity({
      id: this.generateId(),
      timestamp: new Date(),
      type: 'file_change',
      source: relativePath,
      message,
      details: {
        filePath: relativePath,
        changeType,
        severity: 'low',
      },
    });
  }

  private handleError(error: Error): void {
    this.onActivity({
      id: this.generateId(),
      timestamp: new Date(),
      type: 'error',
      source: 'file-system-monitor',
      message: `File system monitoring error: ${error.message}`,
      details: {
        errorStack: error.stack,
        severity: 'medium',
      },
    });
  }

  private emitSystemEvent(message: string): void {
    this.onActivity({
      id: this.generateId(),
      timestamp: new Date(),
      type: 'system_event',
      source: 'file-system-monitor',
      message,
      details: {
        severity: 'low',
      },
    });
  }

  private getRelativePath(fullPath: string): string {
    const cwd = process.cwd();
    return fullPath.startsWith(cwd) ? fullPath.substring(cwd.length + 1) : fullPath;
  }

  private getFileName(fullPath: string): string {
    return fullPath.split('/').pop() || fullPath;
  }

  private generateId(): string {
    return `fs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleVectorIndexing(changeType: 'created' | 'modified' | 'deleted', filePath: string): void {
    // Check if file is a code file that should be indexed
    if (!this.isCodeFile(filePath)) {
      return;
    }

    // Cancel any pending indexing for this file
    const existingTimeout = this.indexingQueue.get(filePath);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (changeType === 'deleted') {
      // Immediately remove from vector database
      this.indexingService.removeFile(filePath).catch((error: Error) => {
        console.error(`Failed to remove vector embeddings for ${filePath}:`, error);
        this.onActivity({
          id: this.generateId(),
          timestamp: new Date(),
          type: 'error',
          source: 'vector-indexing',
          message: `Failed to remove embeddings for deleted file: ${this.getFileName(filePath)}`,
          details: {
            filePath: this.getRelativePath(filePath),
            error: error.message,
            severity: 'medium',
          },
        });
      });
    } else if (changeType === 'created' || changeType === 'modified') {
      // Debounced indexing for created/modified files
      const delay = this.config.indexingDelay || 2000;
      const timeout = setTimeout(() => {
        this.indexingQueue.delete(filePath);
        
        this.indexingService.indexFile(filePath).then(() => {
          this.onActivity({
            id: this.generateId(),
            timestamp: new Date(),
            type: 'system_event',
            source: 'vector-indexing',
            message: `Indexed file: ${this.getFileName(filePath)}`,
            details: {
              filePath: this.getRelativePath(filePath),
              action: 'indexed',
              severity: 'low',
            },
          });
        }).catch((error: Error) => {
          console.error(`Failed to index file ${filePath}:`, error);
          this.onActivity({
            id: this.generateId(),
            timestamp: new Date(),
            type: 'error',
            source: 'vector-indexing',
            message: `Failed to index file: ${this.getFileName(filePath)}`,
            details: {
              filePath: this.getRelativePath(filePath),
              error: error.message,
              severity: 'medium',
            },
          });
        });
      }, delay);

      this.indexingQueue.set(filePath, timeout);
    }
  }

  private isCodeFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const codeExtensions = [
      '.ts', '.tsx', '.js', '.jsx',
      '.py', '.java', '.cpp', '.c', '.cs',
      '.go', '.rs', '.php', '.rb', '.swift',
      '.kt', '.dart', '.scala', '.clj',
      '.vue', '.svelte', '.html', '.css',
      '.sql', '.md', '.yaml', '.yml', '.json'
    ];
    
    return codeExtensions.includes(ext);
  }

  stop(): void {
    // Clear all pending indexing timeouts
    for (const timeout of this.indexingQueue.values()) {
      clearTimeout(timeout);
    }
    this.indexingQueue.clear();

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.emitSystemEvent('File system monitoring stopped');
    }
  }
}

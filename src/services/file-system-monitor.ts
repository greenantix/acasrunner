import chokidar from 'chokidar';
import { ActivityEvent } from './activity-service';

export interface FileSystemMonitorConfig {
  watchPaths: string[];
  ignored?: string[];
  ignoreInitial?: boolean;
}

export class FileSystemMonitor {
  private watcher: chokidar.FSWatcher | null = null;
  private config: FileSystemMonitorConfig;
  private onActivity: (event: ActivityEvent) => void;

  constructor(
    config: FileSystemMonitorConfig,
    onActivity: (event: ActivityEvent) => void
  ) {
    this.config = config;
    this.onActivity = onActivity;
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
      '**/package-lock.json'
    ];

    this.watcher = chokidar.watch(this.config.watchPaths, {
      ignored: [...defaultIgnored, ...(this.config.ignored || [])],
      ignoreInitial: this.config.ignoreInitial ?? true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (path) => this.handleFileEvent('created', path))
      .on('change', (path) => this.handleFileEvent('modified', path))
      .on('unlink', (path) => this.handleFileEvent('deleted', path))
      .on('addDir', (path) => this.handleDirectoryEvent('created', path))
      .on('unlinkDir', (path) => this.handleDirectoryEvent('deleted', path))
      .on('error', (error) => this.handleError(error))
      .on('ready', () => {
        console.log('File system monitor is ready and watching for changes');
        this.emitSystemEvent('File system monitoring started');
      });
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.emitSystemEvent('File system monitoring stopped');
    }
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
        severity: 'low'
      }
    });
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
        severity: 'low'
      }
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
        severity: 'medium'
      }
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
        severity: 'low'
      }
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
}
// Server-side file system monitor - runs on the server only
import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import { EventEmitter } from 'events';

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: 'file_change' | 'error' | 'user_action' | 'system_event' | 'plugin_event';
  source: string;
  message: string;
  details?: {
    filePath?: string;
    changeType?: 'created' | 'modified' | 'deleted';
    linesChanged?: { added: number; removed: number };
    errorStack?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
  };
  metadata?: Record<string, any>;
}

class ServerFileSystemMonitor extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private isWatching = false;
  private watchPaths: string[] = [];

  constructor() {
    super();
    this.setupDefaultPaths();
  }

  private setupDefaultPaths() {
    const projectRoot = process.cwd();
    this.watchPaths = [
      path.join(projectRoot, 'src'),
      path.join(projectRoot, 'components'),
      path.join(projectRoot, 'lib'),
      path.join(projectRoot, 'pages'),
      path.join(projectRoot, 'app'),
    ].filter(p => {
      try {
        const fs = require('fs');
        return fs.existsSync(p);
      } catch {
        return false;
      }
    });
  }

  startWatching(): void {
    if (this.isWatching || this.watchPaths.length === 0) {
      return;
    }

    console.log('🔍 Starting file system monitoring...');
    console.log('📁 Watching paths:', this.watchPaths);

    this.watcher = chokidar.watch(this.watchPaths, {
      ignored: [
        /node_modules/,
        /\.next/,
        /\.git/,
        /\.claude-cache/,
        /dist/,
        /\.log$/,
        /\.env/,
      ],
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: 10,
    });

    this.watcher
      .on('add', (filePath: string) => this.handleFileEvent('created', filePath))
      .on('change', (filePath: string) => this.handleFileEvent('modified', filePath))
      .on('unlink', (filePath: string) => this.handleFileEvent('deleted', filePath))
      .on('error', (error: unknown) => this.handleError(error as Error))
      .on('ready', () => {
        this.isWatching = true;
        console.log('✅ File system monitoring started');
        this.emitSystemEvent('File system monitoring started');
      });
  }

  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
      console.log('⏹️ File system monitoring stopped');
      this.emitSystemEvent('File system monitoring stopped');
    }
  }

  private handleFileEvent(changeType: 'created' | 'modified' | 'deleted', filePath: string): void {
    const relativePath = path.relative(process.cwd(), filePath);
    const extension = path.extname(filePath);
    const fileName = path.basename(filePath);

    const event: ActivityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'file_change',
      source: relativePath,
      message: `File ${changeType}: ${fileName}`,
      details: {
        filePath: relativePath,
        changeType,
        severity: this.getFileSeverity(extension),
      },
      metadata: {
        extension,
        fileName,
        directory: path.dirname(relativePath),
      },
    };

    this.emit('activity', event);
    console.log(`📝 ${changeType.toUpperCase()}: ${relativePath}`);
  }

  private handleError(error: Error): void {
    const event: ActivityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'error',
      source: 'file-system-monitor',
      message: `File system monitoring error: ${error.message}`,
      details: {
        errorStack: error.stack,
        severity: 'medium',
      },
    };

    this.emit('activity', event);
    console.error('🚨 File system monitoring error:', error);
  }

  private emitSystemEvent(message: string): void {
    const event: ActivityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      type: 'system_event',
      source: 'file-system-monitor',
      message,
      details: {
        severity: 'low',
      },
    };

    this.emit('activity', event);
  }

  private getFileSeverity(extension: string): 'low' | 'medium' | 'high' {
    const highPriority = ['.ts', '.tsx', '.js', '.jsx', '.json'];
    const mediumPriority = ['.css', '.scss', '.md', '.yml', '.yaml'];
    
    if (highPriority.includes(extension)) return 'high';
    if (mediumPriority.includes(extension)) return 'medium';
    return 'low';
  }

  private generateId(): string {
    return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isActive(): boolean {
    return this.isWatching;
  }

  getWatchedPaths(): string[] {
    return [...this.watchPaths];
  }
}

// Singleton instance for the server
export const serverFileSystemMonitor = new ServerFileSystemMonitor();

// Auto-start monitoring when this module is imported
if (typeof window === 'undefined') {
  // Only run on server side
  serverFileSystemMonitor.startWatching();
}


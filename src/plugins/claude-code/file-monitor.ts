import { EventEmitter } from 'events';
import { watch, FSWatcher, existsSync } from 'fs';
import { join, dirname } from 'path';
import { readdir, stat } from 'fs/promises';

export interface ClaudeDirectoryChange {
  path: string;
  type: 'created' | 'modified' | 'deleted';
  isDirectory: boolean;
  timestamp: Date;
  size?: number;
}

export class ClaudeCodeFileMonitor extends EventEmitter {
  private watchers = new Map<string, FSWatcher>();
  private watchedPaths = new Set<string>();
  private isActive = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    console.log('[File Monitor] Initializing Claude directory monitoring...');
    this.isActive = true;
    await this.setupInitialWatchers();
  }

  async cleanup(): Promise<void> {
    console.log('[File Monitor] Cleaning up file watchers...');
    this.isActive = false;
    
    for (const [path, watcher] of this.watchers) {
      try {
        watcher.close();
        console.log(`[File Monitor] Closed watcher for: ${path}`);
      } catch (error) {
        console.error(`[File Monitor] Error closing watcher for ${path}:`, error);
      }
    }
    
    this.watchers.clear();
    this.watchedPaths.clear();
  }

  private async setupInitialWatchers(): Promise<void> {
    const commonClaudeDirectories = [
      process.cwd(), // Current working directory
      process.env.HOME || process.env.USERPROFILE || '/', // User home
    ];

    for (const baseDir of commonClaudeDirectories) {
      await this.scanForClaudeDirectories(baseDir);
    }

    // Also monitor the current working directory for new .claude directories
    await this.watchDirectory(process.cwd(), true);
  }

  private async scanForClaudeDirectories(baseDir: string, maxDepth: number = 3): Promise<void> {
    try {
      await this.scanRecursively(baseDir, 0, maxDepth);
    } catch (error) {
      console.error(`[File Monitor] Error scanning ${baseDir}:`, error);
    }
  }

  private async scanRecursively(dir: string, currentDepth: number, maxDepth: number): Promise<void> {
    if (currentDepth > maxDepth || !this.isActive) return;

    try {
      const entries = await readdir(dir);
      
      for (const entry of entries) {
        if (!this.isActive) break;
        
        const fullPath = join(dir, entry);
        
        try {
          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            if (entry === '.claude') {
              await this.watchClaudeDirectory(fullPath);
            } else if (!entry.startsWith('.') && currentDepth < maxDepth) {
              // Continue scanning non-hidden directories
              await this.scanRecursively(fullPath, currentDepth + 1, maxDepth);
            }
          }
        } catch (error) {
          // Skip files/directories we can't access
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  private async watchClaudeDirectory(claudeDir: string): Promise<void> {
    if (this.watchedPaths.has(claudeDir)) return;
    
    console.log(`[File Monitor] Watching Claude directory: ${claudeDir}`);
    
    try {
      await this.watchDirectory(claudeDir, false);
      this.watchedPaths.add(claudeDir);
    } catch (error) {
      console.error(`[File Monitor] Error watching Claude directory ${claudeDir}:`, error);
    }
  }

  private async watchDirectory(dirPath: string, recursive: boolean = false): Promise<void> {
    if (!existsSync(dirPath)) return;

    try {
      const watcher = watch(dirPath, { recursive }, async (eventType, filename) => {
        if (!this.isActive || !filename) return;

        const fullPath = join(dirPath, filename);
        
        try {
          await this.handleFileSystemEvent(eventType, fullPath);
        } catch (error) {
          console.error(`[File Monitor] Error handling event for ${fullPath}:`, error);
        }
      });

      watcher.on('error', (error) => {
        console.error(`[File Monitor] Watcher error for ${dirPath}:`, error);
        this.watchers.delete(dirPath);
      });

      this.watchers.set(dirPath, watcher);
    } catch (error) {
      console.error(`[File Monitor] Error setting up watcher for ${dirPath}:`, error);
    }
  }

  private async handleFileSystemEvent(eventType: string, filePath: string): Promise<void> {
    try {
      // Check if this is a Claude-related file change
      if (!this.isClaudeRelatedPath(filePath)) return;

      let changeType: 'created' | 'modified' | 'deleted';
      let isDirectory = false;
      let size: number | undefined;

      try {
        const stats = await stat(filePath);
        isDirectory = stats.isDirectory();
        size = stats.size;
        changeType = eventType === 'rename' ? 'created' : 'modified';
        
        // If it's a new .claude directory, start watching it
        if (isDirectory && filePath.endsWith('.claude')) {
          await this.watchClaudeDirectory(filePath);
        }
      } catch (error) {
        // File probably doesn't exist, so it was deleted
        changeType = 'deleted';
      }

      const change: ClaudeDirectoryChange = {
        path: filePath,
        type: changeType,
        isDirectory,
        timestamp: new Date(),
        size
      };

      this.emit('claude-directory-change', change);
      
      console.log(`[File Monitor] Claude file ${changeType}: ${filePath}`);
    } catch (error) {
      console.error(`[File Monitor] Error processing file system event:`, error);
    }
  }

  private isClaudeRelatedPath(filePath: string): boolean {
    const normalizedPath = filePath.toLowerCase();
    
    return normalizedPath.includes('.claude') ||
           normalizedPath.includes('claude.md') ||
           normalizedPath.includes('claude-') ||
           normalizedPath.includes('anthropic') ||
           (normalizedPath.includes('.md') && this.isInClaudeDirectory(filePath));
  }

  private isInClaudeDirectory(filePath: string): boolean {
    const pathParts = filePath.split(/[/\\]/);
    return pathParts.some(part => part === '.claude');
  }

  async addWatchPath(path: string): Promise<void> {
    if (!existsSync(path)) {
      console.warn(`[File Monitor] Path does not exist: ${path}`);
      return;
    }

    try {
      const stats = await stat(path);
      if (stats.isDirectory()) {
        await this.watchDirectory(path, true);
        console.log(`[File Monitor] Added watch for directory: ${path}`);
      } else {
        // Watch the parent directory
        const parentDir = dirname(path);
        await this.watchDirectory(parentDir, false);
        console.log(`[File Monitor] Added watch for parent directory of file: ${path}`);
      }
    } catch (error) {
      console.error(`[File Monitor] Error adding watch path ${path}:`, error);
    }
  }

  removeWatchPath(path: string): void {
    const watcher = this.watchers.get(path);
    if (watcher) {
      watcher.close();
      this.watchers.delete(path);
      this.watchedPaths.delete(path);
      console.log(`[File Monitor] Removed watch for: ${path}`);
    }
  }

  getWatchedPaths(): string[] {
    return Array.from(this.watchedPaths);
  }

  isWatching(path: string): boolean {
    return this.watchedPaths.has(path);
  }
}
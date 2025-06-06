import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ClaudeCodeProcess {
  pid: number;
  command: string;
  workingDirectory: string;
  startTime: Date;
  user: string;
}

export class ClaudeCodeProcessDetector extends EventEmitter {
  private polling = false;
  private pollInterval = 5000; // 5 seconds
  private intervalId?: NodeJS.Timeout;
  private knownProcesses = new Map<number, ClaudeCodeProcess>();

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    console.log('[Process Detector] Initializing Claude Code process detection...');
    await this.startPolling();
  }

  async cleanup(): Promise<void> {
    console.log('[Process Detector] Cleaning up...');
    this.stopPolling();
    this.knownProcesses.clear();
  }

  private async startPolling(): Promise<void> {
    if (this.polling) return;
    
    this.polling = true;
    await this.scanForClaudeProcesses();
    
    this.intervalId = setInterval(async () => {
      try {
        await this.scanForClaudeProcesses();
      } catch (error) {
        console.error('[Process Detector] Error during process scan:', error);
      }
    }, this.pollInterval);
  }

  private stopPolling(): void {
    this.polling = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  private async scanForClaudeProcesses(): Promise<void> {
    try {
      const currentProcesses = await this.getCurrentClaudeProcesses();
      const currentPids = new Set(currentProcesses.map(p => p.pid));
      
      // Check for new processes
      for (const process of currentProcesses) {
        if (!this.knownProcesses.has(process.pid)) {
          this.knownProcesses.set(process.pid, process);
          this.emit('claude-code-detected', process);
        }
      }
      
      // Check for ended processes
      for (const [pid, process] of this.knownProcesses) {
        if (!currentPids.has(pid)) {
          this.knownProcesses.delete(pid);
          this.emit('claude-code-ended', process);
        }
      }
    } catch (error) {
      console.error('[Process Detector] Error scanning for processes:', error);
    }
  }

  private async getCurrentClaudeProcesses(): Promise<ClaudeCodeProcess[]> {
    const processes: ClaudeCodeProcess[] = [];
    
    try {
      // Look for processes that might be Claude Code related
      const commands = [
        'ps aux | grep -i claude | grep -v grep',
        'ps aux | grep -i anthropic | grep -v grep',
        'ps aux | grep "code.*claude" | grep -v grep'
      ];
      
      for (const command of commands) {
        try {
          const { stdout } = await execAsync(command);
          const lines = stdout.trim().split('\n').filter(line => line.length > 0);
          
          for (const line of lines) {
            const process = this.parseProcessLine(line);
            if (process && this.isClaudeCodeProcess(process)) {
              processes.push(process);
            }
          }
        } catch (error) {
          // Command might not find anything, which is fine
        }
      }
      
      // Also check for VS Code processes with Claude extensions
      try {
        const { stdout } = await execAsync('ps aux | grep "code.*extension" | grep -v grep');
        const lines = stdout.trim().split('\n').filter(line => line.length > 0);
        
        for (const line of lines) {
          const process = this.parseProcessLine(line);
          if (process && this.hasClaudeExtension(process)) {
            processes.push(process);
          }
        }
      } catch (error) {
        // No VS Code processes found
      }
      
    } catch (error) {
      console.error('[Process Detector] Error getting current processes:', error);
    }
    
    return this.deduplicateProcesses(processes);
  }

  private parseProcessLine(line: string): ClaudeCodeProcess | null {
    try {
      // Parse ps aux output: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND
      const parts = line.trim().split(/\s+/);
      if (parts.length < 11) return null;
      
      const user = parts[0];
      const pid = parseInt(parts[1]);
      const command = parts.slice(10).join(' ');
      
      if (isNaN(pid)) return null;
      
      return {
        pid,
        command,
        workingDirectory: '/', // Will be updated asynchronously
        startTime: new Date(), // Approximate - would need more complex parsing for exact time
        user
      };
    } catch (error) {
      return null;
    }
  }

  private async getProcessWorkingDirectory(pid: number): Promise<string> {
    try {
      const { stdout } = await execAsync(`lsof -p ${pid} | grep cwd | head -1`);
      const parts = stdout.trim().split(/\s+/);
      return parts[parts.length - 1] || '/';
    } catch (error) {
      return '/';
    }
  }

  private isClaudeCodeProcess(process: ClaudeCodeProcess): boolean {
    const command = process.command.toLowerCase();
    
    return command.includes('claude') ||
           command.includes('anthropic') ||
           (command.includes('code') && (
             command.includes('claude') ||
             command.includes('ai') ||
             command.includes('assistant')
           )) ||
           command.includes('claude-code');
  }

  private hasClaudeExtension(process: ClaudeCodeProcess): boolean {
    try {
      // Check if this VS Code process has Claude-related extensions loaded
      const command = process.command.toLowerCase();
      return command.includes('claude') || 
             command.includes('anthropic') ||
             command.includes('ai-assistant');
    } catch (error) {
      return false;
    }
  }

  private deduplicateProcesses(processes: ClaudeCodeProcess[]): ClaudeCodeProcess[] {
    const seen = new Set<number>();
    return processes.filter(process => {
      if (seen.has(process.pid)) {
        return false;
      }
      seen.add(process.pid);
      return true;
    });
  }

  getKnownProcesses(): ClaudeCodeProcess[] {
    return Array.from(this.knownProcesses.values());
  }

  isProcessActive(pid: number): boolean {
    return this.knownProcesses.has(pid);
  }
}
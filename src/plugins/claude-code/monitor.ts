import { EventEmitter } from 'events';
import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { join, extname, dirname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface TaskVerification {
  taskId: string;
  stopReason: 'completed' | 'error' | 'api_failure' | 'timeout' | 'user_stop';
  actuallyCompleted: boolean;
  verificationMethod: 'file_check' | 'build_test' | 'manual_confirm';
  expectedOutputs: string[];
  actualOutputs: string[];
  escalationPath: 'claude_message' | 'queue_retry' | 'user_notify';
  confidence: number;
  timestamp: Date;
  workingDirectory: string;
}

export interface TaskRequest {
  id: string;
  description: string;
  workingDirectory: string;
  expectedFiles?: string[];
  expectedDirectories?: string[];
  buildCommand?: string;
  testCommand?: string;
  successCriteria?: string[];
  timeout?: number;
  startTime: Date;
}

export interface ProcessInfo {
  pid: number;
  command: string;
  workingDirectory: string;
  startTime: Date;
  user: string;
  status: 'running' | 'completed' | 'failed' | 'unknown';
}

export class ClaudeCodeMonitor extends EventEmitter {
  private activeVerifications = new Map<string, TaskRequest>();
  private verificationHistory = new Map<string, TaskVerification>();
  private isActive = false;
  private checkInterval = 10000; // 10 seconds
  private intervalId?: NodeJS.Timeout;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    console.log('[Claude Code Monitor] Initializing task completion verification...');
    this.isActive = true;
    
    // Start periodic verification checks
    this.startPeriodicVerification();
  }

  async cleanup(): Promise<void> {
    console.log('[Claude Code Monitor] Cleaning up task monitor...');
    this.isActive = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    this.activeVerifications.clear();
    this.verificationHistory.clear();
  }

  // Detect running Claude Code processes
  async detectClaudeCodeProcess(): Promise<ProcessInfo[]> {
    const processes: ProcessInfo[] = [];
    
    try {
      // Look for processes that might be Claude Code related
      const commands = [
        'ps aux | grep -i "claude.*code\\|code.*claude" | grep -v grep',
        'ps aux | grep -i "anthropic" | grep -v grep',
        'ps aux | grep "extension.*claude" | grep -v grep'
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
    } catch (error) {
      console.error('[Claude Code Monitor] Error detecting processes:', error);
    }
    
    return this.deduplicateProcesses(processes);
  }

  // Monitor .claude/ directories for changes
  setupFileWatchers(projectPaths: string[]): void {
    console.log('[Claude Code Monitor] Setting up file watchers for project paths:', projectPaths);
    
    for (const projectPath of projectPaths) {
      this.watchClaudeDirectory(projectPath);
    }
  }

  // Post-task verification - the core functionality
  async verifyTaskCompletion(task: TaskRequest): Promise<TaskVerification> {
    console.log(`[Claude Code Monitor] Verifying task completion: ${task.id}`);
    
    const verification: TaskVerification = {
      taskId: task.id,
      stopReason: 'completed', // Will be updated based on checks
      actuallyCompleted: false,
      verificationMethod: 'file_check',
      expectedOutputs: task.expectedFiles || [],
      actualOutputs: [],
      escalationPath: 'claude_message',
      confidence: 0,
      timestamp: new Date(),
      workingDirectory: task.workingDirectory
    };

    try {
      // 1. File existence verification
      const fileCheckResult = await this.verifyExpectedFiles(task);
      verification.actualOutputs = fileCheckResult.foundFiles;
      verification.confidence += fileCheckResult.confidence;

      // 2. Build/syntax check if applicable
      if (task.buildCommand) {
        const buildResult = await this.runBuildCheck(task);
        verification.verificationMethod = 'build_test';
        verification.confidence += buildResult.confidence;
        
        if (!buildResult.success) {
          verification.stopReason = 'error';
          verification.escalationPath = 'claude_message';
        }
      }

      // 3. Test execution if available
      if (task.testCommand) {
        const testResult = await this.runTestCheck(task);
        verification.confidence += testResult.confidence;
        
        if (!testResult.success) {
          verification.stopReason = 'error';
          verification.escalationPath = 'queue_retry';
        }
      }

      // 4. Success criteria evaluation
      if (task.successCriteria) {
        const criteriaResult = await this.evaluateSuccessCriteria(task);
        verification.confidence += criteriaResult.confidence;
      }

      // Determine if task actually completed
      verification.actuallyCompleted = verification.confidence >= 0.7; // 70% confidence threshold
      
      // Determine escalation path based on results
      if (!verification.actuallyCompleted) {
        if (verification.confidence < 0.3) {
          verification.escalationPath = 'user_notify';
        } else if (verification.confidence < 0.6) {
          verification.escalationPath = 'queue_retry';
        } else {
          verification.escalationPath = 'claude_message';
        }
      }

      console.log(`[Claude Code Monitor] Task ${task.id} verification complete: ${verification.actuallyCompleted ? 'SUCCESS' : 'FAILED'} (confidence: ${Math.round(verification.confidence * 100)}%)`);
      
    } catch (error) {
      console.error(`[Claude Code Monitor] Error verifying task ${task.id}:`, error);
      verification.stopReason = 'error';
      verification.escalationPath = 'user_notify';
    }

    // Store verification result
    this.verificationHistory.set(task.id, verification);
    
    // Emit verification complete event
    this.emit('task-verification-complete', verification);
    
    return verification;
  }

  async startTaskTracking(task: TaskRequest): Promise<void> {
    console.log(`[Claude Code Monitor] Starting task tracking: ${task.id}`);
    this.activeVerifications.set(task.id, task);
    
    // Set timeout if specified
    if (task.timeout) {
      setTimeout(() => {
        this.handleTaskTimeout(task.id);
      }, task.timeout);
    }
  }

  async stopTaskTracking(taskId: string): Promise<TaskVerification | null> {
    const task = this.activeVerifications.get(taskId);
    if (!task) {
      console.warn(`[Claude Code Monitor] No active task found with ID: ${taskId}`);
      return null;
    }

    this.activeVerifications.delete(taskId);
    return await this.verifyTaskCompletion(task);
  }

  private async verifyExpectedFiles(task: TaskRequest): Promise<{ foundFiles: string[]; confidence: number }> {
    const foundFiles: string[] = [];
    let totalExpected = 0;
    let totalFound = 0;

    // Check expected files
    if (task.expectedFiles) {
      totalExpected += task.expectedFiles.length;
      
      for (const expectedFile of task.expectedFiles) {
        const fullPath = join(task.workingDirectory, expectedFile);
        if (existsSync(fullPath)) {
          foundFiles.push(expectedFile);
          totalFound++;
        }
      }
    }

    // Check expected directories
    if (task.expectedDirectories) {
      totalExpected += task.expectedDirectories.length;
      
      for (const expectedDir of task.expectedDirectories) {
        const fullPath = join(task.workingDirectory, expectedDir);
        if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
          foundFiles.push(expectedDir);
          totalFound++;
        }
      }
    }

    // If no expected outputs specified, scan for common output patterns
    if (totalExpected === 0) {
      const detectedFiles = await this.detectCommonOutputs(task.workingDirectory);
      foundFiles.push(...detectedFiles);
      totalFound = detectedFiles.length;
      totalExpected = 1; // Assume at least one output was expected
    }

    const confidence = totalExpected > 0 ? totalFound / totalExpected : 0;
    return { foundFiles, confidence };
  }

  private async runBuildCheck(task: TaskRequest): Promise<{ success: boolean; confidence: number; output: string }> {
    try {
      console.log(`[Claude Code Monitor] Running build check: ${task.buildCommand}`);
      
      const { stdout, stderr } = await execAsync(task.buildCommand!, {
        cwd: task.workingDirectory,
        timeout: 30000 // 30 second timeout
      });

      const output = stdout + stderr;
      const success = !output.toLowerCase().includes('error') && 
                     !output.toLowerCase().includes('failed') &&
                     !output.toLowerCase().includes('compilation error');

      return {
        success,
        confidence: success ? 0.3 : -0.2, // Build success adds 30% confidence, failure subtracts 20%
        output
      };
    } catch (error) {
      console.error(`[Claude Code Monitor] Build check failed:`, error);
      return {
        success: false,
        confidence: -0.3, // Build failure significantly reduces confidence
        output: error instanceof Error ? error.message : 'Build check failed'
      };
    }
  }

  private async runTestCheck(task: TaskRequest): Promise<{ success: boolean; confidence: number; output: string }> {
    try {
      console.log(`[Claude Code Monitor] Running test check: ${task.testCommand}`);
      
      const { stdout, stderr } = await execAsync(task.testCommand!, {
        cwd: task.workingDirectory,
        timeout: 60000 // 60 second timeout for tests
      });

      const output = stdout + stderr;
      const success = !output.toLowerCase().includes('failed') &&
                     !output.toLowerCase().includes('error') &&
                     (output.toLowerCase().includes('passed') || 
                      output.toLowerCase().includes('success') ||
                      output.toLowerCase().includes('ok'));

      return {
        success,
        confidence: success ? 0.2 : -0.1, // Test success adds 20% confidence
        output
      };
    } catch (error) {
      console.error(`[Claude Code Monitor] Test check failed:`, error);
      return {
        success: false,
        confidence: -0.2, // Test failure reduces confidence
        output: error instanceof Error ? error.message : 'Test check failed'
      };
    }
  }

  private async evaluateSuccessCriteria(task: TaskRequest): Promise<{ confidence: number; met: boolean }> {
    let totalCriteria = task.successCriteria!.length;
    let metCriteria = 0;

    for (const criteria of task.successCriteria!) {
      const met = await this.evaluateSingleCriteria(criteria, task);
      if (met) metCriteria++;
    }

    const confidence = totalCriteria > 0 ? (metCriteria / totalCriteria) * 0.2 : 0; // Up to 20% confidence
    return { confidence, met: metCriteria === totalCriteria };
  }

  private async evaluateSingleCriteria(criteria: string, task: TaskRequest): Promise<boolean> {
    // Simple criteria evaluation - can be enhanced
    const lowerCriteria = criteria.toLowerCase();
    
    if (lowerCriteria.includes('file exists:')) {
      const filename = criteria.substring(criteria.indexOf(':') + 1).trim();
      return existsSync(join(task.workingDirectory, filename));
    }
    
    if (lowerCriteria.includes('contains:')) {
      // Format: "file.txt contains: text"
      const parts = criteria.split('contains:');
      if (parts.length === 2) {
        const filename = parts[0].trim();
        const text = parts[1].trim();
        const filepath = join(task.workingDirectory, filename);
        
        if (existsSync(filepath)) {
          const content = readFileSync(filepath, 'utf-8');
          return content.includes(text);
        }
      }
    }
    
    // Default: assume criteria is met if no specific check
    return true;
  }

  private async detectCommonOutputs(workingDir: string): Promise<string[]> {
    const outputs: string[] = [];
    
    try {
      const files = readdirSync(workingDir);
      
      // Look for common output patterns
      for (const file of files) {
        const fullPath = join(workingDir, file);
        const stat = statSync(fullPath);
        
        if (stat.isFile()) {
          const ext = extname(file).toLowerCase();
          
          // Check if it's a common output file type
          if (['.js', '.ts', '.py', '.go', '.java', '.cpp', '.c', '.rs'].includes(ext) ||
              file.includes('output') || file.includes('result') ||
              file.startsWith('build') || file.startsWith('dist')) {
            outputs.push(file);
          }
        } else if (stat.isDirectory()) {
          // Check for common output directories
          if (['build', 'dist', 'output', 'target', 'bin', 'out'].includes(file)) {
            outputs.push(file);
          }
        }
      }
    } catch (error) {
      console.error('[Claude Code Monitor] Error scanning for outputs:', error);
    }
    
    return outputs;
  }

  private startPeriodicVerification(): void {
    this.intervalId = setInterval(async () => {
      if (!this.isActive) return;
      
      for (const [taskId, task] of this.activeVerifications) {
        // Check if task has been running too long without verification
        const runningTime = Date.now() - task.startTime.getTime();
        const maxRunTime = task.timeout || 300000; // 5 minutes default
        
        if (runningTime > maxRunTime) {
          console.log(`[Claude Code Monitor] Task ${taskId} exceeded max runtime, triggering verification`);
          await this.stopTaskTracking(taskId);
        }
      }
    }, this.checkInterval);
  }

  private async handleTaskTimeout(taskId: string): Promise<void> {
    const task = this.activeVerifications.get(taskId);
    if (!task) return;

    console.log(`[Claude Code Monitor] Task ${taskId} timed out`);
    
    const verification = await this.verifyTaskCompletion(task);
    verification.stopReason = 'timeout';
    verification.escalationPath = 'user_notify';
    
    this.activeVerifications.delete(taskId);
    this.emit('task-timeout', verification);
  }

  private watchClaudeDirectory(projectPath: string): void {
    const claudeDir = join(projectPath, '.claude');
    
    if (existsSync(claudeDir)) {
      console.log(`[Claude Code Monitor] Watching Claude directory: ${claudeDir}`);
      // File watching would be implemented here
      // This integrates with the existing file monitor
    }
  }

  private parseProcessLine(line: string): ProcessInfo | null {
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
        workingDirectory: '/', // Will be updated if needed
        startTime: new Date(), // Approximate
        user,
        status: 'running'
      };
    } catch (error) {
      return null;
    }
  }

  private isClaudeCodeProcess(process: ProcessInfo): boolean {
    const command = process.command.toLowerCase();
    
    return command.includes('claude') ||
           command.includes('anthropic') ||
           (command.includes('code') && (
             command.includes('claude') ||
             command.includes('ai') ||
             command.includes('assistant')
           ));
  }

  private deduplicateProcesses(processes: ProcessInfo[]): ProcessInfo[] {
    const seen = new Set<number>();
    return processes.filter(process => {
      if (seen.has(process.pid)) {
        return false;
      }
      seen.add(process.pid);
      return true;
    });
  }

  // Public API methods
  getActiveVerifications(): Map<string, TaskRequest> {
    return new Map(this.activeVerifications);
  }

  getVerificationHistory(): Map<string, TaskVerification> {
    return new Map(this.verificationHistory);
  }

  async getVerificationStats(): Promise<{
    total: number;
    completed: number;
    failed: number;
    successRate: number;
  }> {
    const total = this.verificationHistory.size;
    const completed = Array.from(this.verificationHistory.values())
      .filter(v => v.actuallyCompleted).length;
    const failed = total - completed;
    const successRate = total > 0 ? completed / total : 0;

    return { total, completed, failed, successRate };
  }
}
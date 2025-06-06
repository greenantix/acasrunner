import { Plugin, PluginPermission, ActivityEvent, PluginAPI, FileChangeEvent } from '../../types/plugin';
import { ClaudeCodeProcessDetector } from './process-detector';
import { ClaudeCodeFileMonitor } from './file-monitor';
import { ClaudeCodeEscalationHandler } from './escalation-handler';
import { ClaudeCodeHistoryManager } from './history-manager';
import { StruggleManager } from './struggle-settings';
import { ClaudeCodeMonitor, TaskRequest, TaskVerification } from './monitor';
import { WSLOptimizer, SystemInfo, WSLPathMapping, TurboPromptEnhancement } from './wsl-optimizer';
import { DriftDetector, ImportViolation, DriftAction, HealthReport, FixRecommendation, PackageJson } from './drift-detector';

export class ClaudeCodePlugin implements Plugin {
  id = 'claude-code';
  name = 'Claude Code Integration';
  version = '1.0.0';
  author = 'leo Runner Team';
  description = 'Monitors Claude Code processes and provides seamless integration with leo Runner';
  
  permissions: PluginPermission[] = [
    {
      type: 'file_read',
      scope: '.claude/',
      description: 'Read Claude configuration files'
    },
    {
      type: 'file_write',
      scope: '.claude/',
      description: 'Write Claude session data'
    },
    {
      type: 'shell_exec',
      description: 'Monitor system processes for Claude Code'
    },
    {
      type: 'ai_access',
      description: 'Access AI services for error escalation'
    },
    {
      type: 'storage',
      description: 'Store session history and metadata'
    }
  ];

  defaultConfig = {
    autoEscalate: true,
    severityThreshold: 'medium',
    monitorInterval: 5000,
    maxStoredSessions: 1000
  };

  private processDetector: ClaudeCodeProcessDetector;
  private fileMonitor: ClaudeCodeFileMonitor;
  private escalationHandler: ClaudeCodeEscalationHandler;
  private historyManager: ClaudeCodeHistoryManager;
  private struggleManager: StruggleManager;
  private taskMonitor: ClaudeCodeMonitor;
  private wslOptimizer: WSLOptimizer;
  private driftDetector: DriftDetector;
  private isActive = false;
  private api?: PluginAPI;

  constructor() {
    this.struggleManager = new StruggleManager();
    this.processDetector = new ClaudeCodeProcessDetector();
    this.fileMonitor = new ClaudeCodeFileMonitor();
    this.escalationHandler = new ClaudeCodeEscalationHandler(this.struggleManager);
    this.historyManager = new ClaudeCodeHistoryManager();
    this.taskMonitor = new ClaudeCodeMonitor();
    this.wslOptimizer = new WSLOptimizer();
    this.driftDetector = new DriftDetector();
  }

  async onLoad(api: PluginAPI): Promise<void> {
    this.api = api;
    api.log.info('Claude Code plugin loaded');
  }

  async onEnable(api: PluginAPI): Promise<void> {
    this.api = api;
    await this.initialize();
    api.log.info('Claude Code plugin enabled');
  }

  async onDisable(api: PluginAPI): Promise<void> {
    await this.cleanup();
    api.log.info('Claude Code plugin disabled');
  }

  async onUnload(api: PluginAPI): Promise<void> {
    await this.cleanup();
    api.log.info('Claude Code plugin unloaded');
  }

  async initialize(): Promise<void> {
    console.log('[Claude Code Plugin] Initializing...');
    
    await this.struggleManager.initialize();
    await this.processDetector.initialize();
    await this.fileMonitor.initialize();
    await this.escalationHandler.initialize();
    await this.historyManager.initialize();
    await this.taskMonitor.initialize();
    await this.wslOptimizer.initialize();
    await this.driftDetector.initialize();

    this.setupEventHandlers();
    this.isActive = true;
    
    const systemInfo = this.wslOptimizer.getSystemInfo();
    const envType = systemInfo?.isWSL ? `WSL (${systemInfo.wslDistro})` : 'Native Linux';
    console.log(`[Claude Code Plugin] ✅ Initialized successfully with task verification, struggle settings, drift detection, and system optimization for ${envType}`);
  }

  async cleanup(): Promise<void> {
    console.log('[Claude Code Plugin] Cleaning up...');
    
    this.isActive = false;
    
    await this.processDetector.cleanup();
    await this.fileMonitor.cleanup();
    await this.escalationHandler.cleanup();
    await this.historyManager.cleanup();
    await this.struggleManager.cleanup();
    await this.taskMonitor.cleanup();
    await this.wslOptimizer.cleanup();
    await this.driftDetector.cleanup();
    
    console.log('[Claude Code Plugin] Cleaned up successfully');
  }

  async onActivity(event: ActivityEvent): Promise<void> {
    if (!this.isActive) return;

    try {
      await this.handleActivityEvent(event);
      await this.historyManager.recordActivity(event);
    } catch (error) {
      console.error('[Claude Code Plugin] Error handling activity event:', error);
      this.api?.log.error('Error handling activity event', error);
    }
  }

  async onFileChange(event: FileChangeEvent): Promise<void> {
    if (!this.isActive) return;

    try {
      if (event.filePath.includes('.claude/')) {
        console.log(`[Claude Code Plugin] Detected Claude file change: ${event.filePath}`);
        
        const activityEvent: ActivityEvent = {
          id: `claude-file-${Date.now()}`,
          timestamp: event.timestamp,
          type: 'file_change',
          source: 'claude-code-plugin',
          message: `Claude file ${event.changeType}: ${event.filePath}`,
          details: {
            filePath: event.filePath,
            changeType: event.changeType
          }
        };

        await this.handleActivityEvent(activityEvent);
      }
    } catch (error) {
      console.error('[Claude Code Plugin] Error handling file change:', error);
      this.api?.log.error('Error handling file change', error);
    }
  }

  async onError(error: any, userId?: string): Promise<void> {
    if (!this.isActive) return;

    try {
      // Get userId from API context if not provided
      const currentUserId = userId || this.api?.auth?.userId || 'anonymous';
      
      const pattern = await this.escalationHandler.analyzeError(error, currentUserId);
      
      // Log struggle action if present
      if (pattern.struggleAction) {
        console.log(`[Claude Code Plugin] Struggle action: ${pattern.struggleAction.action} - ${pattern.struggleAction.reason}`);
        
        // Notify user if struggle was auto-disabled
        if (pattern.struggleAction.shouldNotifyUser) {
          console.log(`[Claude Code Plugin] 🛡️ Auto-disabled repeated issue: ${pattern.type}`);
        }
      }
      
      if (pattern.shouldEscalate) {
        console.log(`[Claude Code Plugin] Escalating error: ${pattern.severity}`);
        
        if (this.api) {
          await this.api.escalation.trigger({
            type: pattern.type,
            severity: pattern.severity,
            message: pattern.description,
            context: error,
            plugin: 'claude-code'
          });
        }
      } else if (pattern.struggleAction?.action === 'ignore' || pattern.struggleAction?.action === 'auto_disabled') {
        console.log(`[Claude Code Plugin] 🚫 Skipped escalation due to struggle settings: ${pattern.type}`);
      }
    } catch (escalationError) {
      console.error('[Claude Code Plugin] Error during error escalation:', escalationError);
      this.api?.log.error('Error during error escalation', escalationError);
    }
  }

  private async handleActivityEvent(event: ActivityEvent): Promise<void> {
    switch (event.type) {
      case 'file_change':
        if (event.details?.filePath?.includes('.claude/')) {
          await this.analyzeClaudeFile(event.details.filePath);
        }
        break;
      case 'error':
        await this.handleError(event);
        break;
      case 'system_event':
        if (event.message.includes('claude') || event.message.includes('process')) {
          await this.handleProcessEvent(event);
        }
        break;
      default:
        break;
    }
  }

  private setupEventHandlers(): void {
    this.processDetector.on('claude-code-detected', (processInfo) => {
      const activityEvent: ActivityEvent = {
        id: `claude-process-start-${Date.now()}`,
        timestamp: new Date(),
        type: 'system_event',
        source: 'claude-code-plugin',
        message: `Claude Code process started: PID ${processInfo.pid}`,
        metadata: { processInfo }
      };
      this.onActivity(activityEvent);
      this.historyManager.startSession(processInfo);
    });

    this.processDetector.on('claude-code-ended', (processInfo) => {
      const activityEvent: ActivityEvent = {
        id: `claude-process-end-${Date.now()}`,
        timestamp: new Date(),
        type: 'system_event',
        source: 'claude-code-plugin',
        message: `Claude Code process ended: PID ${processInfo.pid}`,
        metadata: { processInfo }
      };
      this.onActivity(activityEvent);
      this.historyManager.endSession(processInfo);
    });

    this.fileMonitor.on('claude-directory-change', (changeInfo) => {
      const activityEvent: ActivityEvent = {
        id: `claude-file-${Date.now()}`,
        timestamp: new Date(),
        type: 'file_change',
        source: 'claude-code-plugin',
        message: `Claude file ${changeInfo.type}: ${changeInfo.path}`,
        details: {
          filePath: changeInfo.path,
          changeType: changeInfo.type
        },
        metadata: { changeInfo }
      };
      this.onActivity(activityEvent);
    });

    // Task Monitor event handlers
    this.taskMonitor.on('task-verification-complete', (verification: TaskVerification) => {
      const activityEvent: ActivityEvent = {
        id: `task-verification-${Date.now()}`,
        timestamp: new Date(),
        type: 'plugin_event',
        source: 'claude-code-plugin',
        message: `Task verification ${verification.actuallyCompleted ? 'PASSED' : 'FAILED'}: ${verification.taskId}`,
        details: {
          severity: verification.actuallyCompleted ? 'low' : 'medium'
        },
        metadata: { verification }
      };
      this.onActivity(activityEvent);

      // Handle escalation based on verification result
      if (!verification.actuallyCompleted) {
        this.handleTaskFailure(verification);
      }
    });

    this.taskMonitor.on('task-timeout', (verification: TaskVerification) => {
      const activityEvent: ActivityEvent = {
        id: `task-timeout-${Date.now()}`,
        timestamp: new Date(),
        type: 'error',
        source: 'claude-code-plugin',
        message: `Task timed out: ${verification.taskId}`,
        details: {
          severity: 'high'
        },
        metadata: { verification }
      };
      this.onActivity(activityEvent);
      this.handleTaskFailure(verification);
    });

    // WSL Optimizer event handlers
    this.wslOptimizer.on('wsl-ready', (wslInfo) => {
      const activityEvent: ActivityEvent = {
        id: `wsl-ready-${Date.now()}`,
        timestamp: new Date(),
        type: 'system_event',
        source: 'claude-code-plugin',
        message: `WSL environment ready: ${wslInfo.distro}`,
        details: {
          severity: 'low'
        },
        metadata: { wslInfo }
      };
      this.onActivity(activityEvent);
    });

    // Drift Detector event handlers
    this.driftDetector.on('baseline-loaded', (baselineInfo) => {
      const activityEvent: ActivityEvent = {
        id: `drift-baseline-${Date.now()}`,
        timestamp: new Date(),
        type: 'plugin_event',
        source: 'claude-code-plugin',
        message: `Package.json baseline loaded for drift detection: ${baselineInfo.projectPath}`,
        details: {
          severity: 'low'
        },
        metadata: { baselineInfo }
      };
      this.onActivity(activityEvent);
    });

    this.driftDetector.on('health-check-complete', (healthReport) => {
      const activityEvent: ActivityEvent = {
        id: `drift-health-${Date.now()}`,
        timestamp: new Date(),
        type: 'plugin_event',
        source: 'claude-code-plugin',
        message: `Dependency health check complete: ${healthReport.outdatedDependencies.length} outdated, ${healthReport.securityVulnerabilities.length} vulnerabilities`,
        details: {
          severity: healthReport.securityVulnerabilities.length > 0 ? 'high' : 
                   healthReport.outdatedDependencies.length > 5 ? 'medium' : 'low'
        },
        metadata: { healthReport }
      };
      this.onActivity(activityEvent);

      // Auto-escalate security vulnerabilities
      if (healthReport.securityVulnerabilities.length > 0) {
        this.handleSecurityVulnerabilities(healthReport.securityVulnerabilities);
      }
    });
  }

  private async handleProcessEvent(event: ActivityEvent): Promise<void> {
    const processInfo = event.metadata?.processInfo;
    
    if (event.message.includes('started')) {
      console.log(`[Claude Code Plugin] Claude Code process started: PID ${processInfo?.pid}`);
      if (processInfo) {
        await this.historyManager.startSession(processInfo);
      }
    } else if (event.message.includes('ended')) {
      console.log(`[Claude Code Plugin] Claude Code process ended: PID ${processInfo?.pid}`);
      if (processInfo) {
        await this.historyManager.endSession(processInfo);
      }
    }
  }

  private isClaudeCodeCommand(command: string): boolean {
    return command.includes('claude') || 
           command.includes('anthropic') ||
           command.startsWith('code ') ||
           command.includes('.claude/');
  }

  private async analyzeClaudeFile(filePath: string): Promise<void> {
    try {
      console.log(`[Claude Code Plugin] Analyzing Claude file: ${filePath}`);
      
      if (this.api?.files) {
        const exists = await this.api.files.exists(filePath);
        if (exists) {
          const content = await this.api.files.read(filePath);
          
          const analysisEvent: ActivityEvent = {
            id: `claude-analysis-${Date.now()}`,
            timestamp: new Date(),
            type: 'plugin_event',
            source: 'claude-code-plugin',
            message: `Analyzed Claude file: ${filePath}`,
            details: {
              filePath,
              contentLength: content.length
            }
          };
          
          await this.onActivity(analysisEvent);
        }
      }
    } catch (error) {
      console.error(`[Claude Code Plugin] Error analyzing file ${filePath}:`, error);
      this.api?.log.error(`Error analyzing Claude file: ${filePath}`, error);
    }
  }

  // Public API for struggle management
  async getStruggleSettings(userId: string): Promise<any> {
    try {
      return await this.struggleManager.loadSettings(userId);
    } catch (error) {
      console.error('[Claude Code Plugin] Error loading struggle settings:', error);
      throw error;
    }
  }

  async exportStruggleSettings(userId: string): Promise<string> {
    try {
      return await this.struggleManager.exportSettings(userId);
    } catch (error) {
      console.error('[Claude Code Plugin] Error exporting struggle settings:', error);
      throw error;
    }
  }

  async importStruggleSettings(userId: string, settingsJson: string): Promise<boolean> {
    try {
      return await this.struggleManager.importSettings(userId, settingsJson);
    } catch (error) {
      console.error('[Claude Code Plugin] Error importing struggle settings:', error);
      return false;
    }
  }

  async resetUserStruggles(userId: string): Promise<void> {
    try {
      await this.struggleManager.resetUserStruggles(userId);
    } catch (error) {
      console.error('[Claude Code Plugin] Error resetting user struggles:', error);
      throw error;
    }
  }

  getAvailableStruggleTypes() {
    return this.struggleManager.getStruggleTypes();
  }

  // Task failure handling with escalation
  private async handleTaskFailure(verification: TaskVerification): Promise<void> {
    try {
      console.log(`[Claude Code Plugin] Handling task failure: ${verification.taskId} (${verification.escalationPath})`);

      // Create escalation event based on verification result
      if (this.api) {
        await this.api.escalation.trigger({
          type: 'task-verification-failure',
          severity: verification.confidence < 0.3 ? 'high' : 'medium',
          message: `Task verification failed for ${verification.taskId}. Expected: [${verification.expectedOutputs.join(', ')}], Found: [${verification.actualOutputs.join(', ')}]`,
          context: {
            verification,
            escalationPath: verification.escalationPath,
            confidence: verification.confidence,
            stopReason: verification.stopReason
          },
          plugin: 'claude-code'
        });
      }

      // Take action based on escalation path
      switch (verification.escalationPath) {
        case 'claude_message':
          console.log(`[Claude Code Plugin] 💬 Immediate Claude escalation for task: ${verification.taskId}`);
          break;
        case 'queue_retry':
          console.log(`[Claude Code Plugin] 🔄 Queuing retry for task: ${verification.taskId}`);
          break;
        case 'user_notify':
          console.log(`[Claude Code Plugin] 🔔 User notification required for task: ${verification.taskId}`);
          break;
      }
    } catch (error) {
      console.error('[Claude Code Plugin] Error handling task failure:', error);
    }
  }

  // Public API for task management
  async startTaskTracking(task: TaskRequest): Promise<void> {
    try {
      await this.taskMonitor.startTaskTracking(task);
      console.log(`[Claude Code Plugin] ✅ Started tracking task: ${task.id}`);
    } catch (error) {
      console.error('[Claude Code Plugin] Error starting task tracking:', error);
      throw error;
    }
  }

  async stopTaskTracking(taskId: string): Promise<TaskVerification | null> {
    try {
      const verification = await this.taskMonitor.stopTaskTracking(taskId);
      console.log(`[Claude Code Plugin] ⏹️ Stopped tracking task: ${taskId}`);
      return verification;
    } catch (error) {
      console.error('[Claude Code Plugin] Error stopping task tracking:', error);
      throw error;
    }
  }

  async verifyTaskCompletion(task: TaskRequest): Promise<TaskVerification> {
    try {
      return await this.taskMonitor.verifyTaskCompletion(task);
    } catch (error) {
      console.error('[Claude Code Plugin] Error verifying task completion:', error);
      throw error;
    }
  }

  getActiveVerifications(): Map<string, TaskRequest> {
    return this.taskMonitor.getActiveVerifications();
  }

  getVerificationHistory(): Map<string, TaskVerification> {
    return this.taskMonitor.getVerificationHistory();
  }

  async getVerificationStats(): Promise<{
    total: number;
    completed: number;
    failed: number;
    successRate: number;
  }> {
    return await this.taskMonitor.getVerificationStats();
  }

  async detectClaudeCodeProcesses(): Promise<any[]> {
    try {
      return await this.taskMonitor.detectClaudeCodeProcess();
    } catch (error) {
      console.error('[Claude Code Plugin] Error detecting Claude Code processes:', error);
      return [];
    }
  }

  // Enhanced status with task verification stats
  async getStatus(userId?: string): Promise<{ active: boolean; stats: any }> {
    const baseStats = {
      activeSessions: await this.historyManager.getActiveSessionCount(),
      totalEvents: await this.historyManager.getTotalEventCount(),
      lastActivity: await this.historyManager.getLastActivityTime(),
      taskVerification: await this.getVerificationStats(),
      activeTaskVerifications: this.getActiveVerifications().size,
      systemInfo: this.wslOptimizer.getSystemInfo(),
      pathCacheStats: this.wslOptimizer.getPathCacheStats()
    };

    // Add struggle statistics if userId is provided
    if (userId) {
      try {
        const struggleStats = await this.struggleManager.getUserStruggleStats(userId);
        baseStats.struggles = struggleStats;
      } catch (error) {
        console.error('[Claude Code Plugin] Error getting struggle stats:', error);
      }
    }

    return {
      active: this.isActive,
      stats: baseStats
    };
  }

  // WSL Optimizer public API
  async generateTurboPrompt(basePrompt?: string): Promise<TurboPromptEnhancement> {
    try {
      return this.wslOptimizer.generateTurboPrompt(basePrompt);
    } catch (error) {
      console.error('[Claude Code Plugin] Error generating turbo prompt:', error);
      throw error;
    }
  }

  async translatePath(path: string): Promise<WSLPathMapping> {
    try {
      return await this.wslOptimizer.translatePath(path);
    } catch (error) {
      console.error('[Claude Code Plugin] Error translating path:', error);
      throw error;
    }
  }

  async batchTranslatePaths(paths: string[]): Promise<WSLPathMapping[]> {
    try {
      return await this.wslOptimizer.batchTranslatePaths(paths);
    } catch (error) {
      console.error('[Claude Code Plugin] Error batch translating paths:', error);
      throw error;
    }
  }

  async getOptimizedCommand(command: string, workingDir?: string): Promise<string> {
    try {
      return await this.wslOptimizer.getOptimizedCommand(command, workingDir);
    } catch (error) {
      console.error('[Claude Code Plugin] Error optimizing command:', error);
      throw error;
    }
  }

  getSystemInfo(): SystemInfo | undefined {
    return this.wslOptimizer.getSystemInfo();
  }

  clearPathCache(): void {
    this.wslOptimizer.clearPathCache();
  }

  // Security vulnerability handler
  private async handleSecurityVulnerabilities(vulnerabilities: any[]): Promise<void> {
    try {
      console.log(`[Claude Code Plugin] 🚨 Security vulnerabilities detected: ${vulnerabilities.length}`);

      if (this.api) {
        await this.api.escalation.trigger({
          type: 'security-vulnerabilities',
          severity: 'high',
          message: `${vulnerabilities.length} security vulnerabilities detected in dependencies`,
          context: {
            vulnerabilities,
            escalationPath: 'user_notify'
          },
          plugin: 'claude-code'
        });
      }
    } catch (error) {
      console.error('[Claude Code Plugin] Error handling security vulnerabilities:', error);
    }
  }

  // Drift Detector public API
  async checkImportViolation(importStatement: string, filePath: string, line?: number): Promise<ImportViolation | null> {
    try {
      const violation = await this.driftDetector.checkImportViolation(importStatement, filePath, line);
      
      if (violation) {
        const action = await this.driftDetector.processViolation(violation);
        console.log(`[Claude Code Plugin] Import violation: ${action.action} - ${action.reason}`);
        
        // Handle drift action
        if (action.action === 'pause_session') {
          console.log(`[Claude Code Plugin] ⏸️ Session paused due to import violations`);
          
          if (this.api) {
            await this.api.escalation.trigger({
              type: 'import-violations-threshold',
              severity: 'medium',
              message: action.reason,
              context: { action, violation },
              plugin: 'claude-code'
            });
          }
        }
      }
      
      return violation;
    } catch (error) {
      console.error('[Claude Code Plugin] Error checking import violation:', error);
      return null;
    }
  }

  async getDependencyHealth(): Promise<HealthReport> {
    try {
      return await this.driftDetector.checkDependencyHealth();
    } catch (error) {
      console.error('[Claude Code Plugin] Error getting dependency health:', error);
      throw error;
    }
  }

  async researchDependencyFix(dependency: string): Promise<FixRecommendation> {
    try {
      return await this.driftDetector.researchDependencyFix(dependency);
    } catch (error) {
      console.error('[Claude Code Plugin] Error researching dependency fix:', error);
      throw error;
    }
  }

  getViolationQueue(): ImportViolation[] {
    return this.driftDetector.getViolationQueue();
  }

  clearViolationQueue(): void {
    this.driftDetector.clearViolationQueue();
  }

  getPackageJsonBaseline(): PackageJson | undefined {
    return this.driftDetector.getBaseline();
  }

  async refreshDriftBaseline(): Promise<void> {
    try {
      await this.driftDetector.refreshBaseline();
    } catch (error) {
      console.error('[Claude Code Plugin] Error refreshing drift baseline:', error);
      throw error;
    }
  }

  getViolationStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    return this.driftDetector.getViolationStats();
  }
}

export default ClaudeCodePlugin;

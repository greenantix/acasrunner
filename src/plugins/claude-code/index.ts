import { Plugin, PluginPermission, ActivityEvent, PluginAPI, FileChangeEvent } from '../../types/plugin';
import { ClaudeCodeProcessDetector } from './process-detector';
import { ClaudeCodeFileMonitor } from './file-monitor';
import { ClaudeCodeEscalationHandler } from './escalation-handler';
import { ClaudeCodeHistoryManager } from './history-manager';

export class ClaudeCodePlugin implements Plugin {
  id = 'claude-code';
  name = 'Claude Code Integration';
  version = '1.0.0';
  author = 'ACAS Runner Team';
  description = 'Monitors Claude Code processes and provides seamless integration with ACAS Runner';
  
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
  private isActive = false;
  private api?: PluginAPI;

  constructor() {
    this.processDetector = new ClaudeCodeProcessDetector();
    this.fileMonitor = new ClaudeCodeFileMonitor();
    this.escalationHandler = new ClaudeCodeEscalationHandler();
    this.historyManager = new ClaudeCodeHistoryManager();
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
    
    await this.processDetector.initialize();
    await this.fileMonitor.initialize();
    await this.escalationHandler.initialize();
    await this.historyManager.initialize();

    this.setupEventHandlers();
    this.isActive = true;
    
    console.log('[Claude Code Plugin] Initialized successfully');
  }

  async cleanup(): Promise<void> {
    console.log('[Claude Code Plugin] Cleaning up...');
    
    this.isActive = false;
    
    await this.processDetector.cleanup();
    await this.fileMonitor.cleanup();
    await this.escalationHandler.cleanup();
    await this.historyManager.cleanup();
    
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

  async onError(error: any): Promise<void> {
    if (!this.isActive) return;

    try {
      const pattern = await this.escalationHandler.analyzeError(error);
      
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

  async getStatus(): Promise<{ active: boolean; stats: any }> {
    return {
      active: this.isActive,
      stats: {
        activeSessions: await this.historyManager.getActiveSessionCount(),
        totalEvents: await this.historyManager.getTotalEventCount(),
        lastActivity: await this.historyManager.getLastActivityTime()
      }
    };
  }
}

export default ClaudeCodePlugin;
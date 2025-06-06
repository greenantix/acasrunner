import { 
  PluginAPI, 
  ActivityEvent, 
  UIExtensionPoint, 
  ActivityService as IActivityService,
  EscalationService,
  ChatService,
  FileService,
  Logger,
  ConfigService,
  StorageService,
  UIService
} from '@/types/plugin';
import { activityService } from '@/services/activity-service';
import { EscalationManager } from '@/services/escalation-manager';

export class PluginAPIImpl {
  private pluginRegistry: any;
  private pluginAPIs: Map<string, PluginAPI> = new Map();
  private activityService?: typeof activityService;
  private escalationManager?: EscalationManager;
  private uiExtensions: Map<UIExtensionPoint, Array<{ pluginId: string; component: any }>> = new Map();

  constructor(pluginRegistry: any) {
    this.pluginRegistry = pluginRegistry;
  }

  createPluginAPI(pluginId: string): PluginAPI {
    const api: PluginAPI = {
      activity: this.createActivityService(),
      escalation: this.createEscalationService(),
      chat: this.createChatService(),
      files: this.createFileService(),
      log: this.createLogger(pluginId),
      config: this.createConfigService(pluginId),
      storage: this.createStorageService(pluginId),
      ui: this.createUIService(pluginId),
      emit: (event: string, data: any) => this.pluginRegistry.emit(event, data),
      on: (event: string, handler: Function) => this.pluginRegistry.on(event, handler),
      off: (event: string, handler: Function) => this.pluginRegistry.off(event, handler)
    };
    
    this.pluginAPIs.set(pluginId, api);
    return api;
  }

  private createActivityService(): IActivityService {
    return {
      emit: (event: ActivityEvent) => {
        if (this.activityService) {
          this.activityService.emit('activity', event);
        }
      },
      getRecentActivities: (limit = 50) => {
        const allActivities = this.activityService?.getActivities() || [];
        return allActivities.slice(-limit);
      },
      subscribe: (handler: (event: ActivityEvent) => void) => {
        if (this.activityService) {
          this.activityService.on('activity', handler);
          return () => this.activityService?.off('activity', handler);
        }
        return () => {};
      }
    };
  }

  private createEscalationService(): EscalationService {
    return {
      trigger: async (escalation: any) => {
        if (this.escalationManager) {
          await this.escalationManager.escalateIssue(escalation.message, escalation.severity, escalation.context);
        }
      },
      getHistory: (limit = 50) => {
        // TODO: Implement getHistory in escalation manager
        return [];
      },
      subscribe: (handler: (escalation: any) => void) => {
        // TODO: Implement event system in escalation manager
        return () => {};
      }
    };
  }

  private createChatService(): ChatService {
    return {
      sendMessage: (message: string, sender = 'plugin') => {
        console.log(`[Chat] ${sender}: ${message}`);
      },
      getHistory: (limit = 50) => {
        return [];
      },
      subscribe: (handler: (message: any) => void) => {
        return () => {};
      }
    };
  }

  private createFileService(): FileService {
    return {
      read: async (filePath: string) => {
        if (typeof window !== 'undefined' && (window as any).fs) {
          try {
            return await (window as any).fs.readFile(filePath, { encoding: 'utf8' });
          } catch (error) {
            throw new Error(`Failed to read file ${filePath}: ${error}`);
          }
        }
        throw new Error('File system not available');
      },
      write: async (filePath: string, content: string) => {
        if (typeof window !== 'undefined' && (window as any).fs) {
          try {
            await (window as any).fs.writeFile(filePath, content);
          } catch (error) {
            throw new Error(`Failed to write file ${filePath}: ${error}`);
          }
        } else {
          throw new Error('File system not available');
        }
      },
      exists: async (filePath: string) => {
        try {
          await this.createFileService().read(filePath);
          return true;
        } catch {
          return false;
        }
      },
      list: async (directoryPath: string) => {
        return [];
      },
      watch: (filePath: string, handler: (event: any) => void) => {
        return () => {};
      }
    };
  }

  private createLogger(pluginId: string): Logger {
    return {
      info: (message: string, data?: any) => {
        console.log(`[Plugin:${pluginId}] INFO:`, message, data);
      },
      warn: (message: string, data?: any) => {
        console.warn(`[Plugin:${pluginId}] WARN:`, message, data);
      },
      error: (message: string, data?: any) => {
        console.error(`[Plugin:${pluginId}] ERROR:`, message, data);
      },
      debug: (message: string, data?: any) => {
        console.debug(`[Plugin:${pluginId}] DEBUG:`, message, data);
      }
    };
  }

  private createConfigService(pluginId: string): ConfigService {
    return {
      get: (key: string, defaultValue?: any) => {
        const storageKey = `plugin_${pluginId}_config_${key}`;
        if (typeof window !== 'undefined') {
          const value = localStorage.getItem(storageKey);
          return value ? JSON.parse(value) : defaultValue;
        }
        return defaultValue;
      },
      set: (key: string, value: any) => {
        const storageKey = `plugin_${pluginId}_config_${key}`;
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(value));
        }
      },
      getAll: () => {
        if (typeof window !== 'undefined') {
          const config: any = {};
          const prefix = `plugin_${pluginId}_config_`;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
              const configKey = key.substring(prefix.length);
              const value = localStorage.getItem(key);
              if (value) {
                config[configKey] = JSON.parse(value);
              }
            }
          }
          return config;
        }
        return {};
      },
      reset: () => {
        if (typeof window !== 'undefined') {
          const prefix = `plugin_${pluginId}_config_`;
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
        }
      }
    };
  }

  private createStorageService(pluginId: string): StorageService {
    return {
      get: async (key: string) => {
        const storageKey = `plugin_${pluginId}_storage_${key}`;
        if (typeof window !== 'undefined') {
          const value = localStorage.getItem(storageKey);
          return value ? JSON.parse(value) : null;
        }
        return null;
      },
      set: async (key: string, value: any) => {
        const storageKey = `plugin_${pluginId}_storage_${key}`;
        if (typeof window !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(value));
        }
      },
      delete: async (key: string) => {
        const storageKey = `plugin_${pluginId}_storage_${key}`;
        if (typeof window !== 'undefined') {
          localStorage.removeItem(storageKey);
        }
      },
      clear: async () => {
        if (typeof window !== 'undefined') {
          const prefix = `plugin_${pluginId}_storage_`;
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(key => localStorage.removeItem(key));
        }
      }
    };
  }

  private createUIService(pluginId: string): UIService {
    return {
      showNotification: (message: string, type = 'info') => {
        console.log(`[Plugin:${pluginId}] Notification [${type}]:`, message);
      },
      showDialog: async (options: any) => {
        console.log(`[Plugin:${pluginId}] Dialog:`, options);
        return null;
      },
      registerMenuItem: (item: any) => {
        console.log(`[Plugin:${pluginId}] Registering menu item:`, item);
      },
      registerCommand: (command: any) => {
        console.log(`[Plugin:${pluginId}] Registering command:`, command);
      }
    };
  }

  setActivityService(activityService: typeof import('@/services/activity-service').activityService): void {
    this.activityService = activityService;
  }

  setEscalationManager(escalationManager: EscalationManager): void {
    this.escalationManager = escalationManager;
  }
}

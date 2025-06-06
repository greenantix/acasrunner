import { EventEmitter } from 'events';
import { FirebaseCollections } from '../../lib/firebase/collections';

export interface StruggleSettings {
  plugin: 'claude-code';
  model: string;
  struggles: {
    [issueType: string]: {
      count: number;
      autoIgnore: boolean;
      escalateThreshold: number;
      lastSeen: Date;
    };
  };
  sessionTally: number;
  lifetimeTally: number;
}

export interface StruggleAction {
  action: 'ignore' | 'escalate' | 'continue' | 'auto_disabled';
  reason: string;
  newCount: number;
  shouldNotifyUser?: boolean;
}

export interface StruggleType {
  id: string;
  name: string;
  description: string;
  category: 'api' | 'filesystem' | 'dependency' | 'syntax' | 'performance' | 'wsl';
  defaultThreshold: number;
  severity: 'low' | 'medium' | 'high';
}

export class StruggleManager extends EventEmitter {
  private settings: Map<string, StruggleSettings> = new Map();
  private isActive = false;
  private readonly STORAGE_KEY = 'claude-code-struggle-settings';

  // Predefined struggle types based on claude.md specification
  private readonly STRUGGLE_TYPES: StruggleType[] = [
    // API related
    {
      id: 'api_timeout_error',
      name: 'API Timeout Error',
      description: 'Claude API requests timing out repeatedly',
      category: 'api',
      defaultThreshold: 3,
      severity: 'high'
    },
    {
      id: 'api_rate_limit',
      name: 'API Rate Limit',
      description: 'API rate limits being exceeded',
      category: 'api',
      defaultThreshold: 2,
      severity: 'medium'
    },
    {
      id: 'context_window_exceeded',
      name: 'Context Window Exceeded',
      description: 'Input exceeding Claude context limits',
      category: 'api',
      defaultThreshold: 3,
      severity: 'medium'
    },

    // File system related
    {
      id: 'file_permission_error',
      name: 'File Permission Error',
      description: 'File access permission denied errors',
      category: 'filesystem',
      defaultThreshold: 4,
      severity: 'medium'
    },
    {
      id: 'file_not_found',
      name: 'File Not Found',
      description: 'Files or directories not found repeatedly',
      category: 'filesystem',
      defaultThreshold: 5,
      severity: 'low'
    },

    // Dependency related
    {
      id: 'dependency_import_fails',
      name: 'Dependency Import Fails',
      description: 'Import statements failing for missing dependencies',
      category: 'dependency',
      defaultThreshold: 4,
      severity: 'medium'
    },
    {
      id: 'typescript_strict_mode',
      name: 'TypeScript Strict Mode',
      description: 'TypeScript strict mode violations',
      category: 'syntax',
      defaultThreshold: 2,
      severity: 'low'
    },

    // WSL related
    {
      id: 'wsl_path_translation',
      name: 'WSL Path Translation',
      description: 'Windows to WSL path translation failures',
      category: 'wsl',
      defaultThreshold: 3,
      severity: 'medium'
    },

    // Performance related
    {
      id: 'memory_error',
      name: 'Memory Error',
      description: 'System running out of memory',
      category: 'performance',
      defaultThreshold: 1,
      severity: 'high'
    },
    {
      id: 'performance_degraded',
      name: 'Performance Degraded',
      description: 'Slow response times or performance issues',
      category: 'performance',
      defaultThreshold: 5,
      severity: 'low'
    }
  ];

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    console.log('[Struggle Manager] Initializing struggle settings and anti-bloat filter...');
    this.isActive = true;
    
    // Load existing settings from persistent storage
    await this.loadPersistedSettings();
  }

  async cleanup(): Promise<void> {
    console.log('[Struggle Manager] Cleaning up struggle manager...');
    this.isActive = false;
    
    // Save current settings
    await this.saveSettings();
    this.settings.clear();
  }

  async loadSettings(userId: string, plugin: string = 'claude-code'): Promise<StruggleSettings> {
    const key = `${userId}:${plugin}`;
    
    if (this.settings.has(key)) {
      return this.settings.get(key)!;
    }

    try {
      // Try to load from Firebase settings collection
      const setting = await FirebaseCollections.getSetting('struggle-settings', key);
      
      if (setting && setting.value) {
        const struggleSettings = this.parseSettingsFromStorage(setting.value);
        this.settings.set(key, struggleSettings);
        return struggleSettings;
      }
    } catch (error) {
      console.error('[Struggle Manager] Error loading settings from Firebase:', error);
    }

    // Create default settings if none exist
    const defaultSettings = this.createDefaultSettings(plugin);
    this.settings.set(key, defaultSettings);
    
    // Save the default settings
    await this.saveUserSettings(userId, plugin, defaultSettings);
    
    return defaultSettings;
  }

  async shouldIgnoreIssue(userId: string, issueType: string, plugin: string = 'claude-code'): Promise<boolean> {
    if (!this.isActive) return false;

    const settings = await this.loadSettings(userId, plugin);
    const struggle = settings.struggles[issueType];
    
    if (!struggle) {
      return false;
    }

    return struggle.autoIgnore;
  }

  async recordStruggle(
    userId: string, 
    issueType: string, 
    plugin: string = 'claude-code'
  ): Promise<StruggleAction> {
    if (!this.isActive) {
      return {
        action: 'continue',
        reason: 'Struggle manager not active',
        newCount: 0
      };
    }

    const settings = await this.loadSettings(userId, plugin);
    
    // Initialize struggle entry if it doesn't exist
    if (!settings.struggles[issueType]) {
      const struggleType = this.STRUGGLE_TYPES.find(st => st.id === issueType);
      settings.struggles[issueType] = {
        count: 0,
        autoIgnore: false,
        escalateThreshold: struggleType?.defaultThreshold || 3,
        lastSeen: new Date()
      };
    }

    const struggle = settings.struggles[issueType];
    
    // Check if already auto-ignored
    if (struggle.autoIgnore) {
      return {
        action: 'ignore',
        reason: `Issue type "${issueType}" is auto-ignored (triggered ${struggle.count} times)`,
        newCount: struggle.count
      };
    }

    // Increment counters
    struggle.count++;
    struggle.lastSeen = new Date();
    settings.sessionTally++;
    settings.lifetimeTally++;

    // Check if we should auto-disable this issue type
    if (struggle.count >= struggle.escalateThreshold) {
      struggle.autoIgnore = true;
      
      console.log(`[Struggle Manager] Auto-disabled issue type "${issueType}" after ${struggle.count} occurrences`);
      
      // Save updated settings
      await this.saveUserSettings(userId, plugin, settings);
      
      this.emit('struggle-auto-disabled', {
        userId,
        plugin,
        issueType,
        count: struggle.count,
        threshold: struggle.escalateThreshold
      });

      return {
        action: 'auto_disabled',
        reason: `Auto-disabled "${issueType}" after ${struggle.count} occurrences (threshold: ${struggle.escalateThreshold})`,
        newCount: struggle.count,
        shouldNotifyUser: true
      };
    }

    // Save updated settings
    await this.saveUserSettings(userId, plugin, settings);

    // Emit struggle recorded event
    this.emit('struggle-recorded', {
      userId,
      plugin,
      issueType,
      count: struggle.count,
      threshold: struggle.escalateThreshold
    });

    return {
      action: 'continue',
      reason: `Recorded struggle "${issueType}" (${struggle.count}/${struggle.escalateThreshold})`,
      newCount: struggle.count
    };
  }

  async exportSettings(userId: string, plugin: string = 'claude-code'): Promise<string> {
    const settings = await this.loadSettings(userId, plugin);
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      userId,
      plugin,
      settings,
      struggleTypes: this.STRUGGLE_TYPES
    };

    return JSON.stringify(exportData, null, 2);
  }

  async importSettings(userId: string, settingsJson: string, plugin: string = 'claude-code'): Promise<boolean> {
    try {
      const importData = JSON.parse(settingsJson);
      
      // Validate import data structure
      if (!importData.settings || !importData.plugin || !importData.version) {
        throw new Error('Invalid settings format');
      }

      const settings = importData.settings as StruggleSettings;
      
      // Ensure plugin matches
      if (settings.plugin !== plugin) {
        throw new Error(`Plugin mismatch: expected ${plugin}, got ${settings.plugin}`);
      }

      // Save imported settings
      await this.saveUserSettings(userId, plugin, settings);
      this.settings.set(`${userId}:${plugin}`, settings);

      console.log(`[Struggle Manager] Imported settings for user ${userId}`);
      
      this.emit('settings-imported', {
        userId,
        plugin,
        settingsCount: Object.keys(settings.struggles).length
      });

      return true;
    } catch (error) {
      console.error('[Struggle Manager] Error importing settings:', error);
      return false;
    }
  }

  async resetUserStruggles(userId: string, plugin: string = 'claude-code'): Promise<void> {
    const settings = await this.loadSettings(userId, plugin);
    
    // Reset all struggle counts but keep thresholds
    for (const issueType in settings.struggles) {
      settings.struggles[issueType].count = 0;
      settings.struggles[issueType].autoIgnore = false;
    }
    
    settings.sessionTally = 0;
    // Note: Keep lifetimeTally for historical tracking

    await this.saveUserSettings(userId, plugin, settings);
    
    console.log(`[Struggle Manager] Reset struggles for user ${userId}`);
    
    this.emit('struggles-reset', { userId, plugin });
  }

  async updateStruggleThreshold(
    userId: string, 
    issueType: string, 
    newThreshold: number, 
    plugin: string = 'claude-code'
  ): Promise<void> {
    const settings = await this.loadSettings(userId, plugin);
    
    if (settings.struggles[issueType]) {
      settings.struggles[issueType].escalateThreshold = newThreshold;
      
      // If new threshold is higher than current count, re-enable if auto-ignored
      if (newThreshold > settings.struggles[issueType].count) {
        settings.struggles[issueType].autoIgnore = false;
      }
      
      await this.saveUserSettings(userId, plugin, settings);
      
      console.log(`[Struggle Manager] Updated threshold for "${issueType}" to ${newThreshold}`);
    }
  }

  getStruggleTypes(): StruggleType[] {
    return [...this.STRUGGLE_TYPES];
  }

  getStruggleTypeInfo(issueType: string): StruggleType | undefined {
    return this.STRUGGLE_TYPES.find(st => st.id === issueType);
  }

  async getUserStruggleStats(userId: string, plugin: string = 'claude-code'): Promise<{
    totalStruggles: number;
    sessionStruggles: number;
    autoIgnoredCount: number;
    activeStruggles: number;
    topStruggles: Array<{ issueType: string; count: number; autoIgnored: boolean }>;
  }> {
    const settings = await this.loadSettings(userId, plugin);
    
    const struggles = Object.entries(settings.struggles);
    const autoIgnoredCount = struggles.filter(([_, struggle]) => struggle.autoIgnore).length;
    const activeStruggles = struggles.filter(([_, struggle]) => !struggle.autoIgnore).length;
    
    const topStruggles = struggles
      .sort(([_, a], [__, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([issueType, struggle]) => ({
        issueType,
        count: struggle.count,
        autoIgnored: struggle.autoIgnore
      }));

    return {
      totalStruggles: settings.lifetimeTally,
      sessionStruggles: settings.sessionTally,
      autoIgnoredCount,
      activeStruggles,
      topStruggles
    };
  }

  private createDefaultSettings(plugin: string = 'claude-code'): StruggleSettings {
    return {
      plugin: plugin as 'claude-code',
      model: 'claude-3-5-sonnet', // Default model
      struggles: {},
      sessionTally: 0,
      lifetimeTally: 0
    };
  }

  private parseSettingsFromStorage(data: any): StruggleSettings {
    // Convert stored date strings back to Date objects
    const settings = { ...data };
    
    for (const issueType in settings.struggles) {
      if (settings.struggles[issueType].lastSeen) {
        settings.struggles[issueType].lastSeen = new Date(settings.struggles[issueType].lastSeen);
      }
    }
    
    return settings;
  }

  private async saveUserSettings(userId: string, plugin: string, settings: StruggleSettings): Promise<void> {
    const key = `${userId}:${plugin}`;
    
    try {
      await FirebaseCollections.setSetting({
        category: 'struggle-settings',
        key,
        value: settings,
        type: 'object',
        description: `Struggle settings for user ${userId} and plugin ${plugin}`,
        isSystem: false,
        updatedBy: userId
      });
      
      this.settings.set(key, settings);
    } catch (error) {
      console.error('[Struggle Manager] Error saving settings to Firebase:', error);
    }
  }

  private async loadPersistedSettings(): Promise<void> {
    // This would typically load user settings from persistent storage
    // For now, we start with empty state and load on-demand
    console.log('[Struggle Manager] Ready to load settings on-demand');
  }

  private async saveSettings(): Promise<void> {
    // Settings are saved individually when updated
    console.log('[Struggle Manager] All settings saved to persistent storage');
  }
}
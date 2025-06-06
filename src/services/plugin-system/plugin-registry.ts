import { EscalationManager } from '@/services/escalation-manager';
import {
  Plugin,
  PluginAPI,
  PluginInstance,
  PluginStatus,
  UIExtension,
  UIExtensionPoint,
} from '@/types/plugin';
import { EventEmitter } from 'events';
import { PluginAPIImpl } from './plugin-api';

export class PluginRegistry extends EventEmitter {
  private plugins: Map<string, PluginInstance> = new Map();
  private uiExtensions: Map<UIExtensionPoint, UIExtension[]> = new Map();
  private pluginAPI: PluginAPIImpl;
  private activityService?: any;
  private escalationManager?: EscalationManager;

  constructor() {
    super();
    this.pluginAPI = new PluginAPIImpl(this);
  }

  setActivityService(activityService: any): void {
    this.activityService = activityService;
    this.pluginAPI.setActivityService(activityService);
  }

  setEscalationManager(escalationManager: EscalationManager): void {
    this.escalationManager = escalationManager;
    this.pluginAPI.setEscalationManager(escalationManager);
    escalationManager.setPluginRegistry(this);
  }

  getPluginAPI(): PluginAPI {
    return this.pluginAPI.createPluginAPI('default');
  }

  async registerPlugin(plugin: Plugin): Promise<PluginInstance> {
    console.log(`📦 Registering plugin: ${plugin.name} (${plugin.id})`);

    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with ID '${plugin.id}' is already registered`);
    }

    // Create plugin instance
    const instance: PluginInstance = {
      plugin,
      status: 'loaded',
      config: { ...plugin.defaultConfig },
      api: this.pluginAPI.createPluginAPI(plugin.id),
      loadedAt: new Date(),
      error: undefined,
    };

    this.plugins.set(plugin.id, instance);

    try {
      // Call onLoad hook if it exists
      if (plugin.onLoad) {
        await plugin.onLoad(instance.api);
      }

      console.log(`✅ Plugin loaded: ${plugin.name}`);
      this.emit('plugin:loaded', instance);

      return instance;
    } catch (error) {
      instance.status = 'error';
      instance.error = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to load plugin ${plugin.name}:`, error);
      this.emit('plugin:error', instance, error);
      throw error;
    }
  }

  async unregisterPlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin with ID '${pluginId}' not found`);
    }

    console.log(`🗑️ Unregistering plugin: ${instance.plugin.name}`);

    try {
      // Disable first if enabled
      if (instance.status === 'enabled') {
        await this.disablePlugin(pluginId);
      }

      // Call onUnload hook if it exists
      if (instance.plugin.onUnload) {
        await instance.plugin.onUnload(instance.api);
      }

      // Remove from registry
      this.plugins.delete(pluginId);
      instance.status = 'unloaded';

      console.log(`✅ Plugin unregistered: ${instance.plugin.name}`);
      this.emit('plugin:unloaded', instance);
    } catch (error) {
      instance.status = 'error';
      instance.error = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to unregister plugin ${instance.plugin.name}:`, error);
      this.emit('plugin:error', instance, error);
      throw error;
    }
  }

  async enablePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin with ID '${pluginId}' not found`);
    }

    if (instance.status === 'enabled') {
      console.log(`⚠️ Plugin ${instance.plugin.name} is already enabled`);
      return;
    }

    if (instance.status === 'error') {
      throw new Error(`Cannot enable plugin ${instance.plugin.name}: ${instance.error}`);
    }

    console.log(`🔌 Enabling plugin: ${instance.plugin.name}`);

    try {
      // Call onEnable hook if it exists
      if (instance.plugin.onEnable) {
        await instance.plugin.onEnable(instance.api);
      }

      instance.status = 'enabled';
      instance.enabledAt = new Date();
      instance.error = undefined;

      console.log(`✅ Plugin enabled: ${instance.plugin.name}`);
      this.emit('plugin:enabled', instance);
    } catch (error) {
      instance.status = 'error';
      instance.error = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to enable plugin ${instance.plugin.name}:`, error);
      this.emit('plugin:error', instance, error);
      throw error;
    }
  }

  async disablePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin with ID '${pluginId}' not found`);
    }

    if (instance.status !== 'enabled') {
      console.log(`⚠️ Plugin ${instance.plugin.name} is not enabled`);
      return;
    }

    console.log(`🔌 Disabling plugin: ${instance.plugin.name}`);

    try {
      // Call onDisable hook if it exists
      if (instance.plugin.onDisable) {
        await instance.plugin.onDisable(instance.api);
      }

      instance.status = 'disabled';
      instance.enabledAt = undefined;
      instance.error = undefined;

      console.log(`✅ Plugin disabled: ${instance.plugin.name}`);
      this.emit('plugin:disabled', instance);
    } catch (error) {
      instance.status = 'error';
      instance.error = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to disable plugin ${instance.plugin.name}:`, error);
      this.emit('plugin:error', instance, error);
      throw error;
    }
  }

  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  getEnabledPlugins(): PluginInstance[] {
    return this.getAllPlugins().filter(instance => instance.status === 'enabled');
  }

  getPluginsByStatus(status: PluginStatus): PluginInstance[] {
    return this.getAllPlugins().filter(instance => instance.status === status);
  }

  updatePluginConfig(pluginId: string, config: any): void {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin with ID '${pluginId}' not found`);
    }

    instance.config = { ...instance.config, ...config };
    this.emit('plugin:config-updated', instance);
  }

  getPluginConfig(pluginId: string): any {
    const instance = this.plugins.get(pluginId);
    return instance?.config || {};
  }

  async broadcastActivityEvent(event: any): Promise<void> {
    const enabledPlugins = this.getEnabledPlugins();

    await Promise.allSettled(
      enabledPlugins.map(async instance => {
        try {
          if (instance.plugin.onActivity) {
            await instance.plugin.onActivity(event);
          }
        } catch (error) {
          console.error(
            `❌ Plugin ${instance.plugin.name} failed to handle activity event:`,
            error
          );
          this.emit('plugin:error', instance, error);
        }
      })
    );
  }

  async broadcastFileChangeEvent(event: any): Promise<void> {
    const enabledPlugins = this.getEnabledPlugins();

    await Promise.allSettled(
      enabledPlugins.map(async instance => {
        try {
          if (instance.plugin.onFileChange) {
            await instance.plugin.onFileChange(event);
          }
        } catch (error) {
          console.error(
            `❌ Plugin ${instance.plugin.name} failed to handle file change event:`,
            error
          );
          this.emit('plugin:error', instance, error);
        }
      })
    );
  }

  async broadcastErrorEvent(event: any): Promise<void> {
    const enabledPlugins = this.getEnabledPlugins();

    await Promise.allSettled(
      enabledPlugins.map(async instance => {
        try {
          if (instance.plugin.onError) {
            await instance.plugin.onError(event);
          }
        } catch (error) {
          console.error(`❌ Plugin ${instance.plugin.name} failed to handle error event:`, error);
          this.emit('plugin:error', instance, error);
        }
      })
    );
  }

  async loadFromURL(url: string): Promise<void> {
    console.log(`📥 Loading plugin from URL: ${url}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch plugin: ${response.statusText}`);
      }

      const code = await response.text();
      await this.loadFromCode(code, url);
    } catch (error) {
      console.error(`❌ Failed to load plugin from URL ${url}:`, error);
      throw error;
    }
  }

  async loadFromFile(file: File): Promise<void> {
    console.log(`📁 Loading plugin from file: ${file.name}`);

    try {
      const code = await file.text();
      await this.loadFromCode(code, file.name);
    } catch (error) {
      console.error(`❌ Failed to load plugin from file ${file.name}:`, error);
      throw error;
    }
  }

  private async loadFromCode(code: string, source: string): Promise<void> {
    try {
      // Create a safe execution context
      const pluginFunction = new Function('exports', 'require', 'module', code);
      const exports = {};
      const module = { exports };

      // Mock require function for basic dependencies
      const require = (moduleName: string) => {
        switch (moduleName) {
          case 'react':
            return typeof window !== 'undefined' ? (window as any).React : {};
          default:
            throw new Error(`Module '${moduleName}' is not available in plugin sandbox`);
        }
      };

      // Execute plugin code
      pluginFunction(exports, require, module);

      // Get the plugin definition
      const plugin = (module.exports as any).default || module.exports;

      if (!plugin || typeof plugin !== 'object') {
        throw new Error('Plugin must export a plugin definition object');
      }

      // Validate plugin structure
      if (!plugin.id || !plugin.name || !plugin.version) {
        throw new Error('Plugin must have id, name, and version properties');
      }

      await this.registerPlugin(plugin);
    } catch (error) {
      console.error(`❌ Failed to load plugin from ${source}:`, error);
      throw error;
    }
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    await this.unregisterPlugin(pluginId);
  }

  getUIExtensions(extensionPoint: UIExtensionPoint): UIExtension[] {
    return this.uiExtensions.get(extensionPoint) || [];
  }

  registerUIExtension(extension: UIExtension): void {
    const extensions = this.uiExtensions.get(extension.extensionPoint) || [];
    extensions.push(extension);
    extensions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    this.uiExtensions.set(extension.extensionPoint, extensions);
    this.emit('ui-extension:registered', extension);
  }

  unregisterUIExtension(extensionId: string): void {
    for (const [extensionPoint, extensions] of this.uiExtensions.entries()) {
      const index = extensions.findIndex(ext => ext.id === extensionId);
      if (index !== -1) {
        const removed = extensions.splice(index, 1)[0];
        this.uiExtensions.set(extensionPoint, extensions);
        this.emit('ui-extension:unregistered', removed);
        break;
      }
    }
  }

  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    errors: number;
    byAuthor: { [author: string]: number };
  } {
    const all = this.getAllPlugins();
    const enabled = this.getPluginsByStatus('enabled');
    const disabled = this.getPluginsByStatus('disabled');
    const errors = this.getPluginsByStatus('error');

    const byAuthor: { [author: string]: number } = {};
    all.forEach(instance => {
      const author = instance.plugin.author || 'Unknown';
      byAuthor[author] = (byAuthor[author] || 0) + 1;
    });

    return {
      total: all.length,
      enabled: enabled.length,
      disabled: disabled.length,
      errors: errors.length,
      byAuthor,
    };
  }
}

// Singleton instance
export const pluginRegistry = new PluginRegistry();


import { Plugin, PluginInstance } from '@/types/plugin';
import { PluginAPIImpl } from './plugin-api';

export class PluginLoader {
  private loadedPlugins: Map<string, any> = new Map();
  private pluginAPI: PluginAPIImpl;

  constructor(pluginAPI: PluginAPIImpl) {
    this.pluginAPI = pluginAPI;
  }

  async loadFromURL(url: string): Promise<Plugin> {
    try {
      // For security, we'd want to validate the URL and implement proper sandboxing
      const response = await fetch(url);
      const pluginCode = await response.text();
      
      // Create a safe execution context
      const plugin = await this.executePluginCode(pluginCode, url);
      
      this.loadedPlugins.set(plugin.id, plugin);
      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin from URL ${url}: ${error}`);
    }
  }

  async loadFromFile(file: File): Promise<Plugin> {
    try {
      const pluginCode = await file.text();
      const plugin = await this.executePluginCode(pluginCode, file.name);
      
      this.loadedPlugins.set(plugin.id, plugin);
      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin from file ${file.name}: ${error}`);
    }
  }

  async loadBuiltInPlugin(pluginName: string): Promise<Plugin> {
    try {
      // Dynamic import for built-in plugins
      const module = await import(`../../../plugins/${pluginName}`);
      const plugin = module.default;
      
      if (!this.validatePlugin(plugin)) {
        throw new Error(`Invalid plugin structure: ${pluginName}`);
      }
      
      this.loadedPlugins.set(plugin.id, plugin);
      return plugin;
    } catch (error) {
      throw new Error(`Failed to load built-in plugin ${pluginName}: ${error}`);
    }
  }

  private async executePluginCode(code: string, source: string): Promise<Plugin> {
    try {
      // Create a sandboxed execution environment
      const sandbox = this.createSandbox();
      
      // Execute the plugin code in the sandbox
      const pluginFactory = new Function('api', 'exports', 'require', `
        ${code}
        return exports.default || exports;
      `);
      
      const plugin = pluginFactory(this.pluginAPI, {}, this.createRequireFunction());
      
      if (!this.validatePlugin(plugin)) {
        throw new Error(`Invalid plugin structure from ${source}`);
      }
      
      return plugin;
    } catch (error) {
      throw new Error(`Failed to execute plugin code from ${source}: ${error}`);
    }
  }

  private createSandbox() {
    // Create a restricted execution environment
    return {
      console: {
        log: (...args: any[]) => console.log('[Plugin]', ...args),
        error: (...args: any[]) => console.error('[Plugin]', ...args),
        warn: (...args: any[]) => console.warn('[Plugin]', ...args),
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      fetch: (url: string, init?: RequestInit) => {
        // Restrict network access if needed
        return fetch(url, init);
      }
    };
  }

  private createRequireFunction() {
    // Limited require function for plugins
    const allowedModules = new Set(['react', 'react-dom']);
    
    return (moduleName: string) => {
      if (!allowedModules.has(moduleName)) {
        throw new Error(`Module ${moduleName} is not allowed in plugins`);
      }
      
      // Return the actual module or a mock
      switch (moduleName) {
        case 'react':
          return require('react');
        case 'react-dom':
          return require('react-dom');
        default:
          throw new Error(`Module ${moduleName} not found`);
      }
    };
  }

  private validatePlugin(plugin: any): plugin is Plugin {
    return (
      plugin &&
      typeof plugin.name === 'string' &&
      typeof plugin.id === 'string' &&
      typeof plugin.version === 'string' &&
      typeof plugin.author === 'string' &&
      typeof plugin.description === 'string' &&
      typeof plugin.initialize === 'function' &&
      typeof plugin.destroy === 'function'
    );
  }

  async createInstance(plugin: Plugin): Promise<PluginInstance> {
    try {
      await plugin.initialize(this.pluginAPI);
      
      return {
        plugin,
        status: 'active',
        loadedAt: new Date(),
        instance: plugin
      };
    } catch (error) {
      throw new Error(`Failed to create plugin instance for ${plugin.name}: ${error}`);
    }
  }

  async destroyInstance(instance: PluginInstance): Promise<void> {
    try {
      if (instance.plugin.destroy) {
        await instance.plugin.destroy();
      }
      instance.status = 'stopped';
    } catch (error) {
      console.error(`Error destroying plugin ${instance.plugin.name}:`, error);
      instance.status = 'error';
    }
  }

  getLoadedPlugin(id: string): Plugin | undefined {
    return this.loadedPlugins.get(id);
  }

  unloadPlugin(id: string): void {
    this.loadedPlugins.delete(id);
  }
}
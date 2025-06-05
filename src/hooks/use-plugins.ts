import React from 'react';
import type { ReactNode } from 'react';
import { Plugin, PluginInstance, PluginStatus, UIExtensionPoint } from '@/types/plugin';
import { PluginRegistry } from '@/services/plugin-system/plugin-registry';

interface PluginContextType {
  registry: PluginRegistry | null;
  plugins: PluginInstance[];
  loadPlugin: (source: string | File) => Promise<void>;
  unloadPlugin: (pluginId: string) => Promise<void>;
  getUIExtensions: (extensionPoint: UIExtensionPoint) => any[];
}

// Create the context with explicit name
const PluginContextInternal = React.createContext<PluginContextType | null>(null);

export function PluginProvider({ children }: { children: ReactNode }): JSX.Element {
  const [registry] = React.useState(() => new PluginRegistry());
  const [plugins, setPlugins] = React.useState<PluginInstance[]>([]);

  React.useEffect(() => {
    const handlePluginUpdate = () => {
      setPlugins([...registry.getAllPlugins()]);
    };

    registry.on('plugin:loaded', handlePluginUpdate);
    registry.on('plugin:unloaded', handlePluginUpdate);
    registry.on('plugin:enabled', handlePluginUpdate);
    registry.on('plugin:disabled', handlePluginUpdate);
    registry.on('plugin:error', handlePluginUpdate);

    return () => {
      registry.off('plugin:loaded', handlePluginUpdate);
      registry.off('plugin:unloaded', handlePluginUpdate);
      registry.off('plugin:enabled', handlePluginUpdate);
      registry.off('plugin:disabled', handlePluginUpdate);
      registry.off('plugin:error', handlePluginUpdate);
    };
  }, [registry]);

  const loadPlugin = React.useCallback(async (source: string | File) => {
    if (typeof source === 'string') {
      await registry.loadFromURL(source);
    } else {
      await registry.loadFromFile(source);
    }
  }, [registry]);

  const unloadPlugin = React.useCallback(async (pluginId: string) => {
    await registry.unloadPlugin(pluginId);
  }, [registry]);

  const getUIExtensions = React.useCallback((extensionPoint: UIExtensionPoint) => {
    return registry.getUIExtensions(extensionPoint);
  }, [registry]);

  const contextValue: PluginContextType = {
    registry,
    plugins,
    loadPlugin,
    unloadPlugin,
    getUIExtensions
  };

  return React.createElement(
    PluginContextInternal.Provider,
    { value: contextValue },
    children
  );
}

export function usePlugins(): PluginContextType {
  const context = React.useContext(PluginContextInternal);
  if (!context) {
    throw new Error('usePlugins must be used within a PluginProvider');
  }
  return context;
}

export function usePlugin(pluginId: string): PluginInstance | undefined {
  const { plugins } = usePlugins();
  return plugins.find(p => p.plugin.id === pluginId);
}

export function usePluginStatus(pluginId: string): PluginStatus {
  const plugin = usePlugin(pluginId);
  return plugin?.status || 'stopped';
}

export function useUIExtensions(extensionPoint: UIExtensionPoint): any[] {
  const { getUIExtensions } = usePlugins();
  const [extensions, setExtensions] = React.useState<any[]>([]);

  React.useEffect(() => {
    setExtensions(getUIExtensions(extensionPoint));
  }, [extensionPoint, getUIExtensions]);

  return extensions;
}

export function usePluginAPI() {
  const { registry } = usePlugins();
  return registry?.getPluginAPI();
}

import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { Plugin, PluginInstance, PluginStatus, UIExtensionPoint } from '@/types/plugin';
import { PluginRegistry } from '@/services/plugin-system/plugin-registry';

interface PluginContextType {
  registry: PluginRegistry | null;
  plugins: PluginInstance[];
  loadPlugin: (source: string | File) => Promise<void>;
  unloadPlugin: (pluginId: string) => Promise<void>;
  getUIExtensions: (extensionPoint: UIExtensionPoint) => any[];
}

const PluginContext = createContext<PluginContextType | null>(null);

export const PluginProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registry] = useState(() => new PluginRegistry());
  const [plugins, setPlugins] = useState<PluginInstance[]>([]);

  useEffect(() => {
    const handlePluginUpdate = () => {
      setPlugins([...registry.getAllPlugins()]);
    };

    registry.on('pluginLoaded', handlePluginUpdate);
    registry.on('pluginUnloaded', handlePluginUpdate);
    registry.on('pluginStatusChanged', handlePluginUpdate);

    return () => {
      registry.off('pluginLoaded', handlePluginUpdate);
      registry.off('pluginUnloaded', handlePluginUpdate);
      registry.off('pluginStatusChanged', handlePluginUpdate);
    };
  }, [registry]);

  const loadPlugin = useCallback(async (source: string | File) => {
    if (typeof source === 'string') {
      await registry.loadFromURL(source);
    } else {
      await registry.loadFromFile(source);
    }
  }, [registry]);

  const unloadPlugin = useCallback(async (pluginId: string) => {
    await registry.unloadPlugin(pluginId);
  }, [registry]);

  const getUIExtensions = useCallback((extensionPoint: UIExtensionPoint) => {
    return registry.getUIExtensions(extensionPoint);
  }, [registry]);

  return (
    <PluginContext.Provider value={{
      registry,
      plugins,
      loadPlugin,
      unloadPlugin,
      getUIExtensions
    }}>
      {children}
    </PluginContext.Provider>
  );
};

export const usePlugins = () => {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error('usePlugins must be used within a PluginProvider');
  }
  return context;
};

export const usePlugin = (pluginId: string) => {
  const { plugins } = usePlugins();
  return plugins.find(p => p.plugin.id === pluginId);
};

export const usePluginStatus = (pluginId: string): PluginStatus => {
  const plugin = usePlugin(pluginId);
  return plugin?.status || 'stopped';
};

export const useUIExtensions = (extensionPoint: UIExtensionPoint) => {
  const { getUIExtensions } = usePlugins();
  const [extensions, setExtensions] = useState<any[]>([]);

  useEffect(() => {
    setExtensions(getUIExtensions(extensionPoint));
  }, [extensionPoint, getUIExtensions]);

  return extensions;
};

export const usePluginAPI = () => {
  const { registry } = usePlugins();
  return registry?.getPluginAPI();
};
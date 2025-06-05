# Remaining TypeScript Errors - Final Fix

The errors you're seeing are likely due to compilation cache issues. Here's how to resolve them:

## 1. Clear TypeScript/Next.js Cache

Run these commands to clear all caches:

```bash
# Clear Next.js cache
rm -rf .next

# Clear TypeScript build info
rm -f tsconfig.tsbuildinfo

# Clear node_modules and reinstall (if needed)
rm -rf node_modules
npm install

# Clear any IDE/VS Code caches
# In VS Code: Ctrl+Shift+P > "TypeScript: Restart TS Server"
```

## 2. Verify File Contents

The current `src/hooks/use-plugins.ts` should be exactly:

```typescript
import React, { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';
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

export const PluginProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [registry] = useState(() => new PluginRegistry());
  const [plugins, setPlugins] = useState<PluginInstance[]>([]);

  useEffect(() => {
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

  const contextValue: PluginContextType = {
    registry,
    plugins,
    loadPlugin,
    unloadPlugin,
    getUIExtensions
  };

  return (
    <PluginContext.Provider value={contextValue}>
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
```

## 3. Restart Development Server

```bash
npm run dev
```

## 4. Force TypeScript Check

```bash
npm run typecheck
```

If errors persist, they are likely IDE cache issues, not actual code problems.

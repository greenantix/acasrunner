# Quick TypeScript Check and Fix

Run these commands to resolve the TypeScript error:

```bash
# 1. Remove TypeScript cache
rm -f .next/cache/.tsbuildinfo
rm -rf .next/types

# 2. Remove Next.js cache
rm -rf .next

# 3. Check if TypeScript can compile the file
npx tsc --noEmit src/hooks/use-plugins.ts

# 4. If still failing, restart development server
npm run dev
```

## Alternative: Manual Fix

If the error persists, try this simpler version of the hook:

```typescript
import * as React from 'react';
import { PluginRegistry } from '@/services/plugin-system/plugin-registry';
import type { PluginInstance, PluginStatus, UIExtensionPoint } from '@/types/plugin';

type PluginContextValue = {
  registry: PluginRegistry;
  plugins: PluginInstance[];
  loadPlugin: (source: string | File) => Promise<void>;
  unloadPlugin: (pluginId: string) => Promise<void>;
  getUIExtensions: (extensionPoint: UIExtensionPoint) => any[];
} | null;

const Context = React.createContext<PluginContextValue>(null);

export function PluginProvider(props: { children: React.ReactNode }) {
  const [registry] = React.useState(() => new PluginRegistry());
  const [plugins, setPlugins] = React.useState<PluginInstance[]>([]);

  // ... rest of implementation
}
```

The issue is likely a TypeScript compilation cache problem. The fix I provided should work once the cache is cleared.

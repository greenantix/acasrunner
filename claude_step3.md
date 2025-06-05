# Claude-Step3.md - Plugin System Implementation

## Current State
The plugins page exists as a placeholder with no actual plugin loading or management functionality. The system needs a complete plugin architecture that allows users to extend ACAS Runner capabilities.

## Implementation Goals

### 1. Plugin Architecture
**Location**: `src/services/plugin-system/`

Create a robust plugin system that:
- Loads TypeScript/JavaScript plugins from `/plugins` directory
- Provides secure plugin sandboxing
- Supports hot-reloading during development
- Manages plugin lifecycles (load, enable, disable, unload)
- Provides plugin API for interacting with ACAS Runner

### 2. Plugin API Framework
**Location**: `src/services/plugin-api.ts`

Provide plugins with access to:
- Activity monitoring system
- AI escalation triggers
- File system operations (sandboxed)
- Chat integration
- Custom UI components
- Configuration storage
- Inter-plugin communication

### 3. Drag-and-Drop Plugin Installation
**Location**: `src/app/(app)/plugins/page.tsx`

Implement:
- Drag-and-drop zone for plugin files
- Plugin validation and security scanning
- Automatic plugin installation and activation
- Plugin update management
- Plugin marketplace integration (future)

### 4. Plugin Management UI
**Location**: `src/components/plugin-manager/`

Create interface for:
- Viewing installed plugins
- Enabling/disabling plugins
- Configuring plugin settings
- Viewing plugin logs and activity
- Uninstalling plugins

## Technical Requirements

### Plugin Interface Definition
```typescript
// src/types/plugin.ts
export interface Plugin {
  name: string;
  version: string;
  author: string;
  description: string;
  icon?: string;
  permissions: PluginPermission[];
  
  // Lifecycle hooks
  onLoad?(api: PluginAPI): Promise<void>;
  onEnable?(api: PluginAPI): Promise<void>;
  onDisable?(api: PluginAPI): Promise<void>;
  onUnload?(api: PluginAPI): Promise<void>;
  
  // Event handlers
  onActivity?(event: ActivityEvent): Promise<void>;
  onError?(error: ErrorEvent): Promise<void>;
  onFileChange?(change: FileChangeEvent): Promise<void>;
  
  // Commands/Actions
  commands?: PluginCommand[];
  menuItems?: PluginMenuItem[];
  
  // Configuration schema
  configSchema?: any; // JSON Schema
  defaultConfig?: any;
}

export interface PluginAPI {
  // Core services
  activity: ActivityService;
  escalation: EscalationService;
  chat: ChatService;
  files: FileService;
  
  // Plugin utilities
  log: Logger;
  config: ConfigService;
  storage: StorageService;
  ui: UIService;
  
  // Event system
  emit(event: string, data: any): void;
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
}

export interface PluginCommand {
  id: string;
  name: string;
  description: string;
  icon?: string;
  handler: (args: any[], api: PluginAPI) => Promise<any>;
  parameters?: PluginParameter[];
}
```

### Plugin Loader System
```typescript
// src/services/plugin-system/plugin-loader.ts
export class PluginLoader {
  async loadPlugin(filePath: string): Promise<Plugin>;
  async validatePlugin(plugin: Plugin): Promise<ValidationResult>;
  async installPlugin(pluginData: Buffer, filename: string): Promise<string>;
  async uninstallPlugin(pluginId: string): Promise<void>;
  async reloadPlugin(pluginId: string): Promise<void>;
}
```

### Plugin Security System
```typescript
// src/services/plugin-system/plugin-security.ts
export class PluginSecurity {
  validatePermissions(plugin: Plugin): Promise<boolean>;
  createSandbox(plugin: Plugin): PluginSandbox;
  scanForMaliciousCode(code: string): SecurityScanResult;
}

export interface PluginPermission {
  type: 'file_read' | 'file_write' | 'network' | 'ai_access' | 'shell_exec';
  scope?: string; // e.g., specific directories for file permissions
  description: string;
}
```

## Plugin Examples

### 1. Git Integration Plugin
```typescript
// plugins/git-integration.ts
export const plugin: Plugin = {
  name: "Git Integration",
  version: "1.0.0",
  author: "ACAS Team",
  description: "Integrates git operations with activity monitoring",
  permissions: [
    { type: 'shell_exec', description: 'Execute git commands' },
    { type: 'file_read', scope: '.git', description: 'Read git repository data' }
  ],
  
  async onLoad(api) {
    api.log.info("Git integration plugin loaded");
  },
  
  async onFileChange(change) {
    if (change.filePath.endsWith('.git/')) return;
    
    // Automatically stage and suggest commits for certain files
    if (this.shouldAutoStage(change.filePath)) {
      await this.stageFile(change.filePath);
      api.activity.emit({
        type: 'plugin_event',
        source: 'git-integration',
        message: `Auto-staged ${change.filePath}`,
        details: { plugin: 'git-integration', action: 'auto-stage' }
      });
    }
  },
  
  commands: [
    {
      id: 'git.status',
      name: 'Git Status',
      description: 'Show git repository status',
      handler: async (args, api) => {
        // Implementation
      }
    }
  ]
};
```

### 2. Code Quality Plugin
```typescript
// plugins/code-quality.ts
export const plugin: Plugin = {
  name: "Code Quality Monitor",
  version: "1.0.0",
  author: "ACAS Team",
  description: "Monitors code quality metrics and suggests improvements",
  permissions: [
    { type: 'file_read', description: 'Read source files for analysis' },
    { type: 'ai_access', description: 'Use AI for code analysis' }
  ],
  
  configSchema: {
    type: 'object',
    properties: {
      languages: { type: 'array', items: { type: 'string' } },
      qualityThreshold: { type: 'number', minimum: 0, maximum: 100 }
    }
  },
  
  defaultConfig: {
    languages: ['typescript', 'javascript', 'python'],
    qualityThreshold: 80
  },
  
  async onFileChange(change) {
    if (this.isSourceFile(change.filePath)) {
      const quality = await this.analyzeCodeQuality(change.filePath);
      if (quality.score < this.config.qualityThreshold) {
        api.escalation.trigger({
          type: 'code_quality',
          severity: 'medium',
          message: `Code quality below threshold in ${change.filePath}`,
          context: { qualityScore: quality.score, issues: quality.issues }
        });
      }
    }
  }
};
```

## Plugin Directory Structure
```
plugins/
├── installed/           # User-installed plugins
│   ├── git-integration/
│   │   ├── plugin.ts
│   │   ├── package.json
│   │   └── README.md
│   └── code-quality/
├── core/               # Built-in plugins
│   ├── file-watcher/
│   └── error-reporter/
├── disabled/           # Disabled plugins
└── temp/              # Temporary plugin installations
```

## Implementation Components

### 1. Plugin Registry
```typescript
// src/services/plugin-system/plugin-registry.ts
export class PluginRegistry {
  private plugins: Map<string, PluginInstance> = new Map();
  
  async registerPlugin(plugin: Plugin): Promise<void>;
  async unregisterPlugin(pluginId: string): Promise<void>;
  getPlugin(pluginId: string): PluginInstance | undefined;
  getAllPlugins(): PluginInstance[];
  getEnabledPlugins(): PluginInstance[];
}
```

### 2. Plugin Event System
```typescript
// src/services/plugin-system/plugin-events.ts
export class PluginEventSystem {
  async broadcastActivityEvent(event: ActivityEvent): Promise<void>;
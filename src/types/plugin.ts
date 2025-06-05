// Core plugin system types
import { ActivityEvent } from '@/services/client-activity-service';

export interface Plugin {
  name: string;
  id: string;
  version: string;
  author: string;
  description: string;
  icon?: string;
  permissions: PluginPermission[];

  // Lifecycle hooks
  initialize?(api?: PluginAPI): Promise<void>;
  destroy?(): Promise<void>;
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

export interface PluginMenuItem {
  id: string;
  label: string;
  icon?: string;
  action: string;
  submenu?: PluginMenuItem[];
}

export interface PluginParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'file' | 'directory';
  description: string;
  required?: boolean;
  default?: any;
}

export interface PluginPermission {
  type: 'file_read' | 'file_write' | 'network' | 'ai_access' | 'shell_exec' | 'storage' | 'ui';
  scope?: string; // e.g., specific directories for file permissions
  description: string;
}

export interface PluginInstance {
  plugin: Plugin;
  status: PluginStatus;
  initialized?: boolean;
  config: any;
  api: PluginAPI;
  loadedAt: Date;
  enabledAt?: Date;
  error?: string;
  instance?: Plugin;
}

export type PluginStatus =
  | 'loaded'
  | 'enabled'
  | 'disabled'
  | 'error'
  | 'unloaded'
  | 'active'
  | 'loading'
  | 'stopped';

export type UIExtensionPoint =
  | 'toolbar'
  | 'sidebar'
  | 'statusbar'
  | 'contextmenu'
  | 'commandpalette'
  | 'settings';

export interface UIExtension {
  id: string;
  pluginId: string;
  extensionPoint: UIExtensionPoint;
  component: React.ComponentType<any>;
  priority?: number;
  metadata?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SecurityScanResult {
  safe: boolean;
  threats: SecurityThreat[];
  score: number; // 0-100, higher is safer
}

export interface SecurityThreat {
  type: 'malicious_code' | 'suspicious_network' | 'file_access' | 'shell_execution';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
}

export interface FileChangeEvent {
  filePath: string;
  changeType: 'created' | 'modified' | 'deleted';
  content?: string;
  timestamp: Date;
}

// Service interfaces for plugin API
export interface ActivityService {
  emit(event: ActivityEvent): void;
  getRecentActivities(limit?: number): ActivityEvent[];
  subscribe(handler: (event: ActivityEvent) => void): () => void;
}

export interface EscalationService {
  trigger(escalation: EscalationTrigger): Promise<void>;
  getHistory(limit?: number): any[];
  subscribe(handler: (escalation: any) => void): () => void;
}

export interface EscalationTrigger {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  context?: any;
  plugin?: string;
}

export interface ChatService {
  sendMessage(message: string, sender?: string): void;
  getHistory(limit?: number): any[];
  subscribe(handler: (message: any) => void): () => void;
}

export interface FileService {
  read(filePath: string): Promise<string>;
  write(filePath: string, content: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  list(directoryPath: string): Promise<string[]>;
  watch(filePath: string, handler: (event: FileChangeEvent) => void): () => void;
}

export interface Logger {
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
  debug(message: string, data?: any): void;
}

export interface ConfigService {
  get(key: string, defaultValue?: any): any;
  set(key: string, value: any): void;
  getAll(): any;
  reset(): void;
}

export interface StorageService {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface UIService {
  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
  showDialog(options: DialogOptions): Promise<any>;
  registerMenuItem(item: PluginMenuItem): void;
  registerCommand(command: PluginCommand): void;
}

export interface DialogOptions {
  title: string;
  message: string;
  type: 'info' | 'confirm' | 'prompt' | 'custom';
  buttons?: string[];
  defaultValue?: string;
  component?: React.ComponentType<any>;
}

// Plugin manifest structure
export interface PluginManifest {
  name: string;
  id: string;
  version: string;
  author: string;
  description: string;
  icon?: string;
  main: string; // Entry point file
  permissions: PluginPermission[];
  dependencies?: string[];
  engines?: {
    node?: string;
    acas?: string;
  };
  keywords?: string[];
  repository?: {
    type: string;
    url: string;
  };
  license?: string;
}

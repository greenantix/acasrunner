export interface Workflow {
  id: string;
  name: string;
  description: string;
  version: string;
  created: Date;
  updated: Date;
  author: string;
  enabled: boolean;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  variables: WorkflowVariable[];
  settings: WorkflowSettings;
  metadata: {
    executions: number;
    lastRun?: Date;
    averageRuntime: number;
    successRate: number;
    tags: string[];
  };
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'loop' | 'parallel' | 'ai_flow';
  action: WorkflowAction;
  position: { x: number; y: number };
  connections: {
    inputs: string[]; // IDs of previous steps
    outputs: WorkflowConnection[]; // Conditional outputs
  };
  config: Record<string, any>;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  errorHandling?: ErrorHandling;
}

export interface WorkflowAction {
  type: string; // 'file.read', 'ai.analyze', 'plugin.execute', etc.
  provider: string; // Which service/plugin provides this action
  parameters: Record<string, any>;
  parameterSchema: any; // JSON schema for validation
}

export interface WorkflowTrigger {
  id: string;
  type: 'file_change' | 'schedule' | 'activity' | 'escalation' | 'manual' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
}

export interface WorkflowConnection {
  targetStepId: string;
  condition?: WorkflowCondition;
  label?: string;
}

export interface WorkflowCondition {
  type: 'success' | 'failure' | 'expression';
  expression?: string; // JavaScript expression
}

export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: any;
  description?: string;
  required: boolean;
}

export interface WorkflowSettings {
  timeout: number; // Maximum execution time in milliseconds
  maxRetries: number;
  concurrency: number; // Maximum parallel step executions
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    channels: string[]; // chat, email, slack, etc.
  };
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffType: 'fixed' | 'exponential' | 'linear';
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  jitter: boolean;
}

export interface ErrorHandling {
  strategy: 'fail' | 'continue' | 'retry' | 'skip';
  fallbackStepId?: string;
  customHandler?: string;
}

// Execution interfaces
export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  triggeredBy: WorkflowTrigger;
  variables: Map<string, any>;
  stepResults: Map<string, any>;
  startTime: Date;
  timeoutAt?: Date;
  dryRun?: boolean;
}

export interface ExecutionResult {
  executionId: string;
  workflowId: string;
  status: 'success' | 'failure' | 'cancelled' | 'timeout' | 'running';
  startTime: Date;
  endTime?: Date;
  duration: number;
  steps: StepExecutionResult[];
  output?: any;
  error?: string;
  triggeredBy: WorkflowTrigger;
}

export interface StepExecutionResult {
  stepId: string;
  stepName: string;
  status: 'success' | 'failure' | 'skipped' | 'running';
  startTime: Date;
  endTime?: Date;
  duration: number;
  input?: any;
  output?: any;
  error?: string;
  retryCount: number;
}

export interface StepResult {
  success: boolean;
  output?: any;
  error?: string;
  shouldContinue?: boolean;
  nextStepId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  stepId?: string;
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  stepId?: string;
  field: string;
  message: string;
  code: string;
}

// Trigger-specific types
export interface FileChangeTriggerConfig {
  path: string;
  events: ('add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir')[];
  pattern?: string; // glob pattern
  ignored?: string[]; // ignored patterns
  debounce?: number; // milliseconds to debounce events
}

export interface ScheduleTriggerConfig {
  cron: string;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ActivityTriggerConfig {
  activityTypes: string[];
  severity?: string[];
  component?: string[];
  pattern?: string; // regex pattern for activity description
}

export interface EscalationTriggerConfig {
  escalationTypes: string[];
  severity?: string[];
  confidence?: number; // minimum confidence threshold
}

export interface WebhookTriggerConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  secret?: string;
  headers?: Record<string, string>;
}

// Action-specific types
export interface FileActionParameters {
  path: string;
  content?: string;
  encoding?: string;
  append?: boolean;
  backup?: boolean;
}

export interface AIActionParameters {
  provider: 'claude' | 'openai' | 'gemini';
  model?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  includeContext?: boolean;
  contextTypes?: ('activity' | 'files' | 'escalation')[];
}

export interface GitActionParameters {
  command: 'commit' | 'push' | 'pull' | 'status' | 'log' | 'diff';
  message?: string;
  files?: string[];
  remote?: string;
  branch?: string;
  addAll?: boolean;
}

export interface PluginActionParameters {
  pluginId: string;
  command: string;
  arguments?: string[];
  timeout?: number;
}

export interface NotificationActionParameters {
  type: 'chat' | 'email' | 'slack' | 'webhook';
  target: string; // channel, email, webhook URL
  message: string;
  title?: string;
  urgent?: boolean;
  attachments?: any[];
}

export interface ShellActionParameters {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: boolean;
}

// Workflow builder types
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  definition: Partial<Workflow>;
  variables: WorkflowVariable[];
}

export interface StepTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  action: WorkflowAction;
  defaultConfig: Record<string, any>;
}

export interface WorkflowCanvas {
  zoom: number;
  pan: { x: number; y: number };
  grid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface ConnectionPoint {
  stepId: string;
  type: 'input' | 'output';
  position: { x: number; y: number };
}

export interface DraggedConnection {
  from: ConnectionPoint;
  to?: ConnectionPoint;
  temporary: boolean;
}

// Runtime types
export interface WorkflowQueue {
  pending: QueuedExecution[];
  running: QueuedExecution[];
  completed: QueuedExecution[];
  failed: QueuedExecution[];
}

export interface QueuedExecution {
  id: string;
  workflowId: string;
  priority: number;
  scheduledAt: Date;
  triggeredBy: WorkflowTrigger;
  context?: Record<string, any>;
}

export interface WorkflowMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  executionsToday: number;
  executionsThisWeek: number;
  mostUsedActions: Array<{
    actionType: string;
    count: number;
  }>;
  errorsByType: Array<{
    errorType: string;
    count: number;
  }>;
}

// Events
export interface WorkflowEvent {
  type: 'execution.started' | 'execution.completed' | 'execution.failed' | 'step.started' | 'step.completed' | 'step.failed';
  workflowId: string;
  executionId: string;
  stepId?: string;
  timestamp: Date;
  data: any;
}

export interface WorkflowEventListener {
  (event: WorkflowEvent): void | Promise<void>;
}

// History and audit
export interface WorkflowVersion {
  id: string;
  workflowId: string;
  version: string;
  definition: Workflow;
  createdAt: Date;
  createdBy: string;
  changes: string;
}

export interface WorkflowAuditLog {
  id: string;
  workflowId: string;
  action: 'created' | 'updated' | 'deleted' | 'executed' | 'enabled' | 'disabled';
  userId: string;
  timestamp: Date;
  details: Record<string, any>;
  ipAddress?: string;
}

// Import/Export
export interface WorkflowExport {
  version: string;
  timestamp: Date;
  workflows: Workflow[];
  templates: WorkflowTemplate[];
  metadata: {
    exportedBy: string;
    source: string;
    format: 'json' | 'yaml';
  };
}

export interface WorkflowImportResult {
  imported: string[];
  skipped: string[];
  errors: Array<{
    workflowId?: string;
    error: string;
  }>;
}

// Search and filtering
export interface WorkflowSearchFilters {
  query?: string;
  tags?: string[];
  author?: string;
  enabled?: boolean;
  hasExecutions?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  triggerTypes?: string[];
  actionTypes?: string[];
}

export interface WorkflowSearchResult {
  workflows: Workflow[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    tags: Array<{ tag: string; count: number }>;
    authors: Array<{ author: string; count: number }>;
    triggerTypes: Array<{ type: string; count: number }>;
    actionTypes: Array<{ type: string; count: number }>;
  };
}
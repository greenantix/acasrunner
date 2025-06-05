# Claude-Step5.md - Workflow Orchestration Implementation

## Current State
The orchestration page shows mock workflows with no actual execution engine. We need to implement a complete workflow orchestration system that can automate complex multi-step processes involving file operations, AI analysis, plugin execution, and external integrations.

## Implementation Goals

### 1. Workflow Engine
**Location**: `src/services/orchestration/workflow-engine.ts`

Create a robust execution engine that:
- Executes workflows based on triggers
- Manages step dependencies and conditions
- Handles parallel and sequential execution
- Provides error recovery and retry mechanisms
- Supports workflow scheduling and queuing
- Tracks execution history and performance

### 2. Visual Workflow Builder
**Location**: `src/app/(app)/orchestration/builder/page.tsx`

Implement a drag-and-drop interface for:
- Creating workflows visually
- Connecting steps with conditional logic
- Configuring step parameters
- Testing workflows in sandbox mode
- Importing/exporting workflow definitions
- Version control for workflows

### 3. Trigger System
**Location**: `src/services/orchestration/triggers/`

Support multiple trigger types:
- **File System Triggers** - File changes, creation, deletion
- **Schedule Triggers** - Cron-like scheduling
- **Activity Triggers** - Based on activity monitor events
- **AI Escalation Triggers** - When AI escalations occur
- **Plugin Triggers** - Custom plugin-defined triggers
- **Manual Triggers** - User-initiated execution
- **Webhook Triggers** - External system integration

### 4. Action Library
**Location**: `src/services/orchestration/actions/`

Comprehensive action types:
- **File Operations** - Read, write, move, copy, delete
- **AI Operations** - Send to LLM, analyze, generate
- **Plugin Operations** - Execute plugin commands
- **Shell Operations** - Run system commands
- **Git Operations** - Commit, push, pull, merge
- **Notification Operations** - Email, Slack, chat
- **Data Operations** - Transform, filter, aggregate

## Technical Requirements

### Workflow Definition Schema
```typescript
// src/types/workflow.ts
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
```

### Execution Engine Architecture
```typescript
// src/services/orchestration/workflow-engine.ts
export class WorkflowEngine {
  private executionQueue: ExecutionQueue;
  private stepExecutors: Map<string, StepExecutor>;
  private triggerManager: TriggerManager;
  
  async executeWorkflow(workflowId: string, context?: ExecutionContext): Promise<ExecutionResult>;
  async scheduleWorkflow(workflowId: string, trigger: WorkflowTrigger): Promise<void>;
  async cancelExecution(executionId: string): Promise<void>;
  async pauseExecution(executionId: string): Promise<void>;
  async resumeExecution(executionId: string): Promise<void>;
  
  // Step execution
  async executeStep(step: WorkflowStep, context: ExecutionContext): Promise<StepResult>;
  async evaluateCondition(condition: WorkflowCondition, context: ExecutionContext): Promise<boolean>;
  
  // Monitoring
  getExecutionStatus(executionId: string): ExecutionStatus;
  getExecutionHistory(workflowId: string, limit?: number): ExecutionRecord[];
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  triggeredBy: WorkflowTrigger;
  variables: Map<string, any>;
  stepResults: Map<string, any>;
  startTime: Date;
  timeoutAt?: Date;
}

export interface ExecutionResult {
  executionId: string;
  status: 'success' | 'failure' | 'cancelled' | 'timeout';
  startTime: Date;
  endTime: Date;
  duration: number;
  steps: StepExecutionResult[];
  output?: any;
  error?: string;
}
```

### Step Executor System
```typescript
// src/services/orchestration/executors/base-executor.ts
export abstract class StepExecutor {
  abstract type: string;
  abstract execute(step: WorkflowStep, context: ExecutionContext): Promise<StepResult>;
  abstract validate(step: WorkflowStep): ValidationResult;
  abstract getParameterSchema(): any;
}

// Example implementations:
// src/services/orchestration/executors/file-executor.ts
export class FileExecutor extends StepExecutor {
  type = 'file';
  
  async execute(step: WorkflowStep, context: ExecutionContext): Promise<StepResult> {
    const { action, parameters } = step.action;
    
    switch (action) {
      case 'file.read':
        return await this.readFile(parameters.path, context);
      case 'file.write':
        return await this.writeFile(parameters.path, parameters.content, context);
      case 'file.move':
        return await this.moveFile(parameters.source, parameters.destination, context);
      default:
        throw new Error(`Unknown file action: ${action}`);
    }
  }
  
  private async readFile(path: string, context: ExecutionContext): Promise<StepResult> {
    try {
      const content = await fs.readFile(this.resolvePath(path, context), 'utf8');
      return { success: true, output: { content, path } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// src/services/orchestration/executors/ai-executor.ts
export class AIExecutor extends StepExecutor {
  type = 'ai';
  
  async execute(step: WorkflowStep, context: ExecutionContext): Promise<StepResult> {
    const { provider, model, prompt, includeContext } = step.action.parameters;
    
    let enhancedPrompt = prompt;
    if (includeContext) {
      const contextData = await this.gatherContext(context);
      enhancedPrompt = `${prompt}\n\nContext:\n${contextData}`;
    }
    
    const aiService = this.getAIService(provider);
    const response = await aiService.generate({
      model,
      prompt: enhancedPrompt,
      maxTokens: step.action.parameters.maxTokens || 1000
    });
    
    return {
      success: true,
      output: {
        response: response.text,
        tokens: response.tokens,
        model: response.model
      }
    };
  }
}
```

## Visual Workflow Builder

### Drag-and-Drop Interface
```typescript
// src/app/(app)/orchestration/builder/page.tsx
export default function WorkflowBuilderPage() {
  const [workflow, setWorkflow] = useState<Workflow>(createEmptyWorkflow());
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  const handleStepAdd = (stepType: string, position: { x: number; y: number }) => {
    const newStep = createStep(stepType, position);
    setWorkflow(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };
  
  const handleStepConnect = (sourceId: string, targetId: string) => {
    setWorkflow(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === sourceId 
          ? {
              ...step,
              connections: {
                ...step.connections,
                outputs: [...step.connections.outputs, { targetStepId: targetId }]
              }
            }
          : step
      )
    }));
  };
  
  const handleTestRun = async () => {
    setIsRunning(true);
    try {
      const result = await workflowEngine.executeWorkflow(workflow.id, {
        mode: 'test',
        dryRun: true
      });
      toast.success(`Test completed: ${result.status}`);
    } catch (error) {
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  return (
    <div className="h-full flex">
      {/* Workflow canvas */}
      <div className="flex-1 relative">
        <WorkflowCanvas
          workflow={workflow}
          selectedStep={selectedStep}
          onStepSelect={setSelectedStep}
          onStepAdd={handleStepAdd}
          onStepConnect={handleStepConnect}
          onStepMove={handleStepMove}
          onStepDelete={handleStepDelete}
        />
        
        {/* Toolbar */}
        <WorkflowToolbar
          onSave={handleSave}
          onTest={handleTestRun}
          onDeploy={handleDeploy}
          isRunning={isRunning}
        />
      </div>
      
      {/* Step library sidebar */}
      <WorkflowSidebar>
        <StepLibrary onStepDrag={handleStepDrag} />
        {selectedStep && (
          <StepConfigPanel
            step={selectedStep}
            onChange={handleStepChange}
          />
        )}
      </WorkflowSidebar>
    </div>
  );
}
```

### Canvas Component
```typescript
// src/components/workflow/workflow-canvas.tsx
export function WorkflowCanvas({ workflow, onStepAdd, onStepConnect }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const stepType = e.dataTransfer?.getData('stepType');
    const rect = canvasRef.current?.getBoundingClientRect();
    
    if (stepType && rect) {
      const position = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      onStepAdd(stepType, position);
    }
  };
  
  return (
    <div
      ref={canvasRef}
      className="w-full h-full bg-slate-50 relative overflow-auto"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Render workflow steps */}
      {workflow.steps.map(step => (
        <WorkflowStepNode
          key={step.id}
          step={step}
          selected={selectedStep?.id === step.id}
          onSelect={() => onStepSelect(step)}
          onMove={(position) => onStepMove(step.id, position)}
          onDelete={() => onStepDelete(step.id)}
          onConnectionStart={(stepId) => handleConnectionStart(stepId)}
          onConnectionEnd={(stepId) => handleConnectionEnd(stepId)}
        />
      ))}
      
      {/* Render connections */}
      <ConnectionLayer connections={connections} />
      
      {/* Grid background */}
      <GridBackground />
    </div>
  );
}
```

## Trigger System Implementation

### File System Triggers
```typescript
// src/services/orchestration/triggers/file-trigger.ts
export class FileTrigger implements TriggerHandler {
  type = 'file_change';
  private watchers: Map<string, FSWatcher> = new Map();
  
  async setup(trigger: WorkflowTrigger, workflowId: string): Promise<void> {
    const { path, events, pattern } = trigger.config;
    
    const watcher = chokidar.watch(path, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true
    });
    
    watcher.on('all', (event, filePath) => {
      if (this.shouldTrigger(event, filePath, trigger.config)) {
        this.executeWorkflow(workflowId, {
          trigger: trigger.id,
          event,
          filePath,
          timestamp: new Date()
        });
      }
    });
    
    this.watchers.set(trigger.id, watcher);
  }
  
  async teardown(triggerId: string): Promise<void> {
    const watcher = this.watchers.get(triggerId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(triggerId);
    }
  }
  
  private shouldTrigger(event: string, filePath: string, config: any): boolean {
    // Check if event matches configured events
    if (config.events && !config.events.includes(event)) {
      return false;
    }
    
    // Check if file matches pattern
    if (config.pattern && !minimatch(filePath, config.pattern)) {
      return false;
    }
    
    return true;
  }
}
```

### Schedule Triggers
```typescript
// src/services/orchestration/triggers/schedule-trigger.ts
export class ScheduleTrigger implements TriggerHandler {
  type = 'schedule';
  private jobs: Map<string, CronJob> = new Map();
  
  async setup(trigger: WorkflowTrigger, workflowId: string): Promise<void> {
    const { cron, timezone } = trigger.config;
    
    const job = new CronJob(cron, () => {
      this.executeWorkflow(workflowId, {
        trigger: trigger.id,
        scheduledTime: new Date(),
        timezone
      });
    }, null, true, timezone);
    
    this.jobs.set(trigger.id, job);
  }
  
  async teardown(triggerId: string): Promise<void> {
    const job = this.jobs.get(triggerId);
    if (job) {
      job.stop();
      this.jobs.delete(triggerId);
    }
  }
}
```

## Action Library

### Built-in Actions
```typescript
// src/services/orchestration/actions/action-registry.ts
export const BUILT_IN_ACTIONS = {
  // File operations
  'file.read': {
    executor: FileExecutor,
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' },
        encoding: { type: 'string', default: 'utf8' }
      },
      required: ['path']
    }
  },
  
  'file.write': {
    executor: FileExecutor,
    schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write' },
        content: { type: 'string', description: 'Content to write' },
        append: { type: 'boolean', default: false }
      },
      required: ['path', 'content']
    }
  },
  
  // AI operations
  'ai.analyze': {
    executor: AIExecutor,
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['claude', 'openai', 'gemini'] },
        model: { type: 'string' },
        prompt: { type: 'string', description: 'Analysis prompt' },
        includeContext: { type: 'boolean', default: true },
        maxTokens: { type: 'number', default: 1000 }
      },
      required: ['provider', 'prompt']
    }
  },
  
  // Git operations
  'git.commit': {
    executor: GitExecutor,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' },
        files: { type: 'array', items: { type: 'string' } },
        addAll: { type: 'boolean', default: false }
      },
      required: ['message']
    }
  },
  
  // Plugin operations
  'plugin.execute': {
    executor: PluginExecutor,
    schema: {
      type: 'object',
      properties: {
        pluginId: { type: 'string', description: 'Plugin identifier' },
        command: { type: 'string', description: 'Plugin command to execute' },
        arguments: { type: 'array', items: { type: 'string' } }
      },
      required: ['pluginId', 'command']
    }
  },
  
  // Notification operations
  'notify.slack': {
    executor: NotificationExecutor,
    schema: {
      type: 'object',
      properties: {
        channel: { type: 'string', description: 'Slack channel' },
        message: { type: 'string', description: 'Message to send' },
        username: { type: 'string' },
        iconEmoji: { type: 'string' }
      },
      required: ['channel', 'message']
    }
  }
};
```

## Database Schema

### Workflow Tables
```sql
-- Workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL,
  definition JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  author_id UUID NOT NULL,
  metadata JSONB
);

-- Workflow executions table
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  triggered_by JSONB NOT NULL,
  context JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_ms INTEGER,
  output JSONB,
  error_message TEXT
);

-- Step executions table
CREATE TABLE step_executions (
  id UUID PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_id VARCHAR(255) NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_ms INTEGER,
  input JSONB,
  output JSONB,
  error_message TEXT
);

-- Workflow triggers table
CREATE TABLE workflow_triggers (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Workflow Management
- `GET /api/workflows` - List workflows
- `POST /api/workflows` - Create workflow
- `GET /api/workflows/:id` - Get workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/:id/duplicate` - Duplicate workflow

### Execution Management
- `POST /api/workflows/:id/execute` - Execute workflow manually
- `GET /api/workflows/:id/executions` - Get execution history
- `GET /api/executions/:id` - Get execution details
- `POST /api/executions/:id/cancel` - Cancel execution
- `POST /api/executions/:id/retry` - Retry failed execution

### Builder API
- `GET /api/workflows/actions` - Get available actions
- `POST /api/workflows/:id/validate` - Validate workflow
- `POST /api/workflows/:id/test` - Test workflow in sandbox

## Integration Features

### Activity Monitor Integration
- Workflows can be triggered by specific activity events
- Activity context automatically included in workflow execution
- Workflow results can generate new activity events

### AI Escalation Integration
- AI escalations can trigger remediation workflows
- Workflow results can be sent back to AI for analysis
- Escalation context included in AI workflow steps

### Plugin Integration
- Plugins can register custom actions and triggers
- Plugin commands can be executed as workflow steps
- Plugins can contribute to workflow templates

### Chat Integration
- Workflow results can be sent to chat sessions
- Chat commands can trigger workflows
- Workflow progress notifications in chat

## Implementation Priority

1. **Critical**: Basic workflow engine and execution
2. **Critical**: File and AI action executors
3. **High**: Visual workflow builder interface
4. **High**: Schedule and file system triggers
5. **Medium**: Advanced actions (git, notifications)
6. **Medium**: Plugin integration
7. **Low**: Advanced features (branching, parallel execution)
8. **Low**: Collaboration and sharing features

## Success Criteria

- Users can create workflows using drag-and-drop interface
- File changes automatically trigger configured workflows
- AI analysis can be incorporated into automated workflows
- Scheduled workflows run reliably
- Plugin commands can be executed as workflow steps
- Workflow execution history is tracked and accessible
- Error handling and retry mechanisms work properly
- Performance remains good with complex workflows

## Files to Create/Modify

- `src/services/orchestration/` (new directory)
  - `workflow-engine.ts`
  - `trigger-manager.ts`
  - `execution-queue.ts`
  - `executors/`
  - `triggers/`
  - `actions/`
- `src/app/(app)/orchestration/builder/page.tsx` (new)
- `src/components/workflow/` (new directory)
- `src/types/workflow.ts` (new)
- `src/api/workflows/` (new API routes)
- Database migration scripts
- `src/app/(app)/orchestration/page.tsx` (major rewrite)

## Example Workflows

### 1. Automated Code Review
```yaml
name: "Automated Code Review"
triggers:
  - type: file_change
    config:
      path: "src/**/*.{ts,js,tsx,jsx}"
      events: ["change"]

steps:
  - name: "Read Changed File"
    type: action
    action:
      type: file.read
      parameters:
        path: "{{trigger.filePath}}"
  
  - name: "AI Code Review"
    type: action
    action:
      type: ai.analyze
      parameters:
        provider: claude
        prompt: "Review this code for potential issues, style problems, and improvements:\n\n{{steps.read_file.output.content}}"
  
  - name: "Post to Chat"
    type: action
    action:
      type: chat.send
      parameters:
        message: "Code review for {{trigger.filePath}}:\n\n{{steps.ai_review.output.response}}"
```

### 2. Daily Documentation Update
```yaml
name: "Daily Documentation Update"
triggers:
  - type: schedule
    config:
      cron: "0 9 * * 1-5"  # 9 AM weekdays

steps:
  - name: "Get Recent Changes"
    type: action
    action:
      type: git.log
      parameters:
        since: "1 day ago"
  
  - name: "Generate Documentation"
    type: action
    action:
      type: ai.analyze
      parameters:
        provider: gemini
        prompt: "Generate documentation updates based on these recent changes:\n\n{{steps.git_log.output}}"
  
  - name: "Update README"
    type: action
    action:
      type: file.write
      parameters:
        path: "README.md"
        content: "{{steps.generate_docs.output.response}}"
  
  - name: "Commit Changes"
    type: action
    action:
      type: git.commit
      parameters:
        message: "docs: automated documentation update"
        files: ["README.md"]
```

This completes the comprehensive implementation plan for the ACAS Runner system. Each step builds upon the previous ones, creating a cohesive developer workflow automation platform that combines real-time monitoring, AI assistance, extensible plugins, advanced chat capabilities, and powerful workflow orchestration.
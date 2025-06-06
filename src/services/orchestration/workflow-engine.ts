import { 
  Workflow, 
  WorkflowStep, 
  ExecutionContext, 
  ExecutionResult, 
  StepResult, 
  StepExecutionResult,
  WorkflowCondition,
  WorkflowEvent,
  WorkflowEventListener
} from '@/types/workflow';
import { TriggerManager } from './trigger-manager';
import { ExecutionQueue } from './execution-queue';
import { StepExecutorRegistry } from './executors/executor-registry';
import { WorkflowService } from './workflow-service';

export class WorkflowEngine {
  private executionQueue: ExecutionQueue;
  private stepExecutors: StepExecutorRegistry;
  private triggerManager: TriggerManager;
  private workflowService: WorkflowService;
  private eventListeners: Map<string, WorkflowEventListener[]> = new Map();
  private activeExecutions: Map<string, ExecutionContext> = new Map();

  constructor() {
    this.executionQueue = new ExecutionQueue();
    this.stepExecutors = new StepExecutorRegistry();
    this.triggerManager = new TriggerManager(this);
    this.workflowService = new WorkflowService();
    
    this.initializeExecutors();
  }

  private initializeExecutors() {
    // Initialize built-in step executors
    // This will be expanded when we create the executor classes
  }

  async start(): Promise<void> {
    await this.triggerManager.start();
    await this.executionQueue.start();
  }

  async stop(): Promise<void> {
    await this.triggerManager.stop();
    await this.executionQueue.stop();
    
    // Cancel all active executions
    for (const [executionId] of this.activeExecutions) {
      await this.cancelExecution(executionId);
    }
  }

  async executeWorkflow(
    workflowId: string, 
    context?: Partial<ExecutionContext>
  ): Promise<ExecutionResult> {
    try {
      const workflow = await this.workflowService.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      if (!workflow.enabled) {
        throw new Error(`Workflow is disabled: ${workflowId}`);
      }

      const executionId = this.generateExecutionId();
      const executionContext: ExecutionContext = {
        workflowId,
        executionId,
        triggeredBy: context?.triggeredBy || { 
          id: 'manual', 
          type: 'manual', 
          config: {}, 
          enabled: true 
        },
        variables: context?.variables || new Map(),
        stepResults: new Map(),
        startTime: new Date(),
        timeoutAt: context?.timeoutAt,
        dryRun: context?.dryRun || false
      };

      this.activeExecutions.set(executionId, executionContext);

      // Emit execution started event
      await this.emitEvent({
        type: 'execution.started',
        workflowId,
        executionId,
        timestamp: new Date(),
        data: { context: executionContext }
      });

      try {
        const result = await this.executeWorkflowSteps(workflow, executionContext);
        
        // Update workflow execution statistics
        await this.workflowService.updateExecutionStats(workflowId, result);
        
        // Emit execution completed event
        await this.emitEvent({
          type: result.status === 'success' ? 'execution.completed' : 'execution.failed',
          workflowId,
          executionId,
          timestamp: new Date(),
          data: { result }
        });

        return result;
      } catch (error) {
        const errorResult: ExecutionResult = {
          executionId,
          workflowId,
          status: 'failure',
          startTime: executionContext.startTime,
          endTime: new Date(),
          duration: Date.now() - executionContext.startTime.getTime(),
          steps: [],
          error: error instanceof Error ? error.message : 'Unknown error',
          triggeredBy: executionContext.triggeredBy
        };

        await this.emitEvent({
          type: 'execution.failed',
          workflowId,
          executionId,
          timestamp: new Date(),
          data: { result: errorResult, error }
        });

        return errorResult;
      } finally {
        this.activeExecutions.delete(executionId);
      }
    } catch (error) {
      throw new Error(`Failed to execute workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeWorkflowSteps(
    workflow: Workflow, 
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const stepResults: StepExecutionResult[] = [];
    const executedSteps = new Set<string>();
    const stepQueue: string[] = [];
    
    // Find initial steps (steps with no inputs)
    const initialSteps = workflow.steps.filter(step => 
      step.connections.inputs.length === 0
    );
    
    if (initialSteps.length === 0 && workflow.steps.length > 0) {
      throw new Error('Workflow has no initial steps (steps without inputs)');
    }

    // Add initial steps to queue
    stepQueue.push(...initialSteps.map(step => step.id));

    while (stepQueue.length > 0) {
      const stepId = stepQueue.shift()!;
      
      if (executedSteps.has(stepId)) {
        continue;
      }

      const step = workflow.steps.find(s => s.id === stepId);
      if (!step) {
        continue;
      }

      // Check if all input dependencies are satisfied
      const inputsReady = step.connections.inputs.every(inputStepId => 
        executedSteps.has(inputStepId)
      );

      if (!inputsReady) {
        // Re-queue this step for later
        stepQueue.push(stepId);
        continue;
      }

      // Execute the step
      const stepResult = await this.executeStep(step, context);
      stepResults.push(stepResult);
      executedSteps.add(stepId);

      // Store step result in context
      context.stepResults.set(stepId, stepResult.output);

      // If step failed and error handling is set to fail, stop execution
      if (stepResult.status === 'failure' && step.errorHandling?.strategy === 'fail') {
        return {
          executionId: context.executionId,
          workflowId: context.workflowId,
          status: 'failure',
          startTime: context.startTime,
          endTime: new Date(),
          duration: Date.now() - context.startTime.getTime(),
          steps: stepResults,
          error: stepResult.error,
          triggeredBy: context.triggeredBy
        };
      }

      // Add output steps to queue based on conditions
      if (stepResult.status === 'success' || step.errorHandling?.strategy === 'continue') {
        for (const connection of step.connections.outputs) {
          const shouldExecute = await this.evaluateCondition(
            connection.condition, 
            context, 
            stepResult
          );
          
          if (shouldExecute) {
            stepQueue.push(connection.targetStepId);
          }
        }
      }

      // Check for timeout
      if (context.timeoutAt && new Date() > context.timeoutAt) {
        return {
          executionId: context.executionId,
          workflowId: context.workflowId,
          status: 'timeout',
          startTime: context.startTime,
          endTime: new Date(),
          duration: Date.now() - context.startTime.getTime(),
          steps: stepResults,
          error: 'Workflow execution timed out',
          triggeredBy: context.triggeredBy
        };
      }
    }

    // All steps executed successfully
    return {
      executionId: context.executionId,
      workflowId: context.workflowId,
      status: 'success',
      startTime: context.startTime,
      endTime: new Date(),
      duration: Date.now() - context.startTime.getTime(),
      steps: stepResults,
      triggeredBy: context.triggeredBy
    };
  }

  async executeStep(
    step: WorkflowStep, 
    context: ExecutionContext
  ): Promise<StepExecutionResult> {
    const startTime = new Date();
    
    await this.emitEvent({
      type: 'step.started',
      workflowId: context.workflowId,
      executionId: context.executionId,
      stepId: step.id,
      timestamp: startTime,
      data: { step }
    });

    try {
      // Get step executor
      const executor = this.stepExecutors.getExecutor(step.action.type);
      if (!executor) {
        throw new Error(`No executor found for action type: ${step.action.type}`);
      }

      // Resolve parameters with context variables
      const resolvedParameters = await this.resolveParameters(
        step.action.parameters, 
        context
      );

      // Create resolved step
      const resolvedStep: WorkflowStep = {
        ...step,
        action: {
          ...step.action,
          parameters: resolvedParameters
        }
      };

      // Execute with timeout and retry logic
      let lastError: Error | null = null;
      const maxAttempts = (step.retryPolicy?.maxAttempts || 1);
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          if (context.dryRun) {
            // In dry run mode, simulate execution
            const result: StepResult = {
              success: true,
              output: { simulated: true, action: step.action.type }
            };
            
            return this.createStepExecutionResult(
              step, startTime, result, attempt - 1
            );
          }

          const result = await this.executeStepWithTimeout(
            executor, resolvedStep, context, step.timeout
          );

          if (result.success) {
            await this.emitEvent({
              type: 'step.completed',
              workflowId: context.workflowId,
              executionId: context.executionId,
              stepId: step.id,
              timestamp: new Date(),
              data: { step, result }
            });

            return this.createStepExecutionResult(
              step, startTime, result, attempt - 1
            );
          } else {
            lastError = new Error(result.error || 'Step execution failed');
            
            // If this is not the last attempt, wait before retrying
            if (attempt < maxAttempts && step.retryPolicy) {
              const delay = this.calculateRetryDelay(step.retryPolicy, attempt);
              await this.sleep(delay);
            }
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          
          // If this is not the last attempt, wait before retrying
          if (attempt < maxAttempts && step.retryPolicy) {
            const delay = this.calculateRetryDelay(step.retryPolicy, attempt);
            await this.sleep(delay);
          }
        }
      }

      // All attempts failed
      const failureResult: StepExecutionResult = {
        stepId: step.id,
        stepName: step.name,
        status: 'failure',
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
        error: lastError?.message || 'Step execution failed',
        retryCount: maxAttempts - 1
      };

      await this.emitEvent({
        type: 'step.failed',
        workflowId: context.workflowId,
        executionId: context.executionId,
        stepId: step.id,
        timestamp: new Date(),
        data: { step, result: failureResult, error: lastError }
      });

      return failureResult;
    } catch (error) {
      const errorResult: StepExecutionResult = {
        stepId: step.id,
        stepName: step.name,
        status: 'failure',
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
        error: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0
      };

      await this.emitEvent({
        type: 'step.failed',
        workflowId: context.workflowId,
        executionId: context.executionId,
        stepId: step.id,
        timestamp: new Date(),
        data: { step, result: errorResult, error }
      });

      return errorResult;
    }
  }

  private async executeStepWithTimeout(
    executor: any,
    step: WorkflowStep,
    context: ExecutionContext,
    timeout?: number
  ): Promise<StepResult> {
    const timeoutMs = timeout || 30000; // Default 30 seconds
    
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Step execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      try {
        const result = await executor.execute(step, context);
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  private createStepExecutionResult(
    step: WorkflowStep,
    startTime: Date,
    result: StepResult,
    retryCount: number
  ): StepExecutionResult {
    return {
      stepId: step.id,
      stepName: step.name,
      status: result.success ? 'success' : 'failure',
      startTime,
      endTime: new Date(),
      duration: Date.now() - startTime.getTime(),
      output: result.output,
      error: result.error,
      retryCount
    };
  }

  private async evaluateCondition(
    condition: WorkflowCondition | undefined,
    context: ExecutionContext,
    stepResult: StepExecutionResult
  ): Promise<boolean> {
    if (!condition) {
      return true; // No condition means always execute
    }

    switch (condition.type) {
      case 'success':
        return stepResult.status === 'success';
      
      case 'failure':
        return stepResult.status === 'failure';
      
      case 'expression':
        if (!condition.expression) {
          return true;
        }
        
        try {
          // Create evaluation context
          const evalContext = {
            step: stepResult,
            variables: Object.fromEntries(context.variables),
            stepResults: Object.fromEntries(context.stepResults)
          };
          
          // Simple expression evaluation (in production, use a safe evaluator)
          const func = new Function('context', `
            const { step, variables, stepResults } = context;
            return ${condition.expression};
          `);
          
          return Boolean(func(evalContext));
        } catch (error) {
          console.error('Error evaluating condition:', error);
          return false;
        }
      
      default:
        return true;
    }
  }

  private async resolveParameters(
    parameters: Record<string, any>,
    context: ExecutionContext
  ): Promise<Record<string, any>> {
    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(parameters)) {
      resolved[key] = await this.resolveValue(value, context);
    }
    
    return resolved;
  }

  private async resolveValue(value: any, context: ExecutionContext): Promise<any> {
    if (typeof value === 'string') {
      // Replace template variables like {{variable}} or {{steps.stepId.output.field}}
      return value.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
        try {
          const trimmed = expression.trim();
          
          // Handle variables
          if (trimmed.startsWith('variables.')) {
            const varName = trimmed.substring(10);
            return context.variables.get(varName) || '';
          }
          
          // Handle step results
          if (trimmed.startsWith('steps.')) {
            const path = trimmed.substring(6).split('.');
            const stepId = path[0];
            const stepResult = context.stepResults.get(stepId);
            
            if (!stepResult) {
              return '';
            }
            
            // Navigate through the path
            let current = stepResult;
            for (let i = 1; i < path.length; i++) {
              current = current?.[path[i]];
            }
            
            return current || '';
          }
          
          // Handle trigger data
          if (trimmed.startsWith('trigger.')) {
            const path = trimmed.substring(8).split('.');
            let current = context.triggeredBy.config;
            
            for (const key of path) {
              current = current?.[key];
            }
            
            return current || '';
          }
          
          return match; // Return original if not resolved
        } catch (error) {
          return match; // Return original on error
        }
      });
    }
    
    if (Array.isArray(value)) {
      return Promise.all(value.map(v => this.resolveValue(v, context)));
    }
    
    if (value && typeof value === 'object') {
      const resolved: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        resolved[k] = await this.resolveValue(v, context);
      }
      return resolved;
    }
    
    return value;
  }

  private calculateRetryDelay(retryPolicy: any, attempt: number): number {
    const { backoffType, initialDelay, maxDelay, jitter } = retryPolicy;
    
    let delay = initialDelay;
    
    switch (backoffType) {
      case 'exponential':
        delay = initialDelay * Math.pow(2, attempt - 1);
        break;
      case 'linear':
        delay = initialDelay * attempt;
        break;
      case 'fixed':
      default:
        delay = initialDelay;
        break;
    }
    
    delay = Math.min(delay, maxDelay);
    
    if (jitter) {
      delay += Math.random() * (delay * 0.1); // Add up to 10% jitter
    }
    
    return delay;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Event system
  addEventListener(eventType: string, listener: WorkflowEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  removeEventListener(eventType: string, listener: WorkflowEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private async emitEvent(event: WorkflowEvent): Promise<void> {
    const listeners = this.eventListeners.get(event.type) || [];
    await Promise.all(listeners.map(listener => listener(event)));
  }

  // Public API methods
  async cancelExecution(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (context) {
      this.activeExecutions.delete(executionId);
      
      await this.emitEvent({
        type: 'execution.completed',
        workflowId: context.workflowId,
        executionId,
        timestamp: new Date(),
        data: { status: 'cancelled' }
      });
    }
  }

  async pauseExecution(executionId: string): Promise<void> {
    // Implementation for pausing execution
    // This would require more complex state management
    throw new Error('Pause execution not yet implemented');
  }

  async resumeExecution(executionId: string): Promise<void> {
    // Implementation for resuming execution
    throw new Error('Resume execution not yet implemented');
  }

  getExecutionStatus(executionId: string): any {
    const context = this.activeExecutions.get(executionId);
    return context ? {
      executionId,
      workflowId: context.workflowId,
      status: 'running',
      startTime: context.startTime,
      currentStep: null // Would need to track current step
    } : null;
  }

  async getExecutionHistory(workflowId: string, limit?: number): Promise<any[]> {
    return this.workflowService.getExecutionHistory(workflowId, limit);
  }

  // Workflow management
  async scheduleWorkflow(workflowId: string, trigger: any): Promise<void> {
    await this.triggerManager.registerTrigger(workflowId, trigger);
  }

  async validateWorkflow(workflow: Workflow): Promise<any> {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Validate steps
    for (const step of workflow.steps) {
      const executor = this.stepExecutors.getExecutor(step.action.type);
      if (!executor) {
        errors.push({
          stepId: step.id,
          field: 'action.type',
          message: `Unknown action type: ${step.action.type}`,
          code: 'UNKNOWN_ACTION_TYPE'
        });
        continue;
      }

      const validation = await executor.validate(step);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    }

    // Validate connections
    for (const step of workflow.steps) {
      for (const connection of step.connections.outputs) {
        const targetStep = workflow.steps.find(s => s.id === connection.targetStepId);
        if (!targetStep) {
          errors.push({
            stepId: step.id,
            field: 'connections.outputs',
            message: `Target step not found: ${connection.targetStepId}`,
            code: 'INVALID_CONNECTION'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export singleton instance
export const workflowEngine = new WorkflowEngine();

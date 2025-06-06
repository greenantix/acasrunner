import { WorkflowTrigger } from '@/types/workflow';
import { WorkflowEngine } from './workflow-engine';

export interface TriggerHandler {
  type: string;
  setup(trigger: WorkflowTrigger, workflowId: string): Promise<void>;
  teardown(triggerId: string): Promise<void>;
}

export class TriggerManager {
  private handlers: Map<string, TriggerHandler> = new Map();
  private activeTriggers: Map<string, { workflowId: string; handler: TriggerHandler }> = new Map();
  private engine: WorkflowEngine;

  constructor(engine: WorkflowEngine) {
    this.engine = engine;
    this.initializeHandlers();
  }

  private initializeHandlers() {
    // Initialize built-in trigger handlers
    // For now, we'll create simple manual triggers
  }

  async start(): Promise<void> {
    // Start all trigger handlers
    console.log('Trigger manager started');
  }

  async stop(): Promise<void> {
    // Stop all active triggers
    for (const [triggerId, { handler }] of this.activeTriggers) {
      await handler.teardown(triggerId);
    }
    this.activeTriggers.clear();
    console.log('Trigger manager stopped');
  }

  registerHandler(handler: TriggerHandler): void {
    this.handlers.set(handler.type, handler);
  }

  async registerTrigger(workflowId: string, trigger: WorkflowTrigger): Promise<void> {
    const handler = this.handlers.get(trigger.type);
    if (!handler) {
      throw new Error(`No handler found for trigger type: ${trigger.type}`);
    }

    await handler.setup(trigger, workflowId);
    this.activeTriggers.set(trigger.id, { workflowId, handler });
  }

  async unregisterTrigger(triggerId: string): Promise<void> {
    const activeTrigger = this.activeTriggers.get(triggerId);
    if (activeTrigger) {
      await activeTrigger.handler.teardown(triggerId);
      this.activeTriggers.delete(triggerId);
    }
  }

  async triggerWorkflow(workflowId: string, trigger: WorkflowTrigger, context?: any): Promise<void> {
    try {
      await this.engine.executeWorkflow(workflowId, {
        triggeredBy: trigger,
        variables: new Map(Object.entries(context || {}))
      });
    } catch (error) {
      console.error(`Failed to execute workflow ${workflowId}:`, error);
    }
  }
}

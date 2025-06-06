import { QueuedExecution, WorkflowQueue } from '@/types/workflow';

export class ExecutionQueue {
  private queue: WorkflowQueue = {
    pending: [],
    running: [],
    completed: [],
    failed: []
  };
  
  private maxConcurrentExecutions = 5;
  private isProcessing = false;
  private processingInterval?: NodeJS.Timeout;

  async start(): Promise<void> {
    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Check every second
  }

  async stop(): Promise<void> {
    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }

  addExecution(execution: QueuedExecution): void {
    // Insert in priority order (higher priority first)
    const insertIndex = this.queue.pending.findIndex(
      pending => pending.priority < execution.priority
    );
    
    if (insertIndex === -1) {
      this.queue.pending.push(execution);
    } else {
      this.queue.pending.splice(insertIndex, 0, execution);
    }
  }

  removeExecution(executionId: string): void {
    this.queue.pending = this.queue.pending.filter(e => e.id !== executionId);
    this.queue.running = this.queue.running.filter(e => e.id !== executionId);
  }

  getQueueStatus(): WorkflowQueue {
    return { ...this.queue };
  }

  private async processQueue(): Promise<void> {
    if (!this.isProcessing) return;

    // Move completed/failed executions to history
    this.cleanupOldExecutions();

    // Check if we can start more executions
    while (
      this.queue.pending.length > 0 && 
      this.queue.running.length < this.maxConcurrentExecutions
    ) {
      const execution = this.queue.pending.shift()!;
      
      // Check if scheduled time has arrived
      if (execution.scheduledAt <= new Date()) {
        this.queue.running.push(execution);
        
        // Execute asynchronously
        this.executeAsync(execution).catch(error => {
          console.error('Async execution error:', error);
          this.markExecutionFailed(execution.id, error.message);
        });
      } else {
        // Put back if not ready yet
        this.queue.pending.unshift(execution);
        break;
      }
    }
  }

  private async executeAsync(execution: QueuedExecution): Promise<void> {
    try {
      // This would integrate with the workflow engine
      // For now, simulate execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.markExecutionCompleted(execution.id);
    } catch (error) {
      this.markExecutionFailed(execution.id, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private markExecutionCompleted(executionId: string): void {
    const runningIndex = this.queue.running.findIndex(e => e.id === executionId);
    if (runningIndex > -1) {
      const execution = this.queue.running.splice(runningIndex, 1)[0];
      this.queue.completed.push(execution);
    }
  }

  private markExecutionFailed(executionId: string, error: string): void {
    const runningIndex = this.queue.running.findIndex(e => e.id === executionId);
    if (runningIndex > -1) {
      const execution = this.queue.running.splice(runningIndex, 1)[0];
      this.queue.failed.push({ ...execution, error } as any);
    }
  }

  private cleanupOldExecutions(): void {
    const maxHistory = 100;
    
    // Keep only the most recent completed executions
    if (this.queue.completed.length > maxHistory) {
      this.queue.completed = this.queue.completed.slice(-maxHistory);
    }
    
    // Keep only the most recent failed executions
    if (this.queue.failed.length > maxHistory) {
      this.queue.failed = this.queue.failed.slice(-maxHistory);
    }
  }
}

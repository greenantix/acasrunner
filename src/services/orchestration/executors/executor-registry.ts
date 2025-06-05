import { StepExecutor } from './base-executor';
import { FileExecutor } from './file-executor';
import { AIExecutor } from './ai-executor';
import { GitExecutor } from './git-executor';
import { NotificationExecutor } from './notification-executor';
import { ShellExecutor } from './shell-executor';

export class StepExecutorRegistry {
  private executors: Map<string, StepExecutor> = new Map();

  constructor() {
    this.registerBuiltInExecutors();
  }

  private registerBuiltInExecutors() {
    const builtInExecutors = [
      new FileExecutor(),
      new AIExecutor(),
      new GitExecutor(),
      new NotificationExecutor(),
      new ShellExecutor()
    ];

    for (const executor of builtInExecutors) {
      this.register(executor);
    }
  }

  register(executor: StepExecutor): void {
    this.executors.set(executor.type, executor);
  }

  unregister(type: string): void {
    this.executors.delete(type);
  }

  getExecutor(type: string): StepExecutor | undefined {
    return this.executors.get(type);
  }

  getAllExecutors(): StepExecutor[] {
    return Array.from(this.executors.values());
  }

  getExecutorsByCategory(category: string): StepExecutor[] {
    return Array.from(this.executors.values()).filter(
      executor => executor.category === category
    );
  }

  getAvailableActions(): Array<{
    type: string;
    category: string;
    description: string;
    schema: any;
  }> {
    return Array.from(this.executors.values()).map(executor => ({
      type: executor.type,
      category: executor.category,
      description: executor.description,
      schema: executor.getParameterSchema()
    }));
  }
}
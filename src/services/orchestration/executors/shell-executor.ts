import { ExecutionContext, StepResult, ValidationResult, WorkflowStep } from '@/types/workflow';
import { spawn } from 'child_process';
import { StepExecutor } from './base-executor';

export class ShellExecutor extends StepExecutor {
  readonly type = 'shell';
  readonly category = 'System';
  readonly description = 'Execute shell commands and system operations';

  async execute(step: WorkflowStep, context: ExecutionContext): Promise<StepResult> {
    const { parameters } = step.action;
    const { command, args, cwd, env, timeout, shell } = parameters;

    try {
      const result = await this.executeCommand(command, args, {
        cwd: cwd || process.cwd(),
        env: { ...process.env, ...env },
        timeout: timeout || 30000,
        shell: shell !== false,
      });

      return this.createSuccessResult({
        command,
        args,
        exitCode: result.code,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: result.duration,
      });
    } catch (error) {
      return this.createFailureResult(
        error instanceof Error ? error.message : 'Shell command failed'
      );
    }
  }

  async validate(step: WorkflowStep): Promise<ValidationResult> {
    return this.validateRequiredParameters(step.action.parameters, ['command']);
  }

  getParameterSchema(): any {
    return {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Command to execute',
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'Command arguments',
        },
        cwd: {
          type: 'string',
          description: 'Working directory',
        },
        env: {
          type: 'object',
          description: 'Environment variables',
        },
        timeout: {
          type: 'number',
          default: 30000,
          description: 'Timeout in milliseconds',
        },
        shell: {
          type: 'boolean',
          default: true,
          description: 'Use shell to execute command',
        },
      },
      required: ['command'],
    };
  }

  private async executeCommand(
    command: string,
    args: string[] = [],
    options: {
      cwd?: string;
      env?: Record<string, string>;
      timeout?: number;
      shell?: boolean;
    } = {}
  ): Promise<{
    stdout: string;
    stderr: string;
    code: number;
    duration: number;
  }> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
        },
        shell: options.shell,
      });

      let stdout = '';
      let stderr = '';
      let timeoutId: NodeJS.Timeout | undefined;

      if (options.timeout) {
        timeoutId = setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }, options.timeout);
      }

      child.stdout?.on('data', data => {
        stdout += data.toString();
      });

      child.stderr?.on('data', data => {
        stderr += data.toString();
      });

      child.on('close', code => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const duration = Date.now() - startTime;
        resolve({
          stdout,
          stderr,
          code: code || 0,
          duration,
        });
      });

      child.on('error', error => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(error);
      });
    });
  }
}


import { WorkflowStep, ExecutionContext, StepResult, ValidationResult } from '@/types/workflow';
import { StepExecutor } from './base-executor';
import { spawn } from 'child_process';

export class GitExecutor extends StepExecutor {
  readonly type = 'git';
  readonly category = 'Git Operations';
  readonly description = 'Git version control operations like commit, push, pull, and status';

  async execute(step: WorkflowStep, context: ExecutionContext): Promise<StepResult> {
    const { type: action, parameters } = step.action;
    
    try {
      switch (action) {
        case 'git.status':
          return await this.gitStatus(parameters);
        case 'git.commit':
          return await this.gitCommit(parameters);
        case 'git.push':
          return await this.gitPush(parameters);
        case 'git.pull':
          return await this.gitPull(parameters);
        case 'git.add':
          return await this.gitAdd(parameters);
        default:
          return this.createFailureResult(`Unknown git action: ${action}`);
      }
    } catch (error) {
      return this.createFailureResult(
        error instanceof Error ? this.formatError(error) : 'Git operation failed'
      );
    }
  }

  async validate(step: WorkflowStep): Promise<ValidationResult> {
    const { type: action, parameters } = step.action;
    
    switch (action) {
      case 'git.commit':
        return this.validateRequiredParameters(parameters, ['message']);
      case 'git.add':
        return this.validateRequiredParameters(parameters, ['files']);
      default:
        return { valid: true, errors: [], warnings: [] };
    }
  }

  getParameterSchema(): any {
    return {
      'git.status': {
        type: 'object',
        properties: {
          cwd: { type: 'string', description: 'Working directory (optional)' }
        }
      },
      'git.add': {
        type: 'object',
        properties: {
          files: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Files to add to staging' 
          },
          all: { type: 'boolean', default: false, description: 'Add all modified files' },
          cwd: { type: 'string', description: 'Working directory (optional)' }
        },
        required: ['files']
      },
      'git.commit': {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'Commit message' },
          addAll: { type: 'boolean', default: false, description: 'Add all files before commit' },
          cwd: { type: 'string', description: 'Working directory (optional)' }
        },
        required: ['message']
      },
      'git.push': {
        type: 'object',
        properties: {
          remote: { type: 'string', default: 'origin', description: 'Remote repository' },
          branch: { type: 'string', description: 'Branch to push (optional)' },
          cwd: { type: 'string', description: 'Working directory (optional)' }
        }
      },
      'git.pull': {
        type: 'object',
        properties: {
          remote: { type: 'string', default: 'origin', description: 'Remote repository' },
          branch: { type: 'string', description: 'Branch to pull (optional)' },
          cwd: { type: 'string', description: 'Working directory (optional)' }
        }
      }
    };
  }

  private async executeGitCommand(
    args: string[], 
    cwd: string = process.cwd()
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise((resolve, reject) => {
      const child = spawn('git', args, { cwd });
      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout, stderr, code: code || 0 });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async gitStatus(parameters: any): Promise<StepResult> {
    const { cwd } = parameters;
    
    try {
      const result = await this.executeGitCommand(['status', '--porcelain'], cwd);
      
      if (result.code !== 0) {
        return this.createFailureResult(`Git status failed: ${result.stderr}`);
      }

      const files = result.stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const status = line.substring(0, 2);
          const filename = line.substring(3);
          return { status, filename };
        });

      return this.createSuccessResult({
        files,
        clean: files.length === 0,
        output: result.stdout
      });
    } catch (error) {
      return this.createFailureResult(`Git status failed: ${this.formatError(error)}`);
    }
  }

  private async gitAdd(parameters: any): Promise<StepResult> {
    const { files, all, cwd } = parameters;
    
    try {
      const args = ['add'];
      
      if (all) {
        args.push('-A');
      } else {
        args.push(...files);
      }

      const result = await this.executeGitCommand(args, cwd);
      
      if (result.code !== 0) {
        return this.createFailureResult(`Git add failed: ${result.stderr}`);
      }

      return this.createSuccessResult({
        added: all ? 'all files' : files,
        output: result.stdout
      });
    } catch (error) {
      return this.createFailureResult(`Git add failed: ${this.formatError(error)}`);
    }
  }

  private async gitCommit(parameters: any): Promise<StepResult> {
    const { message, addAll, cwd } = parameters;
    
    try {
      // Add all files if requested
      if (addAll) {
        const addResult = await this.executeGitCommand(['add', '-A'], cwd);
        if (addResult.code !== 0) {
          return this.createFailureResult(`Git add failed: ${addResult.stderr}`);
        }
      }

      const result = await this.executeGitCommand(['commit', '-m', message], cwd);
      
      if (result.code !== 0) {
        return this.createFailureResult(`Git commit failed: ${result.stderr}`);
      }

      return this.createSuccessResult({
        message,
        hash: this.extractCommitHash(result.stdout),
        output: result.stdout
      });
    } catch (error) {
      return this.createFailureResult(`Git commit failed: ${this.formatError(error)}`);
    }
  }

  private async gitPush(parameters: any): Promise<StepResult> {
    const { remote = 'origin', branch, cwd } = parameters;
    
    try {
      const args = ['push', remote];
      if (branch) {
        args.push(branch);
      }

      const result = await this.executeGitCommand(args, cwd);
      
      if (result.code !== 0) {
        return this.createFailureResult(`Git push failed: ${result.stderr}`);
      }

      return this.createSuccessResult({
        remote,
        branch,
        output: result.stderr // Git push output goes to stderr
      });
    } catch (error) {
      return this.createFailureResult(`Git push failed: ${this.formatError(error)}`);
    }
  }

  private async gitPull(parameters: any): Promise<StepResult> {
    const { remote = 'origin', branch, cwd } = parameters;
    
    try {
      const args = ['pull', remote];
      if (branch) {
        args.push(branch);
      }

      const result = await this.executeGitCommand(args, cwd);
      
      if (result.code !== 0) {
        return this.createFailureResult(`Git pull failed: ${result.stderr}`);
      }

      return this.createSuccessResult({
        remote,
        branch,
        output: result.stdout
      });
    } catch (error) {
      return this.createFailureResult(`Git pull failed: ${this.formatError(error)}`);
    }
  }

  private extractCommitHash(output: string): string {
    // Extract commit hash from git commit output
    const match = output.match(/\[.*?\s([a-f0-9]+)\]/);
    return match ? match[1] : '';
  }
}
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { WorkflowStep, ExecutionContext, StepResult, ValidationResult } from '@/types/workflow';
import { StepExecutor } from './base-executor';

export class FileExecutor extends StepExecutor {
  readonly type = 'file';
  readonly category = 'File Operations';
  readonly description = 'File system operations like read, write, copy, move, and delete';

  async execute(step: WorkflowStep, context: ExecutionContext): Promise<StepResult> {
    const { type: action, parameters } = step.action;
    
    try {
      switch (action) {
        case 'file.read':
          return await this.readFile(parameters);
        case 'file.write':
          return await this.writeFile(parameters);
        case 'file.copy':
          return await this.copyFile(parameters);
        case 'file.move':
          return await this.moveFile(parameters);
        case 'file.delete':
          return await this.deleteFile(parameters);
        case 'file.exists':
          return await this.fileExists(parameters);
        case 'file.list':
          return await this.listFiles(parameters);
        case 'file.mkdir':
          return await this.createDirectory(parameters);
        default:
          return this.createFailureResult(`Unknown file action: ${action}`);
      }
    } catch (error) {
      return this.createFailureResult(
        error instanceof Error ? this.formatError(error) : 'File operation failed'
      );
    }
  }

  async validate(step: WorkflowStep): Promise<ValidationResult> {
    const { type: action, parameters } = step.action;
    
    switch (action) {
      case 'file.read':
      case 'file.delete':
      case 'file.exists':
        return this.validateRequiredParameters(parameters, ['path']);
      
      case 'file.write':
        return this.validateRequiredParameters(parameters, ['path', 'content']);
      
      case 'file.copy':
      case 'file.move':
        return this.validateRequiredParameters(parameters, ['source', 'destination']);
      
      case 'file.list':
        return this.validateRequiredParameters(parameters, ['directory']);
      
      case 'file.mkdir':
        return this.validateRequiredParameters(parameters, ['path']);
      
      default:
        return {
          valid: false,
          errors: [{
            field: 'action',
            message: `Unknown file action: ${action}`,
            code: 'UNKNOWN_ACTION'
          }],
          warnings: []
        };
    }
  }

  getParameterSchema(): any {
    return {
      'file.read': {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to read' },
          encoding: { type: 'string', default: 'utf8', description: 'File encoding' }
        },
        required: ['path']
      },
      'file.write': {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to write' },
          content: { type: 'string', description: 'Content to write' },
          encoding: { type: 'string', default: 'utf8', description: 'File encoding' },
          append: { type: 'boolean', default: false, description: 'Append to existing file' },
          createDirectories: { type: 'boolean', default: true, description: 'Create parent directories' }
        },
        required: ['path', 'content']
      },
      'file.copy': {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source file path' },
          destination: { type: 'string', description: 'Destination file path' },
          overwrite: { type: 'boolean', default: false, description: 'Overwrite existing file' }
        },
        required: ['source', 'destination']
      },
      'file.move': {
        type: 'object',
        properties: {
          source: { type: 'string', description: 'Source file path' },
          destination: { type: 'string', description: 'Destination file path' },
          overwrite: { type: 'boolean', default: false, description: 'Overwrite existing file' }
        },
        required: ['source', 'destination']
      },
      'file.delete': {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to delete' },
          recursive: { type: 'boolean', default: false, description: 'Delete directories recursively' }
        },
        required: ['path']
      },
      'file.exists': {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path to check' }
        },
        required: ['path']
      },
      'file.list': {
        type: 'object',
        properties: {
          directory: { type: 'string', description: 'Directory to list' },
          pattern: { type: 'string', description: 'Glob pattern to filter files' },
          recursive: { type: 'boolean', default: false, description: 'List files recursively' }
        },
        required: ['directory']
      },
      'file.mkdir': {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path to create' },
          recursive: { type: 'boolean', default: true, description: 'Create parent directories' }
        },
        required: ['path']
      }
    };
  }

  private async readFile(parameters: any): Promise<StepResult> {
    const { path, encoding = 'utf8' } = parameters;
    
    try {
      const content = await fs.readFile(path, encoding);
      const stats = await fs.stat(path);
      
      return this.createSuccessResult({
        content,
        path,
        size: stats.size,
        lastModified: stats.mtime,
        encoding
      });
    } catch (error) {
      return this.createFailureResult(`Failed to read file ${path}: ${error instanceof Error ? this.formatError(error) : String(error)}`);
    }
  }

  private async writeFile(parameters: any): Promise<StepResult> {
    const { 
      path, 
      content, 
      encoding = 'utf8', 
      append = false, 
      createDirectories = true 
    } = parameters;
    
    try {
      if (createDirectories) {
        const dir = dirname(path);
        await fs.mkdir(dir, { recursive: true });
      }
      
      if (append) {
        await fs.appendFile(path, content, encoding);
      } else {
        await fs.writeFile(path, content, encoding);
      }
      
      const stats = await fs.stat(path);
      
      return this.createSuccessResult({
        path,
        size: stats.size,
        lastModified: stats.mtime,
        operation: append ? 'append' : 'write'
      });
    } catch (error) {
      return this.createFailureResult(`Failed to write file ${path}: ${this.formatError(error)}`);
    }
  }

  private async copyFile(parameters: any): Promise<StepResult> {
    const { source, destination, overwrite = false } = parameters;
    
    try {
      // Check if destination exists and overwrite is false
      if (!overwrite) {
        try {
          await fs.access(destination);
          return this.createFailureResult(`Destination file exists and overwrite is false: ${destination}`);
        } catch {
          // File doesn't exist, continue with copy
        }
      }
      
      // Create destination directory if it doesn't exist
      const destDir = dirname(destination);
      await fs.mkdir(destDir, { recursive: true });
      
      await fs.copyFile(source, destination);
      
      const stats = await fs.stat(destination);
      
      return this.createSuccessResult({
        source,
        destination,
        size: stats.size,
        lastModified: stats.mtime
      });
    } catch (error) {
      return this.createFailureResult(`Failed to copy file from ${source} to ${destination}: ${this.formatError(error)}`);
    }
  }

  private async moveFile(parameters: any): Promise<StepResult> {
    const { source, destination, overwrite = false } = parameters;
    
    try {
      // Check if destination exists and overwrite is false
      if (!overwrite) {
        try {
          await fs.access(destination);
          return this.createFailureResult(`Destination file exists and overwrite is false: ${destination}`);
        } catch {
          // File doesn't exist, continue with move
        }
      }
      
      // Create destination directory if it doesn't exist
      const destDir = dirname(destination);
      await fs.mkdir(destDir, { recursive: true });
      
      await fs.rename(source, destination);
      
      const stats = await fs.stat(destination);
      
      return this.createSuccessResult({
        source,
        destination,
        size: stats.size,
        lastModified: stats.mtime
      });
    } catch (error) {
      return this.createFailureResult(`Failed to move file from ${source} to ${destination}: ${this.formatError(error)}`);
    }
  }

  private async deleteFile(parameters: any): Promise<StepResult> {
    const { path, recursive = false } = parameters;
    
    try {
      const stats = await fs.stat(path);
      
      if (stats.isDirectory()) {
        if (recursive) {
          await fs.rmdir(path, { recursive: true });
        } else {
          await fs.rmdir(path);
        }
      } else {
        await fs.unlink(path);
      }
      
      return this.createSuccessResult({
        path,
        type: stats.isDirectory() ? 'directory' : 'file',
        deleted: true
      });
    } catch (error) {
      return this.createFailureResult(`Failed to delete ${path}: ${this.formatError(error)}`);
    }
  }

  private async fileExists(parameters: any): Promise<StepResult> {
    const { path } = parameters;
    
    try {
      const stats = await fs.stat(path);
      
      return this.createSuccessResult({
        path,
        exists: true,
        type: stats.isDirectory() ? 'directory' : 'file',
        size: stats.size,
        lastModified: stats.mtime
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return this.createSuccessResult({
          path,
          exists: false
        });
      }
      
      return this.createFailureResult(`Failed to check if ${path} exists: ${this.formatError(error)}`);
    }
  }

  private async listFiles(parameters: any): Promise<StepResult> {
    const { directory, pattern, recursive = false } = parameters;
    
    try {
      const files = await this.listFilesRecursive(directory, pattern, recursive);
      
      return this.createSuccessResult({
        directory,
        files,
        count: files.length
      });
    } catch (error) {
      return this.createFailureResult(`Failed to list files in ${directory}: ${this.formatError(error)}`);
    }
  }

  private async listFilesRecursive(
    directory: string, 
    pattern?: string, 
    recursive = false
  ): Promise<Array<{ name: string; path: string; type: string; size: number; lastModified: Date }>> {
    const files: any[] = [];
    
    const entries = await fs.readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = `${directory}/${entry.name}`;
      
      if (entry.isDirectory()) {
        if (recursive) {
          const subFiles = await this.listFilesRecursive(fullPath, pattern, recursive);
          files.push(...subFiles);
        }
        
        if (!pattern || this.matchesPattern(entry.name, pattern)) {
          const stats = await fs.stat(fullPath);
          files.push({
            name: entry.name,
            path: fullPath,
            type: 'directory',
            size: 0,
            lastModified: stats.mtime
          });
        }
      } else {
        if (!pattern || this.matchesPattern(entry.name, pattern)) {
          const stats = await fs.stat(fullPath);
          files.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
            size: stats.size,
            lastModified: stats.mtime
          });
        }
      }
    }
    
    return files;
  }

  private matchesPattern(filename: string, pattern: string): boolean {
    // Simple glob pattern matching (could be enhanced with a proper glob library)
    const regex = new RegExp(
      pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.')
        .replace(/\./g, '\\.')
    );
    
    return regex.test(filename);
  }

  private async createDirectory(parameters: any): Promise<StepResult> {
    const { path, recursive = true } = parameters;
    
    try {
      await fs.mkdir(path, { recursive });
      
      const stats = await fs.stat(path);
      
      return this.createSuccessResult({
        path,
        created: true,
        lastModified: stats.mtime
      });
    } catch (error) {
      return this.createFailureResult(`Failed to create directory ${path}: ${this.formatError(error)}`);
    }
  }
}

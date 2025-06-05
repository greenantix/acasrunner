import { WorkflowStep, ExecutionContext, StepResult, ValidationResult } from '@/types/workflow';

export abstract class StepExecutor {
  abstract readonly type: string;
  abstract readonly category: string;
  abstract readonly description: string;

  abstract execute(step: WorkflowStep, context: ExecutionContext): Promise<StepResult>;
  abstract validate(step: WorkflowStep): Promise<ValidationResult>;
  abstract getParameterSchema(): any;

  protected createSuccessResult(output?: any): StepResult {
    return {
      success: true,
      output
    };
  }

  protected createFailureResult(error: string): StepResult {
    return {
      success: false,
      error
    };
  }

  protected formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  protected validateRequiredParameters(
    parameters: Record<string, any>,
    required: string[]
  ): ValidationResult {
    const errors: any[] = [];
    
    for (const param of required) {
      if (!(param in parameters) || parameters[param] === undefined || parameters[param] === null) {
        errors.push({
          field: param,
          message: `Required parameter '${param}' is missing`,
          code: 'MISSING_REQUIRED_PARAMETER'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  protected async timeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string = 'Operation timed out'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}
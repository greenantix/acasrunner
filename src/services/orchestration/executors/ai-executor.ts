import { WorkflowStep, ExecutionContext, StepResult, ValidationResult } from '@/types/workflow';
import { StepExecutor } from './base-executor';
import { providerManager } from '@/services/llm-providers/provider-manager';

export class AIExecutor extends StepExecutor {
  readonly type = 'ai';
  readonly category = 'AI Operations';
  readonly description = 'AI operations like analyze, generate, and process using various LLM providers';

  async execute(step: WorkflowStep, context: ExecutionContext): Promise<StepResult> {
    const { parameters } = step.action;
    const { provider, model, prompt, temperature, maxTokens, includeContext } = parameters;
    
    try {
      const aiProvider = providerManager.getProvider(provider);
      if (!aiProvider) {
        return this.createFailureResult(`AI provider not available: ${provider}`);
      }

      let enhancedPrompt = prompt;
      
      if (includeContext) {
        const contextData = await this.gatherContext(context);
        enhancedPrompt = `${prompt}\n\nContext:\n${contextData}`;
      }

      const response = await aiProvider.generateResponse({
        prompt: enhancedPrompt,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 1000
      });

      return this.createSuccessResult({
        response: response.content,
        tokens: response.usage?.totalTokens,
        model: response.model || model,
        provider
      });
    } catch (error) {
      return this.createFailureResult(
        error instanceof Error ? error.message : 'AI operation failed'
      );
    }
  }

  async validate(step: WorkflowStep): Promise<ValidationResult> {
    return this.validateRequiredParameters(step.action.parameters, ['provider', 'prompt']);
  }

  getParameterSchema(): any {
    return {
      type: 'object',
      properties: {
        provider: { 
          type: 'string', 
          enum: ['claude', 'openai', 'gemini'],
          description: 'AI provider to use' 
        },
        model: { 
          type: 'string', 
          description: 'Model to use (optional, uses default if not specified)' 
        },
        prompt: { 
          type: 'string', 
          description: 'Prompt to send to the AI' 
        },
        temperature: { 
          type: 'number', 
          minimum: 0, 
          maximum: 2, 
          default: 0.7,
          description: 'Creativity/randomness of the response' 
        },
        maxTokens: { 
          type: 'number', 
          minimum: 1, 
          maximum: 100000, 
          default: 1000,
          description: 'Maximum tokens in the response' 
        },
        includeContext: { 
          type: 'boolean', 
          default: true,
          description: 'Include workflow context in the prompt' 
        }
      },
      required: ['provider', 'prompt']
    };
  }

  private async gatherContext(context: ExecutionContext): Promise<string> {
    let contextData = '';
    
    // Add step results
    if (context.stepResults.size > 0) {
      contextData += 'Previous step results:\n';
      for (const [stepId, result] of context.stepResults) {
        contextData += `- ${stepId}: ${JSON.stringify(result).slice(0, 200)}...\n`;
      }
      contextData += '\n';
    }
    
    // Add variables
    if (context.variables.size > 0) {
      contextData += 'Workflow variables:\n';
      for (const [name, value] of context.variables) {
        contextData += `- ${name}: ${JSON.stringify(value)}\n`;
      }
      contextData += '\n';
    }
    
    // Add trigger information
    contextData += `Triggered by: ${context.triggeredBy.type}\n`;
    
    return contextData;
  }
}

import { WorkflowStep, ExecutionContext, StepResult, ValidationResult } from '@/types/workflow';
import { StepExecutor } from './base-executor';

export class NotificationExecutor extends StepExecutor {
  readonly type = 'notification';
  readonly category = 'Notifications';
  readonly description = 'Send notifications via chat, email, or external services';

  async execute(step: WorkflowStep, context: ExecutionContext): Promise<StepResult> {
    const { parameters } = step.action;
    const { type, target, message, title } = parameters;
    
    try {
      switch (type) {
        case 'chat':
          return await this.sendChatNotification(target, message, title);
        case 'console':
          return await this.sendConsoleNotification(message, title);
        default:
          return this.createFailureResult(`Unsupported notification type: ${type}`);
      }
    } catch (error) {
      return this.createFailureResult(
        error instanceof Error ? error.message : 'Notification failed'
      );
    }
  }

  async validate(step: WorkflowStep): Promise<ValidationResult> {
    return this.validateRequiredParameters(step.action.parameters, ['type', 'message']);
  }

  getParameterSchema(): any {
    return {
      type: 'object',
      properties: {
        type: { 
          type: 'string', 
          enum: ['chat', 'console'],
          description: 'Type of notification' 
        },
        target: { 
          type: 'string', 
          description: 'Target for notification (e.g., chat session ID)' 
        },
        message: { 
          type: 'string', 
          description: 'Notification message' 
        },
        title: { 
          type: 'string', 
          description: 'Notification title (optional)' 
        },
        urgent: { 
          type: 'boolean', 
          default: false,
          description: 'Mark as urgent notification' 
        }
      },
      required: ['type', 'message']
    };
  }

  private async sendChatNotification(target: string, message: string, title?: string): Promise<StepResult> {
    // This would integrate with the chat service
    // For now, simulate the notification
    console.log(`[CHAT NOTIFICATION] ${title ? `${title}: ` : ''}${message}`);
    
    return this.createSuccessResult({
      type: 'chat',
      target,
      message,
      title,
      sent: true,
      timestamp: new Date()
    });
  }

  private async sendConsoleNotification(message: string, title?: string): Promise<StepResult> {
    console.log(`[WORKFLOW NOTIFICATION] ${title ? `${title}: ` : ''}${message}`);
    
    return this.createSuccessResult({
      type: 'console',
      message,
      title,
      sent: true,
      timestamp: new Date()
    });
  }
}

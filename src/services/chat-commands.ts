import { ChatSession, ChatMessage, ChatCommand } from '@/types/chat';
import { chatService } from './chat-service';
import { exportService } from './export-service';
import { activityService } from './activity-service';

export class ChatCommandsService {
  private commands: Map<string, ChatCommand> = new Map();

  constructor() {
    this.initializeBuiltInCommands();
  }

  private initializeBuiltInCommands() {
    // Session management commands
    this.registerCommand({
      name: '/clear',
      description: 'Clear the current conversation',
      usage: '/clear',
      handler: async (session: ChatSession) => {
        await chatService.clearMessages(session.id);
        return 'Conversation cleared successfully.';
      }
    });

    this.registerCommand({
      name: '/branch',
      description: 'Create a new branch from this conversation',
      usage: '/branch [from_message_id]',
      handler: async (session: ChatSession, fromMessageId?: string) => {
        const newSession = await chatService.branchSession(session.id, fromMessageId);
        return `New branch created: ${newSession.name}`;
      }
    });

    this.registerCommand({
      name: '/duplicate',
      description: 'Duplicate this conversation',
      usage: '/duplicate',
      handler: async (session: ChatSession) => {
        const newSession = await chatService.duplicateSession(session.id);
        return `Conversation duplicated: ${newSession.name}`;
      }
    });

    // Export commands
    this.registerCommand({
      name: '/export',
      description: 'Export conversation to file',
      usage: '/export [format] - formats: markdown, json, html, plaintext',
      handler: async (session: ChatSession, format: string = 'markdown') => {
        const validFormats = ['markdown', 'json', 'html', 'plaintext'];
        if (!validFormats.includes(format)) {
          return `Invalid format. Available formats: ${validFormats.join(', ')}`;
        }

        try {
          let result: string;
          let filename: string;

          switch (format) {
            case 'markdown':
              result = await exportService.exportToMarkdown(session.id);
              filename = `${session.name}.md`;
              break;
            case 'json':
              result = await exportService.exportToJSON(session.id);
              filename = `${session.name}.json`;
              break;
            case 'html':
              result = await exportService.exportToHTML(session.id);
              filename = `${session.name}.html`;
              break;
            case 'plaintext':
              result = await exportService.exportToPlaintext(session.id);
              filename = `${session.name}.txt`;
              break;
            default:
              throw new Error('Unsupported format');
          }

          // In a browser environment, trigger download
          if (typeof window !== 'undefined') {
            const blob = new Blob([result], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
          }

          return `Conversation exported as ${filename} (${format} format)`;
        } catch (error) {
          return `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    });

    // Context commands
    this.registerCommand({
      name: '/context',
      description: 'Add recent activity context to conversation',
      usage: '/context [timeframe] - timeframe: 1h, 30m, 1d',
      handler: async (session: ChatSession, timeframe: string = '1h') => {
        try {
          const activities = await this.getRecentActivities(timeframe);
          if (activities.length === 0) {
            return 'No recent activities found.';
          }

          let contextMessage = `Recent activities (${timeframe}):\n\n`;
          activities.forEach((activity, index) => {
            contextMessage += `${index + 1}. [${activity.type}] ${activity.description}\n`;
            contextMessage += `   Time: ${activity.timestamp.toLocaleString()}\n`;
            if (activity.component) {
              contextMessage += `   Component: ${activity.component}\n`;
            }
            contextMessage += '\n';
          });

          return contextMessage;
        } catch (error) {
          return `Failed to retrieve activities: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    });

    this.registerCommand({
      name: '/files',
      description: 'Include file contents in context',
      usage: '/files [pattern] - pattern: src/**/*.ts, *.md, etc.',
      handler: async (session: ChatSession, pattern: string = '**/*') => {
        try {
          const files = await this.findFiles(pattern);
          if (files.length === 0) {
            return `No files found matching pattern: ${pattern}`;
          }

          let contextMessage = `Files matching "${pattern}":\n\n`;
          files.forEach((file, index) => {
            contextMessage += `${index + 1}. ${file.path}\n`;
            contextMessage += `   Size: ${file.size} bytes\n`;
            contextMessage += `   Modified: ${file.lastModified.toLocaleString()}\n\n`;
          });

          if (files.length > 10) {
            contextMessage += `... and ${files.length - 10} more files`;
          }

          return contextMessage;
        } catch (error) {
          return `Failed to retrieve files: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    });

    // Search commands
    this.registerCommand({
      name: '/search',
      description: 'Search through conversation history',
      usage: '/search [query]',
      handler: async (session: ChatSession, ...queryParts: string[]) => {
        const query = queryParts.join(' ');
        if (!query) {
          return 'Please provide a search query.';
        }

        try {
          const messages = await chatService.searchMessages(query, session.id);
          if (messages.length === 0) {
            return `No messages found containing: "${query}"`;
          }

          let resultMessage = `Found ${messages.length} message(s) containing "${query}":\n\n`;
          messages.slice(0, 5).forEach((message, index) => {
            const preview = message.content.length > 100 
              ? message.content.substring(0, 100) + '...'
              : message.content;
            resultMessage += `${index + 1}. [${message.role}] ${preview}\n`;
            resultMessage += `   Time: ${message.timestamp.toLocaleString()}\n\n`;
          });

          if (messages.length > 5) {
            resultMessage += `... and ${messages.length - 5} more results`;
          }

          return resultMessage;
        } catch (error) {
          return `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    });

    // Session management
    this.registerCommand({
      name: '/new',
      description: 'Create a new session',
      usage: '/new [provider] [model] - provider: claude, openai, gemini',
      handler: async (session: ChatSession, provider: string = 'claude', model?: string) => {
        const defaultModels = {
          claude: 'claude-3-5-sonnet-20241022',
          openai: 'gpt-4',
          gemini: 'gemini-pro'
        };

        const selectedModel = model || defaultModels[provider as keyof typeof defaultModels] || defaultModels.claude;
        
        try {
          const newSession = await chatService.createSession(provider, selectedModel);
          return `New ${provider} session created: ${newSession.name}`;
        } catch (error) {
          return `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    });

    // Settings commands
    this.registerCommand({
      name: '/settings',
      description: 'View or update session settings',
      usage: '/settings [key] [value] - key: temperature, maxTokens, autoContext',
      handler: async (session: ChatSession, key?: string, value?: string) => {
        if (!key) {
          // Show current settings
          return `Current settings:
Temperature: ${session.settings.temperature}
Max Tokens: ${session.settings.maxTokens}
Auto Context: ${session.settings.autoContext}
Context Window: ${session.settings.contextWindow}
System Prompt: ${session.settings.systemPrompt || 'None'}`;
        }

        if (!value) {
          return `Current ${key}: ${(session.settings as any)[key] ?? 'Not set'}`;
        }

        try {
          const updates: any = {};
          const settings = { ...session.settings };

          switch (key) {
            case 'temperature':
              const temp = parseFloat(value);
              if (isNaN(temp) || temp < 0 || temp > 2) {
                return 'Temperature must be a number between 0 and 2';
              }
              settings.temperature = temp;
              break;

            case 'maxTokens':
              const tokens = parseInt(value);
              if (isNaN(tokens) || tokens < 1 || tokens > 100000) {
                return 'Max tokens must be a number between 1 and 100000';
              }
              settings.maxTokens = tokens;
              break;

            case 'autoContext':
              const autoContext = value.toLowerCase() === 'true' || value === '1';
              settings.autoContext = autoContext;
              break;

            case 'contextWindow':
              const window = parseInt(value);
              if (isNaN(window) || window < 1 || window > 100) {
                return 'Context window must be a number between 1 and 100';
              }
              settings.contextWindow = window;
              break;

            case 'systemPrompt':
              settings.systemPrompt = value;
              break;

            default:
              return `Unknown setting: ${key}. Available: temperature, maxTokens, autoContext, contextWindow, systemPrompt`;
          }

          await chatService.updateSession(session.id, { settings });
          return `Updated ${key} to: ${value}`;
        } catch (error) {
          return `Failed to update setting: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    });

    // Help command
    this.registerCommand({
      name: '/help',
      description: 'Show available commands',
      usage: '/help [command]',
      handler: async (session: ChatSession, commandName?: string) => {
        if (commandName) {
          const command = this.commands.get(commandName);
          if (!command) {
            return `Command not found: ${commandName}`;
          }
          return `${command.name} - ${command.description}\nUsage: ${command.usage}`;
        }

        let helpMessage = 'Available commands:\n\n';
        for (const [name, command] of this.commands) {
          helpMessage += `${name} - ${command.description}\n`;
        }
        helpMessage += '\nType /help [command] for detailed usage information.';
        
        return helpMessage;
      }
    });
  }

  registerCommand(command: ChatCommand) {
    this.commands.set(command.name, command);
  }

  unregisterCommand(name: string): boolean {
    return this.commands.delete(name);
  }

  getCommand(name: string): ChatCommand | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): ChatCommand[] {
    return Array.from(this.commands.values());
  }

  async executeCommand(session: ChatSession, input: string): Promise<string> {
    const parts = input.trim().split(/\s+/);
    const commandName = parts[0];
    const args = parts.slice(1);

    const command = this.commands.get(commandName);
    if (!command) {
      return `Unknown command: ${commandName}. Type /help for available commands.`;
    }

    try {
      const result = await command.handler(session, ...args);
      return typeof result === 'string' ? result : 'Command executed successfully.';
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
      return `Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  isCommand(input: string): boolean {
    return input.trim().startsWith('/');
  }

  getCommandSuggestions(query: string): ChatCommand[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.commands.values()).filter(command =>
      command.name.toLowerCase().includes(searchTerm) ||
      command.description.toLowerCase().includes(searchTerm)
    );
  }

  // Helper methods
  private async getRecentActivities(timeframe: string): Promise<any[]> {
    try {
      // Parse timeframe
      const now = new Date();
      let since = new Date();
      
      if (timeframe.endsWith('h')) {
        const hours = parseInt(timeframe);
        since.setHours(now.getHours() - hours);
      } else if (timeframe.endsWith('m')) {
        const minutes = parseInt(timeframe);
        since.setMinutes(now.getMinutes() - minutes);
      } else if (timeframe.endsWith('d')) {
        const days = parseInt(timeframe);
        since.setDate(now.getDate() - days);
      } else {
        // Default to 1 hour
        since.setHours(now.getHours() - 1);
      }

      // This would integrate with the activity service
      // For now, return mock data
      return [
        {
          id: '1',
          type: 'file_change',
          description: 'Modified src/components/chat/chat-input.tsx',
          timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          component: 'chat-input',
          severity: 'info'
        },
        {
          id: '2',
          type: 'error',
          description: 'TypeScript error in chat-service.ts',
          timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
          component: 'chat-service',
          severity: 'error'
        }
      ];
    } catch (error) {
      throw new Error(`Failed to get activities: ${error}`);
    }
  }

  private async findFiles(pattern: string): Promise<any[]> {
    try {
      // This would integrate with file system monitoring
      // For now, return mock data
      return [
        {
          path: 'src/services/chat-service.ts',
          size: 15420,
          lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          path: 'src/components/chat/chat-input.tsx',
          size: 8930,
          lastModified: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
        }
      ];
    } catch (error) {
      throw new Error(`Failed to find files: ${error}`);
    }
  }
}

// Export singleton instance
export const chatCommands = new ChatCommandsService();
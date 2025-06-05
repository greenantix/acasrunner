import { ChatSession, ChatMessage, ChatContextItem } from '@/types/chat';
import { providerManager } from './llm-providers/provider-manager';
import { chatService } from './chat-service';
import { activityService } from './activity-service';

export class ChatAIIntegration {
  private readonly MAX_CONTEXT_TOKENS = 8000;
  private readonly ACTIVITY_CONTEXT_LIMIT = 10;

  async sendMessageWithAI(
    sessionId: string,
    userMessage: string,
    attachments?: any[]
  ): Promise<ChatMessage> {
    try {
      // Get session and validate
      const session = await chatService.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Send user message first
      const userMsg = await chatService.sendMessage(
        sessionId,
        userMessage,
        'user',
        attachments
      );

      // Build context for AI
      const context = await this.buildMessageContext(session, userMessage);
      
      // Get conversation history
      const messages = await chatService.getMessages(sessionId);
      const conversationHistory = this.formatMessagesForAI(messages, session.settings.contextWindow);

      // Prepare prompt
      const prompt = this.buildPrompt(session, userMessage, context, conversationHistory);

      // Get AI response
      const aiResponse = await this.getAIResponse(session, prompt);

      // Save AI response
      const aiMessage = await chatService.sendMessage(
        sessionId,
        aiResponse.content,
        'assistant',
        undefined
      );

      // Update session metadata with token usage
      if (aiResponse.tokens) {
        await this.updateSessionTokens(session, aiResponse.tokens);
      }

      return aiMessage;
    } catch (error) {
      console.error('Error in AI integration:', error);
      throw error;
    }
  }

  async streamMessageWithAI(
    sessionId: string,
    userMessage: string,
    onChunk: (chunk: string) => void,
    onComplete: (fullResponse: string) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const session = await chatService.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Send user message
      await chatService.sendMessage(sessionId, userMessage, 'user');

      // Build context
      const context = await this.buildMessageContext(session, userMessage);
      const messages = await chatService.getMessages(sessionId);
      const conversationHistory = this.formatMessagesForAI(messages, session.settings.contextWindow);
      const prompt = this.buildPrompt(session, userMessage, context, conversationHistory);

      // Stream AI response
      let fullResponse = '';
      await this.streamAIResponse(
        session,
        prompt,
        (chunk) => {
          fullResponse += chunk;
          onChunk(chunk);
        },
        async () => {
          // Save complete AI response
          await chatService.sendMessage(sessionId, fullResponse, 'assistant');
          onComplete(fullResponse);
        },
        onError
      );
    } catch (error) {
      console.error('Error in streaming AI integration:', error);
      onError(error as Error);
    }
  }

  private async buildMessageContext(
    session: ChatSession,
    userMessage: string
  ): Promise<ChatContextItem[]> {
    const context: ChatContextItem[] = [];

    // Skip context if auto-context is disabled
    if (!session.settings.autoContext) {
      return context;
    }

    try {
      // Add recent activity events
      const recentActivities = await activityService.getRecentActivities(
        this.ACTIVITY_CONTEXT_LIMIT
      );

      for (const activity of recentActivities) {
        // Only include relevant activities
        if (this.isActivityRelevant(activity, userMessage)) {
          context.push({
            type: 'activity',
            id: activity.id,
            title: activity.type,
            content: activity.description,
            timestamp: activity.timestamp,
            metadata: {
              type: activity.type,
              severity: activity.severity,
              component: activity.component
            }
          });
        }
      }

      // Add file context if mentioned in message
      const mentionedFiles = this.extractFileReferences(userMessage);
      for (const filePath of mentionedFiles) {
        try {
          const fileContent = await this.getFileContent(filePath);
          context.push({
            type: 'file',
            id: filePath,
            title: filePath,
            content: fileContent,
            timestamp: new Date(),
            metadata: {
              path: filePath,
              size: fileContent.length
            }
          });
        } catch (error) {
          console.warn(`Could not load file ${filePath}:`, error);
        }
      }

      // Add escalation context if available
      const recentEscalations = await this.getRecentEscalations();
      for (const escalation of recentEscalations) {
        context.push({
          type: 'escalation',
          id: escalation.id,
          title: 'AI Escalation',
          content: escalation.analysis,
          timestamp: escalation.timestamp,
          metadata: {
            trigger: escalation.trigger,
            confidence: escalation.confidence
          }
        });
      }
    } catch (error) {
      console.warn('Error building message context:', error);
    }

    return context;
  }

  private formatMessagesForAI(messages: ChatMessage[], contextWindow: number): string {
    // Get recent messages within context window
    const recentMessages = messages.slice(-contextWindow);
    
    return recentMessages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');
  }

  private buildPrompt(
    session: ChatSession,
    userMessage: string,
    context: ChatContextItem[],
    conversationHistory: string
  ): string {
    let prompt = '';

    // Add system prompt if available
    if (session.settings.systemPrompt) {
      prompt += `SYSTEM: ${session.settings.systemPrompt}\n\n`;
    }

    // Add context
    if (context.length > 0) {
      prompt += 'CONTEXT:\n';
      for (const item of context) {
        prompt += `[${item.type.toUpperCase()}] ${item.title}\n${item.content}\n\n`;
      }
      prompt += '---\n\n';
    }

    // Add conversation history
    if (conversationHistory) {
      prompt += 'CONVERSATION HISTORY:\n';
      prompt += conversationHistory;
      prompt += '\n\n---\n\n';
    }

    // Add current user message
    prompt += `USER: ${userMessage}`;

    return prompt;
  }

  private async getAIResponse(session: ChatSession, prompt: string): Promise<{
    content: string;
    tokens?: number;
  }> {
    const provider = providerManager.getProvider(session.provider);
    if (!provider) {
      throw new Error(`Provider ${session.provider} not available`);
    }

    const response = await provider.generateResponse(prompt, {
      model: session.model,
      temperature: session.settings.temperature,
      maxTokens: session.settings.maxTokens
    });

    return {
      content: response.text,
      tokens: response.usage?.totalTokens
    };
  }

  private async streamAIResponse(
    session: ChatSession,
    prompt: string,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const provider = providerManager.getProvider(session.provider);
    if (!provider) {
      throw new Error(`Provider ${session.provider} not available`);
    }

    try {
      await provider.streamResponse(prompt, {
        model: session.model,
        temperature: session.settings.temperature,
        maxTokens: session.settings.maxTokens
      }, {
        onChunk,
        onComplete,
        onError
      });
    } catch (error) {
      onError(error as Error);
    }
  }

  private async updateSessionTokens(session: ChatSession, tokens: number): Promise<void> {
    const currentTokens = session.metadata.totalTokens || 0;
    await chatService.updateSession(session.id, {
      metadata: {
        ...session.metadata,
        totalTokens: currentTokens + tokens
      }
    });
  }

  private isActivityRelevant(activity: any, userMessage: string): boolean {
    // Simple relevance check - could be enhanced with ML
    const keywords = userMessage.toLowerCase().split(/\s+/);
    const activityText = `${activity.type} ${activity.description} ${activity.component}`.toLowerCase();
    
    return keywords.some(keyword => 
      keyword.length > 3 && activityText.includes(keyword)
    );
  }

  private extractFileReferences(message: string): string[] {
    // Extract file paths from message
    const filePathRegex = /(?:src\/|\.\/|\/)[^\s]+\.[a-zA-Z]{1,4}/g;
    const matches = message.match(filePathRegex) || [];
    
    // Also look for quoted file paths
    const quotedRegex = /["`']([^"`']+\.[a-zA-Z]{1,4})["`']/g;
    let quotedMatch;
    while ((quotedMatch = quotedRegex.exec(message)) !== null) {
      matches.push(quotedMatch[1]);
    }
    
    return [...new Set(matches)]; // Remove duplicates
  }

  private async getFileContent(filePath: string): Promise<string> {
    // This would integrate with file system monitoring
    // For now, return a placeholder
    try {
      // In a real implementation, you'd read from the file system
      // or from a cache maintained by the file monitor
      const fs = require('fs').promises;
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Limit file content size
      const maxSize = 10000; // 10KB
      if (content.length > maxSize) {
        return content.slice(0, maxSize) + '\n\n... [truncated]';
      }
      
      return content;
    } catch (error) {
      throw new Error(`Could not read file: ${filePath}`);
    }
  }

  private async getRecentEscalations(): Promise<any[]> {
    // This would integrate with the escalation system
    // For now, return empty array
    try {
      // In a real implementation, get recent escalations from escalation service
      return [];
    } catch (error) {
      console.warn('Could not fetch recent escalations:', error);
      return [];
    }
  }

  // Utility method to check if AI integration is available
  static isAvailable(session: ChatSession): boolean {
    return providerManager.hasProvider(session.provider);
  }

  // Method to get available models for a provider
  static async getAvailableModels(provider: string): Promise<string[]> {
    const providerInstance = providerManager.getProvider(provider);
    if (!providerInstance) {
      return [];
    }
    
    return providerInstance.getAvailableModels();
  }

  // Method to estimate token usage
  static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}

// Export singleton instance
export const chatAIIntegration = new ChatAIIntegration();
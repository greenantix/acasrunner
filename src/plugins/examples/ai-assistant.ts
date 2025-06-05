import { Plugin, PluginAPI } from '@/types/plugin';

const AIAssistantPlugin: Plugin = {
  name: 'AI Code Assistant',
  id: 'ai-assistant',
  version: '1.0.0',
  author: 'ACAS Team',
  description: 'Provides AI-powered code suggestions and error analysis',
  icon: '🤖',

  async initialize(api: PluginAPI) {
    console.log('AI Assistant Plugin initialized');
    
    // Subscribe to error activities
    await api.subscribeToActivities(async (event) => {
      if (event.type === 'error' && event.data.severity === 'high') {
        // Automatically request AI assistance for high-severity errors
        try {
          const suggestion = await api.requestAIAssistance(
            `Analyze this error and suggest a fix: ${event.data.message}`,
            { 
              error: event.data,
              timestamp: event.timestamp,
              context: 'automatic_analysis'
            }
          );
          
          api.showNotification(
            `AI Suggestion: ${suggestion.substring(0, 100)}...`,
            'info'
          );
          
          // Store the suggestion
          await api.setData(`suggestion_${event.timestamp}`, {
            error: event.data,
            suggestion,
            timestamp: new Date().toISOString()
          }, 'ai-assistant');
          
        } catch (error) {
          console.error('AI Assistant failed to analyze error:', error);
        }
      }
    });

    // Register UI extension for code suggestions
    await api.registerUIExtension('sidebar', {
      name: 'AI Suggestions',
      component: () => ({
        render: () => `
          <div>
            <h3>AI Code Assistant</h3>
            <button onclick="requestSuggestion()">Get Code Suggestion</button>
            <div id="ai-suggestions"></div>
          </div>
        `
      })
    }, 'ai-assistant');

    api.showNotification('AI Assistant plugin activated', 'success');
  },

  async destroy() {
    console.log('AI Assistant Plugin destroyed');
  },

  // Plugin-specific methods
  async getSuggestion(api: PluginAPI, code: string, context: string) {
    const prompt = `Analyze this code and provide suggestions for improvement:\n\n${code}\n\nContext: ${context}`;
    return await api.requestAIAssistance(prompt, { code, context });
  },

  async escalateComplexIssue(api: PluginAPI, issue: string, context: any) {
    await api.escalateIssue(
      `Complex coding issue requiring human attention: ${issue}`,
      'high',
      { ...context, escalatedBy: 'ai-assistant-plugin' }
    );
  }
};

export default AIAssistantPlugin;
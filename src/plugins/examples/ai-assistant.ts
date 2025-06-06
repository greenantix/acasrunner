import { Plugin, PluginAPI } from '@/types/plugin';

const AIAssistantPlugin: Plugin = {
  name: 'AI Code Assistant',
  id: 'ai-assistant',
  version: '1.0.0',
  author: 'leo Team',
  description: 'Provides AI-powered code suggestions and error analysis',
  icon: '🤖',
  permissions: [
    {
      type: 'ai_access',
      description: 'Access AI services for code analysis'
    },
    {
      type: 'storage',
      description: 'Store AI suggestions and analysis'
    },
    {
      type: 'ui',
      description: 'Display AI suggestions in the UI'
    }
  ],

  async onLoad(api: PluginAPI) {
    console.log('AI Assistant Plugin loaded');
    api.log.info('AI Assistant plugin initialized');
  },

  async onEnable(api: PluginAPI) {
    console.log('AI Assistant Plugin enabled');
    
    // Subscribe to activity events, particularly errors
    const unsubscribe = api.activity.subscribe(async (event) => {
      if (event.type === 'error') {
        // Automatically analyze high-severity errors
        try {
          api.log.info(`AI Assistant analyzing error: ${event.message}`);
          
          // For now, just log the error - in a real implementation,
          // this would call your AI service
          const suggestion = `Consider checking: ${event.message}`;
          
          api.ui.showNotification(
            `AI Suggestion: ${suggestion.substring(0, 100)}...`,
            'info'
          );
          
          // Store the suggestion
          await api.storage.set(`suggestion_${Date.now()}`, {
            error: event,
            suggestion,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          api.log.error('AI Assistant failed to analyze error:', error);
        }
      }
    });

    // Store unsubscribe function for cleanup
    api.storage.set('_unsubscribe', unsubscribe);

    api.ui.showNotification('AI Assistant plugin activated', 'success');
  },

  async onDisable(api: PluginAPI) {
    console.log('AI Assistant Plugin disabled');
    
    // Clean up subscription
    const unsubscribe = await api.storage.get('_unsubscribe');
    if (unsubscribe && typeof unsubscribe === 'function') {
      unsubscribe();
    }
    
    api.ui.showNotification('AI Assistant plugin deactivated', 'info');
  },

  async onUnload(api: PluginAPI) {
    console.log('AI Assistant Plugin unloaded');
    api.log.info('AI Assistant plugin destroyed');
  },

  // Plugin commands
  commands: [
    {
      id: 'get-ai-suggestion',
      name: 'Get AI Code Suggestion',
      description: 'Get AI-powered code suggestions',
      handler: async (args, api) => {
        const code = args[0] || 'No code provided';
        const context = args[1] || 'General code review';
        
        // In a real implementation, this would call your AI service
        const suggestion = `AI suggests improving: ${code.substring(0, 50)}...`;
        
        api.log.info('AI suggestion generated', { code: code.length, suggestion });
        api.ui.showNotification('AI suggestion ready', 'success');
        
        return {
          suggestion,
          confidence: 0.85,
          timestamp: new Date().toISOString()
        };
      },
      parameters: [
        {
          name: 'code',
          type: 'string',
          description: 'Code to analyze',
          required: true
        },
        {
          name: 'context',
          type: 'string',
          description: 'Context for the analysis',
          required: false
        }
      ]
    }
  ]
};

export default AIAssistantPlugin;


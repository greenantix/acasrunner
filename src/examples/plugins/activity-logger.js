// Example Activity Logger Plugin
export default {
  id: 'activity-logger',
  name: 'Activity Logger',
  version: '1.0.0',
  author: 'leo System',
  description: 'Logs all activity events with timestamps and provides activity analysis',
  icon: '📝',
  permissions: [
    {
      type: 'storage',
      description: 'Store activity logs locally'
    },
    {
      type: 'ui',
      description: 'Display activity notifications'
    }
  ],

  async onLoad(api) {
    api.log.info('Activity Logger plugin loaded');
    
    // Initialize storage
    const existingLogs = await api.storage.get('activity_logs') || [];
    api.log.info(`Found ${existingLogs.length} existing activity logs`);
  },

  async onEnable(api) {
    api.log.info('Activity Logger plugin enabled');
    
    // Subscribe to activity events
    this.unsubscribe = api.activity.subscribe(async (event) => {
      await this.logActivity(event, api);
    });

    // Show notification
    api.ui.showNotification('Activity Logger enabled', 'success');
  },

  async onDisable(api) {
    api.log.info('Activity Logger plugin disabled');
    
    // Unsubscribe from events
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    api.ui.showNotification('Activity Logger disabled', 'info');
  },

  async onUnload(api) {
    api.log.info('Activity Logger plugin unloaded');
  },

  async onActivity(event, api) {
    // This is called for all activity events
    await this.logActivity(event, api);
  },

  async logActivity(event, api) {
    try {
      // Get existing logs
      const existingLogs = await api.storage.get('activity_logs') || [];
      
      // Create log entry
      const logEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        pluginVersion: this.version,
        event: {
          id: event.id,
          type: event.type,
          source: event.source,
          message: event.message,
          timestamp: event.timestamp
        },
        analysis: {
          severity: this.analyzeSeverity(event),
          category: this.categorizeEvent(event),
          keywords: this.extractKeywords(event.message)
        }
      };

      // Add to logs (keep last 1000 entries)
      existingLogs.unshift(logEntry);
      if (existingLogs.length > 1000) {
        existingLogs.splice(1000);
      }

      // Save logs
      await api.storage.set('activity_logs', existingLogs);

      // Show notification for important events
      if (logEntry.analysis.severity === 'high' || logEntry.analysis.severity === 'critical') {
        api.ui.showNotification(
          `High severity activity detected: ${event.message}`,
          'warning'
        );
      }

      api.log.debug('Activity logged successfully', { eventId: event.id });
      
    } catch (error) {
      api.log.error('Failed to log activity', { error: error.message, eventId: event.id });
    }
  },

  analyzeSeverity(event) {
    if (event.type === 'error') {
      if (event.message.toLowerCase().includes('critical') || 
          event.message.toLowerCase().includes('fatal')) {
        return 'critical';
      }
      return 'high';
    }
    
    if (event.type === 'warning') {
      return 'medium';
    }
    
    return 'low';
  },

  categorizeEvent(event) {
    const message = event.message.toLowerCase();
    
    if (message.includes('file') || message.includes('save') || message.includes('load')) {
      return 'File Operations';
    }
    
    if (message.includes('error') || message.includes('exception') || message.includes('fail')) {
      return 'Errors';
    }
    
    if (message.includes('user') || message.includes('click') || message.includes('action')) {
      return 'User Actions';
    }
    
    if (message.includes('system') || message.includes('start') || message.includes('stop')) {
      return 'System Events';
    }
    
    return 'General';
  },

  extractKeywords(message) {
    // Simple keyword extraction
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been'].includes(word));
    
    // Return unique keywords, max 5
    return [...new Set(words)].slice(0, 5);
  },

  // Plugin commands
  commands: [
    {
      id: 'show-activity-stats',
      name: 'Show Activity Statistics',
      description: 'Display statistics about logged activities',
      handler: async (args, api) => {
        try {
          const logs = await api.storage.get('activity_logs') || [];
          
          const stats = {
            total: logs.length,
            byType: {},
            bySeverity: {},
            byCategory: {},
            recent: logs.slice(0, 10)
          };

          logs.forEach(log => {
            const type = log.event.type;
            const severity = log.analysis.severity;
            const category = log.analysis.category;

            stats.byType[type] = (stats.byType[type] || 0) + 1;
            stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
            stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
          });

          api.log.info('Activity Statistics:', stats);
          api.ui.showNotification(`Activity stats: ${stats.total} total events logged`, 'info');
          
          return stats;
        } catch (error) {
          api.log.error('Failed to get activity stats', error);
          throw error;
        }
      }
    },
    {
      id: 'clear-activity-logs',
      name: 'Clear Activity Logs',
      description: 'Clear all stored activity logs',
      handler: async (args, api) => {
        try {
          await api.storage.set('activity_logs', []);
          api.log.info('Activity logs cleared');
          api.ui.showNotification('Activity logs cleared', 'success');
          return { cleared: true };
        } catch (error) {
          api.log.error('Failed to clear activity logs', error);
          throw error;
        }
      }
    }
  ],

  // Plugin configuration schema
  configSchema: {
    type: 'object',
    properties: {
      maxLogs: {
        type: 'number',
        default: 1000,
        minimum: 100,
        maximum: 10000,
        description: 'Maximum number of logs to keep in storage'
      },
      notifyOnHighSeverity: {
        type: 'boolean',
        default: true,
        description: 'Show notifications for high severity events'
      },
      logAnalysisEnabled: {
        type: 'boolean',
        default: true,
        description: 'Enable automatic analysis of logged events'
      }
    }
  },

  defaultConfig: {
    maxLogs: 1000,
    notifyOnHighSeverity: true,
    logAnalysisEnabled: true
  }
};


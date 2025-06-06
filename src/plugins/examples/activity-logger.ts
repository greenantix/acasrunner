import { Plugin, PluginAPI } from '@/types/plugin';

const ActivityLoggerPlugin: Plugin = {
  name: 'Activity Logger',
  id: 'activity-logger',
  version: '1.0.0',
  author: 'leo Team',
  description: 'Logs all activity events to console with timestamps',
  icon: '📝',
  permissions: [
    {
      type: 'storage',
      description: 'Store activity logs'
    },
    {
      type: 'ui',
      description: 'Display activity notifications'
    }
  ],

  async onLoad(api: PluginAPI) {
    console.log('Activity Logger Plugin loaded');
    api.log.info('Activity Logger plugin initialized');
  },

  async onEnable(api: PluginAPI) {
    console.log('Activity Logger Plugin enabled');
    
    // Subscribe to activity events using the correct API
    const unsubscribe = api.activity.subscribe((event) => {
      const timestamp = new Date().toISOString();
      api.log.info(`Activity logged: ${event.type}`, {
        type: event.type,
        source: event.source,
        message: event.message,
        timestamp: event.timestamp
      });
      
      // Store activity in plugin storage
      api.storage.set(`activity_${Date.now()}`, {
        ...event,
        loggedAt: timestamp
      }).catch(error => {
        api.log.error('Failed to store activity', error);
      });
    });

    // Store the unsubscribe function for cleanup
    api.storage.set('_unsubscribe', unsubscribe);

    api.ui.showNotification('Activity Logger plugin activated', 'success');
  },

  async onDisable(api: PluginAPI) {
    console.log('Activity Logger Plugin disabled');
    
    // Clean up subscription
    const unsubscribe = await api.storage.get('_unsubscribe');
    if (unsubscribe && typeof unsubscribe === 'function') {
      unsubscribe();
    }
    
    api.ui.showNotification('Activity Logger plugin deactivated', 'info');
  },

  async onUnload(api: PluginAPI) {
    console.log('Activity Logger Plugin unloaded');
    api.log.info('Activity Logger plugin destroyed');
  },

  // Plugin commands
  commands: [
    {
      id: 'get-activity-summary',
      name: 'Get Activity Summary',
      description: 'Get a summary of recent activities',
      handler: async (args, api) => {
        const activities = [];
        
        // Get recent activities (last 50)
        for (let i = 0; i < 50; i++) {
          const key = `activity_${Date.now() - i * 1000}`;
          try {
            const activity = await api.storage.get(key);
            if (activity) {
              activities.push(activity);
            }
          } catch (error) {
            // Key doesn't exist, skip
          }
        }
        
        api.log.info(`Found ${activities.length} recent activities`);
        return {
          totalActivities: activities.length,
          activities: activities.slice(0, 10), // Return last 10
          summary: `Logged ${activities.length} activities`
        };
      }
    }
  ]
};

export default ActivityLoggerPlugin;


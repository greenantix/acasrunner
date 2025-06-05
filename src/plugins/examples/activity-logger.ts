import { Plugin, PluginAPI } from '@/types/plugin';

const ActivityLoggerPlugin: Plugin = {
  name: 'Activity Logger',
  id: 'activity-logger',
  version: '1.0.0',
  author: 'ACAS Team',
  description: 'Logs all activity events to console with timestamps',
  icon: '📝',

  async initialize(api: PluginAPI) {
    console.log('Activity Logger Plugin initialized');
    
    // Subscribe to all activity events
    await api.subscribeToActivities((event) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] Activity:`, {
        type: event.type,
        data: event.data,
        timestamp: event.timestamp
      });
      
      // Store activity in plugin storage
      api.setData(`activity_${Date.now()}`, {
        ...event,
        loggedAt: timestamp
      }, 'activity-logger');
    });

    // Register a UI extension for the dashboard
    await api.registerUIExtension('dashboard', {
      name: 'Activity Summary',
      component: () => ({
        render: () => '<div>Activity Logger is running...</div>'
      })
    }, 'activity-logger');

    api.showNotification('Activity Logger plugin activated', 'success');
  },

  async destroy() {
    console.log('Activity Logger Plugin destroyed');
  },

  // Plugin-specific methods
  async getActivitySummary(api: PluginAPI) {
    // Get all stored activities
    const activities = [];
    for (let i = 0; i < 100; i++) {
      const key = `activity_${Date.now() - i * 1000}`;
      const activity = await api.getData(key, 'activity-logger');
      if (activity) {
        activities.push(activity);
      }
    }
    return activities;
  }
};

export default ActivityLoggerPlugin;
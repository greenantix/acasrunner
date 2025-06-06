import { Plugin, PluginAPI } from '@/types/plugin';

const PerformanceMonitorPlugin: Plugin = {
  name: 'Performance Monitor',
  id: 'performance-monitor',
  version: '1.0.0',
  author: 'leo Team',
  description: 'Monitors system performance and alerts on issues',
  icon: '⚡',
  permissions: [
    {
      type: 'storage',
      description: 'Store performance metrics'
    },
    {
      type: 'ui',
      description: 'Display performance notifications'
    }
  ],

  async onLoad(api: PluginAPI) {
    console.log('Performance Monitor Plugin loaded');
    api.log.info('Performance Monitor plugin initialized');
  },

  async onEnable(api: PluginAPI) {
    console.log('Performance Monitor Plugin enabled');
    
    let performanceData: any[] = [];
    
    // Monitor performance metrics
    const collectMetrics = () => {
      if (typeof window !== 'undefined' && window.performance) {
        const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const memory = (window.performance as any).memory;
        
        const metrics = {
          timestamp: Date.now(),
          loadTime: navigation?.loadEventEnd - navigation?.loadEventStart,
          domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
          memoryUsed: memory?.usedJSHeapSize,
          memoryTotal: memory?.totalJSHeapSize,
          memoryLimit: memory?.jsHeapSizeLimit
        };
        
        performanceData.push(metrics);
        
        // Keep only last 100 entries
        if (performanceData.length > 100) {
          performanceData = performanceData.slice(-100);
        }
        
        // Check for performance issues
        if (metrics.memoryUsed && metrics.memoryLimit) {
          const memoryUsagePercent = (metrics.memoryUsed / metrics.memoryLimit) * 100;
          if (memoryUsagePercent > 80) {
            api.ui.showNotification(
              `High memory usage detected: ${memoryUsagePercent.toFixed(1)}%`,
              'warning'
            );
            
            // Escalate if critical
            if (memoryUsagePercent > 90) {
              api.escalation.trigger({
                type: 'performance_issue',
                severity: 'high',
                message: `Critical memory usage: ${memoryUsagePercent.toFixed(1)}%`,
                context: { metrics, trend: getMemoryTrend(performanceData) }
              });
            }
          }
        }
        
        // Store metrics
        api.storage.set('performance_data', performanceData);
      }
    };
    
    // Collect metrics every 30 seconds
    const intervalId = setInterval(collectMetrics, 30000);
    
    // Store interval ID for cleanup
    await api.storage.set('intervalId', intervalId);
    
    // Initial collection
    collectMetrics();

    api.ui.showNotification('Performance Monitor plugin activated', 'success');
  },

  async onDisable(api: PluginAPI) {
    console.log('Performance Monitor Plugin disabled');
    
    // Clean up interval
    const intervalId = await api.storage.get('intervalId');
    if (intervalId) {
      clearInterval(intervalId);
    }
    
    api.ui.showNotification('Performance Monitor plugin deactivated', 'info');
  },

  async onUnload(api: PluginAPI) {
    console.log('Performance Monitor Plugin unloaded');
    api.log.info('Performance Monitor plugin destroyed');
  },

  // Plugin commands
  commands: [
    {
      id: 'get-performance-report',
      name: 'Get Performance Report',
      description: 'Get a report of system performance metrics',
      handler: async (args, api) => {
        const data = (await api.storage.get('performance_data')) || [];
        
        if (data.length === 0) {
          return { status: 'no_data', message: 'No performance data available' };
        }
        
        const latest = data[data.length - 1];
        const average = data.reduce((sum: number, item: any) => sum + (item.memoryUsed || 0), 0) / data.length;
        
        return {
          status: 'ok',
          latest,
          average: Math.round(average),
          trend: getMemoryTrend(data),
          dataPoints: data.length
        };
      }
    }
  ]
};

// Helper function outside the plugin object
function getMemoryTrend(data: any[]) {
  if (data.length < 2) return 'insufficient_data';
  
  const recent = data.slice(-5).map(d => d.memoryUsed).filter(Boolean);
  if (recent.length < 2) return 'insufficient_data';
  
  const trend = recent[recent.length - 1] - recent[0];
  return trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable';
}

export default PerformanceMonitorPlugin;


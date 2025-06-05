import { Plugin, PluginAPI } from '@/types/plugin';

const PerformanceMonitorPlugin: Plugin = {
  name: 'Performance Monitor',
  id: 'performance-monitor',
  version: '1.0.0',
  author: 'ACAS Team',
  description: 'Monitors system performance and alerts on issues',
  icon: '⚡',

  async initialize(api: PluginAPI) {
    console.log('Performance Monitor Plugin initialized');
    
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
            api.showNotification(
              `High memory usage detected: ${memoryUsagePercent.toFixed(1)}%`,
              'warning'
            );
            
            // Escalate if critical
            if (memoryUsagePercent > 90) {
              api.escalateIssue(
                `Critical memory usage: ${memoryUsagePercent.toFixed(1)}%`,
                'high',
                { metrics, trend: this.getMemoryTrend(performanceData) }
              );
            }
          }
        }
        
        // Store metrics
        api.setData('performance_data', performanceData, 'performance-monitor');
      }
    };
    
    // Collect metrics every 30 seconds
    const intervalId = setInterval(collectMetrics, 30000);
    
    // Store interval ID for cleanup
    await api.setData('intervalId', intervalId, 'performance-monitor');
    
    // Initial collection
    collectMetrics();
    
    // Register UI extension
    await api.registerUIExtension('dashboard', {
      name: 'Performance Metrics',
      component: () => ({
        render: () => `
          <div>
            <h3>Performance Monitor</h3>
            <div id="performance-chart">
              <p>Memory Usage: <span id="memory-usage">-</span></p>
              <p>Load Time: <span id="load-time">-</span>ms</p>
            </div>
          </div>
        `
      })
    }, 'performance-monitor');

    api.showNotification('Performance Monitor plugin activated', 'success');
  },

  async destroy() {
    console.log('Performance Monitor Plugin destroyed');
    // Note: In a real implementation, we'd need access to the API here to clean up
  },

  // Plugin-specific methods
  getMemoryTrend(data: any[]) {
    if (data.length < 2) return 'insufficient_data';
    
    const recent = data.slice(-5).map(d => d.memoryUsed).filter(Boolean);
    if (recent.length < 2) return 'insufficient_data';
    
    const trend = recent[recent.length - 1] - recent[0];
    return trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable';
  },

  async getPerformanceReport(api: PluginAPI) {
    const data = (await api.getData('performance_data', 'performance-monitor')) || [];
    
    if (data.length === 0) {
      return { status: 'no_data', message: 'No performance data available' };
    }
    
    const latest = data[data.length - 1];
    const average = data.reduce((sum: number, item: any) => sum + (item.memoryUsed || 0), 0) / data.length;
    
    return {
      status: 'ok',
      latest,
      average: Math.round(average),
      trend: this.getMemoryTrend(data),
      dataPoints: data.length
    };
  }
};

export default PerformanceMonitorPlugin;
import { PluginAPI, ActivityEvent, UIExtensionPoint } from '@/types/plugin';
import { ActivityService } from '@/services/activity-service';
import { EscalationManager } from '@/services/escalation-manager';

export class PluginAPIImpl implements PluginAPI {
  private activityService?: ActivityService;
  private escalationManager?: EscalationManager;
  private uiExtensions: Map<UIExtensionPoint, Array<{ pluginId: string; component: any }>> = new Map();

  constructor(pluginRegistry: any) {
    // Services will be set later via setters
  }

  setActivityService(activityService: ActivityService): void {
    this.activityService = activityService;
  }

  setEscalationManager(escalationManager: EscalationManager): void {
    this.escalationManager = escalationManager;
  }

  // Activity System Integration
  async subscribeToActivities(callback: (event: ActivityEvent) => void): Promise<void> {
    if (!this.activityService) {
      throw new Error('Activity service not available');
    }
    // Subscribe to activity events from the activity service
    this.activityService.on('activity', callback);
  }

  async unsubscribeFromActivities(callback: (event: ActivityEvent) => void): Promise<void> {
    if (!this.activityService) {
      throw new Error('Activity service not available');
    }
    this.activityService.off('activity', callback);
  }

  async logActivity(activity: ActivityEvent): Promise<void> {
    if (!this.activityService) {
      throw new Error('Activity service not available');
    }
    await this.activityService.logActivity(activity);
  }

  // AI Integration
  async requestAIAssistance(prompt: string, context?: any): Promise<string> {
    if (!this.escalationManager) {
      throw new Error('Escalation manager not available');
    }
    return await this.escalationManager.requestAssistance(prompt, context);
  }

  async escalateIssue(issue: string, severity: 'low' | 'medium' | 'high', context?: any): Promise<void> {
    if (!this.escalationManager) {
      throw new Error('Escalation manager not available');
    }
    await this.escalationManager.escalateIssue(issue, severity, context);
  }

  // UI Extension System
  async registerUIExtension(
    extensionPoint: UIExtensionPoint,
    component: any,
    pluginId: string
  ): Promise<void> {
    if (!this.uiExtensions.has(extensionPoint)) {
      this.uiExtensions.set(extensionPoint, []);
    }
    this.uiExtensions.get(extensionPoint)!.push({ pluginId, component });
  }

  async unregisterUIExtension(
    extensionPoint: UIExtensionPoint,
    pluginId: string
  ): Promise<void> {
    const extensions = this.uiExtensions.get(extensionPoint);
    if (extensions) {
      const filtered = extensions.filter(ext => ext.pluginId !== pluginId);
      this.uiExtensions.set(extensionPoint, filtered);
    }
  }

  getUIExtensions(extensionPoint: UIExtensionPoint): Array<{ pluginId: string; component: any }> {
    return this.uiExtensions.get(extensionPoint) || [];
  }

  // Storage System
  async setData(key: string, value: any, pluginId: string): Promise<void> {
    const storageKey = `plugin_${pluginId}_${key}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(value));
    }
  }

  async getData(key: string, pluginId: string): Promise<any> {
    const storageKey = `plugin_${pluginId}_${key}`;
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  async removeData(key: string, pluginId: string): Promise<void> {
    const storageKey = `plugin_${pluginId}_${key}`;
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  }

  // Configuration System
  async getConfig(key: string, defaultValue?: any): Promise<any> {
    // This would integrate with your app's configuration system
    return defaultValue;
  }

  async setConfig(key: string, value: any): Promise<void> {
    // This would integrate with your app's configuration system
    console.log(`Setting config ${key}:`, value);
  }

  // Utility Functions
  showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    // This would integrate with your app's notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  openModal(component: any, props?: any): void {
    // This would integrate with your app's modal system
    console.log('Opening modal:', component, props);
  }

  navigateTo(path: string): void {
    // This would integrate with your app's router
    if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  }
}
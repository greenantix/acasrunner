import { pluginRegistry } from '../../services/plugin-system/plugin-registry';
import { ClaudeCodePlugin } from './index';

export async function registerClaudeCodePlugin(): Promise<void> {
  try {
    console.log('🔌 Registering Claude Code plugin...');
    
    const plugin = new ClaudeCodePlugin();
    const instance = await pluginRegistry.registerPlugin(plugin);
    
    // Enable the plugin immediately after registration
    await pluginRegistry.enablePlugin(plugin.id);
    
    console.log('✅ Claude Code plugin registered and enabled successfully');
  } catch (error) {
    console.error('❌ Failed to register Claude Code plugin:', error);
    throw error;
  }
}

// Auto-register the plugin when this module is imported
if (typeof window === 'undefined') {
  // Only auto-register in Node.js environment (server-side)
  registerClaudeCodePlugin().catch(error => {
    console.error('Failed to auto-register Claude Code plugin:', error);
  });
}

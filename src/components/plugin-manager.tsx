'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePlugins, usePluginStatus } from '@/hooks/use-plugins';
import { PluginInstance, PluginStatus } from '@/types/plugin';

const PluginCard: React.FC<{ plugin: PluginInstance }> = ({ plugin }) => {
  const { unloadPlugin } = usePlugins();
  const [loading, setLoading] = useState(false);

  const handleUnload = async () => {
    setLoading(true);
    try {
      await unloadPlugin(plugin.plugin.id);
    } catch (error) {
      console.error('Failed to unload plugin:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status: PluginStatus) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'loading': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'stopped': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {plugin.plugin.icon && <span className="text-2xl">{plugin.plugin.icon}</span>}
            <div>
              <CardTitle className="text-lg">{plugin.plugin.name}</CardTitle>
              <CardDescription>v{plugin.plugin.version} by {plugin.plugin.author}</CardDescription>
            </div>
          </div>
          <Badge className={getStatusColor(plugin.status)}>
            {plugin.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">{plugin.plugin.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Loaded: {plugin.loadedAt?.toLocaleString()}
          </span>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleUnload}
            disabled={loading}
          >
            {loading ? 'Unloading...' : 'Unload'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const PluginLoader: React.FC = () => {
  const { loadPlugin } = usePlugins();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoadFromURL = async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await loadPlugin(url);
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plugin');
    }
    
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      await loadPlugin(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plugin');
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="plugin-url">Load from URL</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="plugin-url"
            placeholder="https://example.com/plugin.js"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
          />
          <Button onClick={handleLoadFromURL} disabled={loading || !url.trim()}>
            {loading ? 'Loading...' : 'Load'}
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="plugin-file">Upload Plugin File</Label>
        <Input
          id="plugin-file"
          type="file"
          accept=".js,.ts"
          onChange={handleFileUpload}
          disabled={loading}
          className="mt-1"
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

const BuiltInPlugins: React.FC = () => {
  const { loadPlugin } = usePlugins();
  const [loading, setLoading] = useState<string | null>(null);

  const builtInPlugins = [
    {
      id: 'activity-logger',
      name: 'Activity Logger',
      description: 'Logs all activity events with timestamps',
      icon: '📝'
    },
    {
      id: 'ai-assistant',
      name: 'AI Code Assistant',
      description: 'Provides AI-powered code suggestions',
      icon: '🤖'
    },
    {
      id: 'performance-monitor',
      name: 'Performance Monitor',
      description: 'Monitors system performance metrics',
      icon: '⚡'
    }
  ];

  const handleLoadBuiltIn = async (pluginId: string) => {
    setLoading(pluginId);
    try {
      // For built-in plugins, we'll load them from the examples folder
      const response = await fetch(`/api/plugins/builtin/${pluginId}`);
      if (!response.ok) {
        throw new Error(`Failed to load built-in plugin: ${response.statusText}`);
      }
      const pluginCode = await response.text();
      await loadPlugin(pluginCode);
    } catch (error) {
      console.error('Failed to load built-in plugin:', error);
    }
    setLoading(null);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {builtInPlugins.map((plugin) => (
        <Card key={plugin.id}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{plugin.icon}</span>
              <div>
                <CardTitle className="text-lg">{plugin.name}</CardTitle>
                <CardDescription>Built-in Plugin</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{plugin.description}</p>
            <Button 
              onClick={() => handleLoadBuiltIn(plugin.id)}
              disabled={loading === plugin.id}
              className="w-full"
            >
              {loading === plugin.id ? 'Loading...' : 'Install'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const PluginManager: React.FC = () => {
  const { plugins } = usePlugins();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Plugin Manager</h1>
        <p className="text-gray-600">Manage and configure plugins for your ACAS system</p>
      </div>

      <Tabs defaultValue="installed" className="space-y-6">
        <TabsList>
          <TabsTrigger value="installed">Installed ({plugins.length})</TabsTrigger>
          <TabsTrigger value="load">Load Plugin</TabsTrigger>
          <TabsTrigger value="builtin">Built-in Plugins</TabsTrigger>
        </TabsList>

        <TabsContent value="installed">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Installed Plugins</h2>
            {plugins.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500">No plugins installed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plugins.map((plugin) => (
                  <PluginCard key={plugin.plugin.id} plugin={plugin} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="load">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Load New Plugin</h2>
            <Card>
              <CardContent className="pt-6">
                <PluginLoader />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="builtin">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Built-in Plugins</h2>
            <BuiltInPlugins />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
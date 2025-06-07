"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Settings, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Filter,
  AlertTriangle,
  Clock,
  User,
  Brain,
  FileJson,
  RotateCcw
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface StrugglePattern {
  id: string;
  pattern: string;
  plugin: 'claude-code' | 'cline' | 'cursor' | 'other';
  model: string;
  errorType: 'api_timeout' | 'dependency_error' | 'syntax_error' | 'build_failure' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoDisable: boolean;
  occurrences: number;
  lastSeen: Date;
  description: string;
  enabled: boolean;
}

interface SessionStats {
  plugin: string;
  model: string;
  sessionCount: number;
  lifetimeCount: number;
  lastSession: Date;
  struggleFiltersActive: number;
}

const mockStrugglePatterns: StrugglePattern[] = [
  {
    id: 'sp-1',
    pattern: 'Cannot read properties of undefined',
    plugin: 'claude-code',
    model: 'claude-3-5-sonnet',
    errorType: 'syntax_error',
    severity: 'medium',
    autoDisable: true,
    occurrences: 8,
    lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
    description: 'Null pointer exceptions in TypeScript code',
    enabled: true
  },
  {
    id: 'sp-2', 
    pattern: 'API rate limit exceeded',
    plugin: 'claude-code',
    model: 'gpt-4-turbo',
    errorType: 'api_timeout',
    severity: 'high',
    autoDisable: false,
    occurrences: 3,
    lastSeen: new Date(Date.now() - 30 * 60 * 1000),
    description: 'OpenAI API rate limiting issues',
    enabled: true
  },
  {
    id: 'sp-3',
    pattern: 'Module not found',
    plugin: 'cline',
    model: 'claude-3-haiku',
    errorType: 'dependency_error',
    severity: 'medium',
    autoDisable: true,
    occurrences: 12,
    lastSeen: new Date(Date.now() - 24 * 60 * 60 * 1000),
    description: 'Missing dependencies in import statements',
    enabled: false
  }
];

const mockSessionStats: SessionStats[] = [
  {
    plugin: 'claude-code',
    model: 'claude-3-5-sonnet',
    sessionCount: 24,
    lifetimeCount: 156,
    lastSession: new Date(Date.now() - 10 * 60 * 1000),
    struggleFiltersActive: 2
  },
  {
    plugin: 'claude-code', 
    model: 'gpt-4-turbo',
    sessionCount: 8,
    lifetimeCount: 43,
    lastSession: new Date(Date.now() - 2 * 60 * 60 * 1000),
    struggleFiltersActive: 1
  },
  {
    plugin: 'cline',
    model: 'claude-3-haiku',
    sessionCount: 5,
    lifetimeCount: 21,
    lastSession: new Date(Date.now() - 6 * 60 * 60 * 1000),
    struggleFiltersActive: 0
  }
];

export default function StruggleSettingsPage() {
  const [patterns, setPatterns] = useState<StrugglePattern[]>(mockStrugglePatterns);
  const [sessionStats] = useState<SessionStats[]>(mockSessionStats);
  const [selectedPattern, setSelectedPattern] = useState<StrugglePattern | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [jsonConfig, setJsonConfig] = useState('');

  useEffect(() => {
    // Generate JSON config from patterns
    const config = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      patterns: patterns.map(p => ({
        pattern: p.pattern,
        plugin: p.plugin,
        model: p.model,
        errorType: p.errorType,
        severity: p.severity,
        autoDisable: p.autoDisable,
        enabled: p.enabled,
        description: p.description
      }))
    };
    setJsonConfig(JSON.stringify(config, null, 2));
  }, [patterns]);

  const handleTogglePattern = (patternId: string) => {
    setPatterns(prev => prev.map(p => 
      p.id === patternId ? { ...p, enabled: !p.enabled } : p
    ));
    toast({
      title: "Pattern Updated",
      description: "Struggle pattern status has been changed"
    });
  };

  const handleDeletePattern = (patternId: string) => {
    setPatterns(prev => prev.filter(p => p.id !== patternId));
    toast({
      title: "Pattern Deleted",
      description: "Struggle pattern has been removed"
    });
  };

  const handleExportConfig = () => {
    const blob = new Blob([jsonConfig], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'struggle-settings.json';
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Config Exported",
      description: "Struggle settings have been downloaded"
    });
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        // TODO: Validate and merge imported patterns
        toast({
          title: "Config Imported",
          description: "Struggle settings have been loaded"
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Invalid JSON configuration file",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',  
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Struggle Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage error patterns and fine-tune plugin behavior
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportConfig}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <label>
            <Button variant="outline" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </span>
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImportConfig}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <Tabs defaultValue="patterns" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="patterns">Struggle Patterns</TabsTrigger>
          <TabsTrigger value="analytics">Session Analytics</TabsTrigger>
          <TabsTrigger value="config">JSON Config</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Struggle Pattern Filters
              </CardTitle>
              <CardDescription>
                Auto-learned patterns that cause repeated failures. Disable patterns to prevent auto-escalation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {patterns.map((pattern) => (
                    <Card key={pattern.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getSeverityColor(pattern.severity)}>
                              {pattern.severity}
                            </Badge>
                            <Badge variant="outline">{pattern.plugin}</Badge>
                            <Badge variant="outline">{pattern.model}</Badge>
                            <Badge variant="outline">{pattern.errorType}</Badge>
                          </div>
                          <h3 className="font-medium">{pattern.pattern}</h3>
                          <p className="text-sm text-gray-600 mt-1">{pattern.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {pattern.occurrences} occurrences
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last: {pattern.lastSeen.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant={pattern.enabled ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleTogglePattern(pattern.id)}
                          >
                            {pattern.enabled ? "Enabled" : "Disabled"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePattern(pattern.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessionStats.map((stat, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="h-5 w-5" />
                    {stat.plugin}
                  </CardTitle>
                  <CardDescription>{stat.model}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-2xl font-bold">{stat.sessionCount}</div>
                      <div className="text-gray-600">This Session</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{stat.lifetimeCount}</div>
                      <div className="text-gray-600">Lifetime</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Struggle Filters Active</span>
                      <Badge variant={stat.struggleFiltersActive > 0 ? "default" : "secondary"}>
                        {stat.struggleFiltersActive}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      Last active: {stat.lastSession.toLocaleString()}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Filters
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                JSON Configuration
              </CardTitle>
              <CardDescription>
                Raw JSON configuration for struggle patterns. Edit carefully or use the UI above.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={jsonConfig}
                  onChange={(e) => setJsonConfig(e.target.value)}
                  className="font-mono text-sm min-h-[400px]"
                  placeholder="JSON configuration will appear here..."
                />
                <div className="flex gap-2">
                  <Button variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Default
                  </Button>
                  <Button>
                    Apply Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
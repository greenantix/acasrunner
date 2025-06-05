
"use client";

import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plug, UploadCloud, FilePlus2, Trash2, Settings2, FileArchive } from "lucide-react";
import { useToast } from '@/hooks/use-toast';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  filePath: string;
  isActive: boolean;
}

const mockPlugins: Plugin[] = [
  { id: '1', name: 'Code Formatter', version: '1.2.0', description: 'Automatically formats code based on Prettier rules.', author: 'DevTools Inc.', filePath: '/plugins/code-formatter.js', isActive: true },
  { id: '2', name: 'Error Explainer', version: '0.9.5', description: 'Provides detailed explanations for common runtime errors.', author: 'AI Helpers', filePath: '/plugins/error-explainer.ts', isActive: true },
  { id: '3', name: 'Test Generator', version: '1.0.1', description: 'Generates unit test stubs for selected functions.', author: 'QA Tools Co.', filePath: '/plugins/test-generator.js', isActive: false },
  { id: '4', name: 'Dependency Analyzer', version: '0.5.0', description: 'Analyzes project dependencies and suggests updates.', author: 'Open Source Community', filePath: '/plugins/dep-analyzer.ts', isActive: true },
];

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>(mockPlugins);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const togglePlugin = (id: string) => {
    const updatedPlugins = plugins.map(p =>
      p.id === id ? { ...p, isActive: !p.isActive } : p
    );
    setPlugins(updatedPlugins);
    const changedPlugin = updatedPlugins.find(p => p.id === id);
    toast({ title: "Plugin status updated.", description: `${changedPlugin?.name} is now ${changedPlugin?.isActive ? 'active' : 'inactive'}.`});
  };
  
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // A timeout helps prevent flickering when dragging over child elements
    setTimeout(() => {
        const target = e.relatedTarget as Node;
        // Check if the mouse is still within the dropzone or its children
        if (!(e.currentTarget as Node).contains(target)) {
            setIsDragging(false);
        }
    }, 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
     if (!isDragging) setIsDragging(true); // Ensure dragging state is true
  }, [isDragging]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const newPluginName = file.name;
      if (file.name.endsWith('.zip')) {
        toast({
          title: "ZIP File Dropped (Mock)",
          description: `${newPluginName} would be unzipped and plugins registered. This is a UI demo.`,
          icon: <FileArchive className="mr-2 h-5 w-5 text-blue-500" />
        });
        // Mock adding a plugin from the zip
        const mockPluginFromZip: Plugin = {
            id: Date.now().toString(),
            name: `Plugin from ${newPluginName}`,
            version: '1.0.0',
            description: `Auto-registered from ${newPluginName}`,
            author: 'ZIP Loader',
            filePath: `/plugins/unzipped/${file.name.replace('.zip', '')}/plugin.js`,
            isActive: false,
        };
        setPlugins(prev => [...prev, mockPluginFromZip]);

      } else if (file.name.endsWith('.ts') || file.name.endsWith('.js')) {
         toast({
          title: "Plugin File Dropped (Mock)",
          description: `${newPluginName} would be processed. This is a UI demo.`,
        });
         const mockPluginFromFile: Plugin = {
            id: Date.now().toString(),
            name: newPluginName.replace(/\.(ts|js)$/, ''),
            version: '0.1.0',
            description: `Loaded from ${newPluginName}`,
            author: 'File Loader',
            filePath: `/plugins/${newPluginName}`,
            isActive: false,
        };
        setPlugins(prev => [...prev, mockPluginFromFile]);
      } else {
        toast({
            title: "Invalid File Type",
            description: `File type not supported: ${file.name}. Please drop .ts, .js, or .zip files.`,
            variant: "destructive"
        });
      }
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const newPluginName = file.name;
        if (file.name.endsWith('.zip')) {
            toast({ title: "ZIP File Selected (Mock)", description: `${newPluginName} selected. Unzipping and registration would occur.`, icon: <FileArchive className="mr-2 h-5 w-5 text-blue-500" />});
        } else {
            toast({ title: "File Selected (Mock)", description: `${newPluginName} selected. This is a UI demo.`});
        }
        // Mock add plugin to list
        const mockPlugin: Plugin = {
            id: Date.now().toString(),
            name: file.name.replace(/\.(ts|js|zip)$/, ''),
            version: '0.1.0',
            description: `Loaded ${file.name}`,
            author: 'File Input',
            filePath: `/plugins/${file.name}`,
            isActive: false,
        };
        setPlugins(prev => [...prev, mockPlugin]);
        e.target.value = ""; // Reset file input
     }
  };

  const deletePlugin = (id: string) => {
    const pluginToDelete = plugins.find(p => p.id === id);
    setPlugins(prevPlugins => prevPlugins.filter(p => p.id !== id));
    toast({title: "Plugin Deleted (Mock)", description: `Plugin "${pluginToDelete?.name}" removed.`});
  };


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold font-headline">Plugin Management</h1>
      
      <Card 
        className={`shadow-lg transition-all border-dashed ${isDragging ? 'border-primary ring-2 ring-primary bg-primary/10' : 'border-border'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center"><UploadCloud className="mr-2 h-6 w-6 text-primary" /> Add New Plugin</CardTitle>
          <CardDescription>Drag & drop .ts, .js, or .zip plugin files here, or use the button below.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[100px] flex items-center justify-center">
          {isDragging ? (
             <p className="text-primary font-medium text-lg">Drop files to upload!</p>
          ) : (
             <p className="text-muted-foreground">Drag files here or click button</p>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => document.getElementById('plugin-file-input')?.click()}>
            <FilePlus2 className="mr-2 h-5 w-5" /> Select Plugin File(s)
          </Button>
          <input type="file" id="plugin-file-input" accept=".ts,.js,.zip" className="hidden" onChange={handleFileSelect} />
        </CardFooter>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Installed Plugins</CardTitle>
          <CardDescription>Manage your active and inactive plugins. Changes are reflected immediately.</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-32rem)] pr-4"> {/* Adjusted height for better fit */}
            {plugins.length === 0 && (
              <p className="text-muted-foreground text-center py-10">No plugins installed yet.</p>
            )}
            <div className="space-y-4">
              {plugins.map((plugin) => (
                <Card key={plugin.id} className="p-4 bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-grow">
                      <h3 className="text-lg font-medium text-foreground flex items-center">
                        <Plug className={`mr-2 h-5 w-5 ${plugin.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        {plugin.name} <Badge variant="secondary" className="ml-2">{plugin.version}</Badge>
                      </h3>
                      <p className="text-sm text-muted-foreground">{plugin.description}</p>
                      <p className="text-xs text-muted-foreground">Author: {plugin.author}</p>
                      <p className="text-xs text-muted-foreground truncate" title={plugin.filePath}>Path: {plugin.filePath}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-2 ml-4 flex-shrink-0">
                      <Switch
                        checked={plugin.isActive}
                        onCheckedChange={() => togglePlugin(plugin.id)}
                        aria-label={`Toggle ${plugin.name}`}
                      />
                      <div className="space-x-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast({title: "Mock Configure", description: `Configuring ${plugin.name}`})}>
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deletePlugin(plugin.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

    
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Command, 
  Download, 
  GitBranch, 
  Trash2, 
  Plus,
  FileText,
  Activity,
  Cog,
  Search,
  Sparkles
} from "lucide-react";

interface Command {
  name: string;
  description: string;
  usage: string;
  category: 'session' | 'export' | 'context' | 'plugin' | 'system';
  icon: JSX.Element;
  example?: string;
}

interface CommandSuggestionsProps {
  query: string;
  onSelect: (command: string) => void;
  onClose: () => void;
}

export function CommandSuggestions({ query, onSelect, onClose }: CommandSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = [
    {
      name: '/clear',
      description: 'Clear the current conversation',
      usage: '/clear',
      category: 'session',
      icon: <Trash2 className="h-4 w-4" />,
      example: 'Remove all messages from this session'
    },
    {
      name: '/export',
      description: 'Export conversation to file',
      usage: '/export [format]',
      category: 'export',
      icon: <Download className="h-4 w-4" />,
      example: '/export markdown'
    },
    {
      name: '/branch',
      description: 'Create a new branch from this conversation',
      usage: '/branch [from_message_id]',
      category: 'session',
      icon: <GitBranch className="h-4 w-4" />,
      example: 'Branch conversation from a specific point'
    },
    {
      name: '/context',
      description: 'Add recent activity context to conversation',
      usage: '/context [timeframe]',
      category: 'context',
      icon: <Activity className="h-4 w-4" />,
      example: '/context 1h'
    },
    {
      name: '/files',
      description: 'Include file contents in context',
      usage: '/files [pattern]',
      category: 'context',
      icon: <FileText className="h-4 w-4" />,
      example: '/files src/**/*.ts'
    },
    {
      name: '/plugin',
      description: 'Execute a plugin command',
      usage: '/plugin [command] [args]',
      category: 'plugin',
      icon: <Cog className="h-4 w-4" />,
      example: '/plugin analyze-code src/main.ts'
    },
    {
      name: '/search',
      description: 'Search through conversation history',
      usage: '/search [query]',
      category: 'system',
      icon: <Search className="h-4 w-4" />,
      example: '/search error handling'
    },
    {
      name: '/template',
      description: 'Use a conversation template',
      usage: '/template [name]',
      category: 'session',
      icon: <Sparkles className="h-4 w-4" />,
      example: '/template code-review'
    },
    {
      name: '/new',
      description: 'Create a new session',
      usage: '/new [provider] [model]',
      category: 'session',
      icon: <Plus className="h-4 w-4" />,
      example: '/new claude sonnet'
    }
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.name.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].name);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  if (filteredCommands.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Command className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No commands found for "{query}"</p>
            <p className="text-sm mt-1">Try typing a different command</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCategoryColor = (category: Command['category']) => {
    switch (category) {
      case 'session':
        return 'bg-blue-100 text-blue-800';
      case 'export':
        return 'bg-green-100 text-green-800';
      case 'context':
        return 'bg-purple-100 text-purple-800';
      case 'plugin':
        return 'bg-orange-100 text-orange-800';
      case 'system':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardContent className="p-0">
        <div className="max-h-64 overflow-y-auto">
          {filteredCommands.map((command, index) => (
            <div
              key={command.name}
              className={`p-3 cursor-pointer transition-colors border-b last:border-b-0 ${
                index === selectedIndex 
                  ? 'bg-primary/10 border-primary/20' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => onSelect(command.name)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <div className="p-1 bg-muted rounded-md mt-0.5">
                    {command.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <code className="font-mono font-semibold text-sm">
                        {command.name}
                      </code>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getCategoryColor(command.category)}`}
                      >
                        {command.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {command.description}
                    </p>
                    <code className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                      {command.usage}
                    </code>
                    {command.example && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        e.g. {command.example}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-3 border-t bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>↑↓ to navigate • Enter to select • Esc to close</span>
            <span>{filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

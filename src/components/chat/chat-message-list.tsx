"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/types/chat";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, 
  Edit3, 
  Trash2, 
  GitBranch, 
  ThumbsUp, 
  ThumbsDown,
  MoreHorizontal,
  User,
  Bot,
  Settings
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  onBranchFromMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export function ChatMessageList({
  messages,
  isStreaming = false,
  onBranchFromMessage,
  onEditMessage,
  onDeleteMessage
}: ChatMessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const formatMessageContent = (content: string) => {
    // Split content by code blocks
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // This is a code block
        const lines = part.split('\n');
        const language = lines[0].slice(3).trim() || 'text';
        const code = lines.slice(1, -1).join('\n');
        
        return (
          <div key={index} className="my-3">
            <div className="flex items-center justify-between bg-muted px-3 py-1 rounded-t-md">
              <span className="text-xs font-mono text-muted-foreground">{language}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(code)}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <pre className="bg-muted/50 p-3 rounded-b-md overflow-x-auto">
              <code className="text-sm font-mono">{code}</code>
            </pre>
          </div>
        );
      } else {
        // Regular text with markdown formatting
        return (
          <div key={index} className="whitespace-pre-wrap">
            {part.split('\n').map((line, lineIndex) => (
              <span key={lineIndex}>
                {formatInlineMarkdown(line)}
                {lineIndex < part.split('\n').length - 1 && <br />}
              </span>
            ))}
          </div>
        );
      }
    });
  };

  const formatInlineMarkdown = (text: string) => {
    // Simple inline markdown formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>')
      .split(/(<[^>]+>.*?<\/[^>]+>)/)
      .map((part, index) => {
        if (part.startsWith('<')) {
          return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
        }
        return part;
      });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="h-4 w-4" />;
      case 'assistant':
        return <Bot className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'user':
        return 'bg-primary/10 border-primary/20';
      case 'assistant':
        return 'bg-secondary/50 border-secondary/20';
      case 'system':
        return 'bg-muted border-muted-foreground/20';
      default:
        return 'bg-secondary/50 border-secondary/20';
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">No messages yet</p>
          <p className="text-sm">Start a conversation by typing a message below.</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
      <div className="max-w-4xl mx-auto py-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={cn(
              "group relative rounded-lg border p-4 transition-colors",
              getRoleColor(message.role)
            )}
          >
            {/* Message Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  {getRoleIcon(message.role)}
                  <span className="font-medium capitalize">{message.role}</span>
                </div>
                
                {message.metadata.model && (
                  <Badge variant="outline" className="text-xs">
                    {message.metadata.model}
                  </Badge>
                )}
                
                {message.metadata.tokens && (
                  <Badge variant="secondary" className="text-xs">
                    {message.metadata.tokens} tokens
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-muted-foreground">
                  {message.timestamp.toLocaleTimeString()}
                </span>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => copyToClipboard(message.content)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Message
                    </DropdownMenuItem>
                    {onBranchFromMessage && (
                      <DropdownMenuItem onClick={() => onBranchFromMessage(message.id)}>
                        <GitBranch className="h-4 w-4 mr-2" />
                        Branch from Here
                      </DropdownMenuItem>
                    )}
                    {onEditMessage && message.role === 'user' && (
                      <DropdownMenuItem onClick={() => onEditMessage(message.id, message.content)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Message
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {onDeleteMessage && (
                      <DropdownMenuItem 
                        onClick={() => onDeleteMessage(message.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Message
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Message Content */}
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {formatMessageContent(message.content)}
            </div>

            {/* Attachments */}
            {message.metadata.attachments && message.metadata.attachments.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <h4 className="text-sm font-medium mb-2">Attachments:</h4>
                <div className="space-y-1">
                  {message.metadata.attachments.map((attachment, attachmentIndex) => (
                    <div key={attachmentIndex} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">
                        {attachment.type}
                      </Badge>
                      <span>{attachment.name}</span>
                      <span className="text-muted-foreground">
                        ({Math.round(attachment.size / 1024)}KB)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Context Information */}
            {message.context && (
              Object.keys(message.context).some(key => message.context![key as keyof typeof message.context]?.length) && (
              <div className="mt-3 pt-3 border-t">
                <h4 className="text-sm font-medium mb-2">Context:</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {message.context.activityEvents && message.context.activityEvents.length > 0 && (
                    <div>Activity events: {message.context.activityEvents.length}</div>
                  )}
                  {message.context.pluginCommands && message.context.pluginCommands.length > 0 && (
                    <div>Plugin commands: {message.context.pluginCommands.length}</div>
                  )}
                  {message.context.files && message.context.files.length > 0 && (
                    <div>Referenced files: {message.context.files.length}</div>
                  )}
                </div>
              </div>
            ))}

            {/* Processing time */}
            {message.metadata.processing_time && (
              <div className="mt-2 text-xs text-muted-foreground">
                Processing time: {message.metadata.processing_time}ms
              </div>
            )}

            {/* Edit history */}
            {message.metadata.edits && message.metadata.edits.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Edited {message.metadata.edits.length} time(s)
              </div>
            )}
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className={cn(
            "rounded-lg border p-4",
            getRoleColor('assistant')
          )}>
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-4 w-4" />
              <span className="font-medium">Assistant</span>
              <Badge variant="secondary" className="text-xs">
                Typing...
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
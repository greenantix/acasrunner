"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { ChatSession, ChatAttachment } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Paperclip, 
  Image, 
  FileText, 
  X,
  Smile,
  Command
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CommandSuggestions } from "./command-suggestions";

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: ChatAttachment[]) => void;
  disabled?: boolean;
  session: ChatSession;
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  session
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [showCommands, setShowCommands] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }

    // Command autocomplete
    if (message.startsWith('/')) {
      const query = message.slice(1);
      setCommandQuery(query);
      setShowCommands(true);
    } else {
      setShowCommands(false);
      setCommandQuery("");
    }

    // Auto-resize textarea
    const textarea = e.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  const handleSend = () => {
    if (!message.trim() || disabled) return;

    onSendMessage(message.trim(), attachments.length > 0 ? attachments : undefined);
    setMessage("");
    setAttachments([]);
    setShowCommands(false);
    setCommandQuery("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileAttachment = async (files: FileList | null) => {
    if (!files) return;

    const newAttachments: ChatAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        console.warn(`File ${file.name} is too large (max 10MB)`);
        continue;
      }

      try {
        const content = await readFileAsString(file);
        const attachment: ChatAttachment = {
          id: Date.now().toString() + i,
          type: getFileType(file),
          name: file.name,
          size: file.size,
          content,
          mimeType: file.type
        };
        newAttachments.push(attachment);
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const readFileAsString = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const getFileType = (file: File): ChatAttachment['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json')) return 'file';
    return 'file';
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };

  const handleCommandSelect = (command: string) => {
    setMessage(command + ' ');
    setShowCommands(false);
    textareaRef.current?.focus();
  };

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newMessage = message.substring(0, start) + text + message.substring(end);
    setMessage(newMessage);

    // Restore cursor position
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.focus();
    }, 0);
  };

  return (
    <div className="border-t bg-background p-4">
      {/* File attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-3 space-y-2">
          <h4 className="text-sm font-medium">Attachments:</h4>
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-2 bg-muted rounded-md px-3 py-2"
              >
                {attachment.type === 'image' ? (
                  <Image className="h-4 w-4" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="text-sm truncate max-w-32">
                  {attachment.name}
                </span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(attachment.size / 1024)}KB
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(attachment.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Command suggestions */}
      {showCommands && (
        <div className="mb-3">
          <CommandSuggestions 
            query={commandQuery}
            onSelect={handleCommandSelect}
            onClose={() => setShowCommands(false)}
          />
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (/ for commands, Shift+Enter for new line)"
            disabled={disabled}
            className="min-h-[2.5rem] max-h-48 resize-none pr-12"
            rows={1}
          />
          
          {/* Quick actions inside textarea */}
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => insertAtCursor('😊')}
              className="h-6 w-6 p-0"
              type="button"
            >
              <Smile className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Attachment menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={disabled}>
                <Paperclip className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="h-4 w-4 mr-2" />
                Upload File
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'image/*';
                    fileInputRef.current.click();
                  }
                }}
              >
                <Image className="h-4 w-4 mr-2" />
                Upload Image
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Send button */}
          <Button 
            onClick={handleSend} 
            disabled={disabled || !message.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileAttachment(e.target.files)}
        accept="*/*"
      />

      {/* Provider info */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Using {session.provider} ({session.model})
        </span>
        <div className="flex items-center gap-2">
          <span>Temp: {session.settings.temperature}</span>
          <span>Max tokens: {session.settings.maxTokens}</span>
          {session.settings.autoContext && (
            <Badge variant="outline" className="text-xs">
              Auto-context
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// Hidden file input component
const FileInput = ({ onFileSelect }: { onFileSelect: (files: FileList) => void }) => {
  return (
    <input
      type="file"
      multiple
      className="hidden"
      onChange={(e) => e.target.files && onFileSelect(e.target.files)}
    />
  );
};

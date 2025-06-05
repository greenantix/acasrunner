"use client";

import { useState } from "react";
import { ChatSession } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Download, 
  GitBranch, 
  Star, 
  StarOff, 
  Edit3,
  Check,
  X,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportDialog } from "./export-dialog";

interface ChatHeaderProps {
  session: ChatSession;
  onUpdateSession: (updates: Partial<ChatSession>) => void;
  onBranchSession: () => void;
  onDeleteSession: () => void;
}

export function ChatHeader({
  session,
  onUpdateSession,
  onBranchSession,
  onDeleteSession
}: ChatHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(session.name);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== session.name) {
      onUpdateSession({ name: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setEditedName(session.name);
    setIsEditingName(false);
  };

  const handleToggleStar = () => {
    onUpdateSession({ 
      metadata: { 
        ...session.metadata, 
        starred: !session.metadata.starred 
      } 
    });
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'claude':
        return '🤖';
      case 'openai':
        return '🧠';
      case 'gemini':
        return '💎';
      default:
        return '💬';
    }
  };

  return (
    <>
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="text-2xl">{getProviderIcon(session.provider)}</span>
            
            <div className="min-w-0 flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    className="text-lg font-semibold"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveName}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold truncate">{session.name}</h1>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingName(true)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleStar}
                    className="h-6 w-6 p-0"
                  >
                    {session.metadata.starred ? (
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {session.provider}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {session.model}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {session.metadata.messageCount} messages
                </span>
                {session.metadata.totalTokens && (
                  <span className="text-xs text-muted-foreground">
                    {session.metadata.totalTokens} tokens
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onBranchSession}
            >
              <GitBranch className="h-4 w-4 mr-1" />
              Branch
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditingName(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Rename Session
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleStar}>
                  {session.metadata.starred ? (
                    <>
                      <StarOff className="h-4 w-4 mr-2" />
                      Remove Star
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4 mr-2" />
                      Add Star
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onBranchSession}>
                  <GitBranch className="h-4 w-4 mr-2" />
                  Create Branch
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Session
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDeleteSession} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Session
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Session metadata */}
        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <span>Created {session.created.toLocaleDateString()}</span>
          <span>Updated {session.lastUpdated.toLocaleDateString()}</span>
          {session.parentSessionId && (
            <span>Branched from parent session</span>
          )}
          {session.metadata.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <span>Tags:</span>
              {session.metadata.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <ExportDialog
        session={session}
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />
    </>
  );
}
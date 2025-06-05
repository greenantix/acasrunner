"use client";

import { useState } from "react";
import { ChatSessionSummary } from "@/types/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Star, 
  StarOff, 
  Trash2, 
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Filter
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ChatSessionSidebarProps {
  sessions: ChatSessionSummary[];
  activeSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: (provider?: string, model?: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onUpdateSession: (sessionId: string, updates: any) => void;
  isLoading?: boolean;
}

export function ChatSessionSidebar({
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onUpdateSession,
  isLoading = false
}: ChatSessionSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [filter, setFilter] = useState<"all" | "starred" | "claude" | "openai" | "gemini">("all");

  const filteredSessions = sessions.filter(session => {
    // Search filter
    if (searchQuery && !session.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !session.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Archive filter
    if (!showArchived && session.archived) {
      return false;
    }

    // Provider/type filter
    if (filter === "starred" && !session.starred) {
      return false;
    }
    if (filter !== "all" && filter !== "starred" && session.provider !== filter) {
      return false;
    }

    return true;
  });

  const handleToggleStar = (sessionId: string, starred: boolean) => {
    onUpdateSession(sessionId, { metadata: { starred: !starred } });
  };

  const handleToggleArchive = (sessionId: string, archived: boolean) => {
    onUpdateSession(sessionId, { metadata: { archived: !archived } });
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
    <div className="w-80 border-r bg-background flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Chat Sessions</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onNewSession('claude', 'claude-3-5-sonnet-20241022')}>
                🤖 Claude Session
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNewSession('openai', 'gpt-4')}>
                🧠 OpenAI Session
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNewSession('gemini', 'gemini-pro')}>
                💎 Gemini Session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button
            variant={filter === "starred" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("starred")}
          >
            <Star className="h-3 w-3 mr-1" />
            Starred
          </Button>
          <Button
            variant={filter === "claude" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("claude")}
          >
            🤖
          </Button>
          <Button
            variant={filter === "openai" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("openai")}
          >
            🧠
          </Button>
          <Button
            variant={filter === "gemini" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("gemini")}
          >
            💎
          </Button>
        </div>
      </div>

      {/* Session List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading && sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading sessions...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No sessions match your search" : "No sessions yet"}
            </div>
          ) : (
            filteredSessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  "p-3 rounded-lg cursor-pointer mb-2 border transition-colors",
                  activeSessionId === session.id
                    ? "bg-primary/10 border-primary"
                    : "hover:bg-muted border-transparent"
                )}
                onClick={() => onSessionSelect(session.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-lg">{getProviderIcon(session.provider)}</span>
                    <span className="font-medium truncate">{session.name}</span>
                    {session.starred && (
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                    )}
                    {session.archived && (
                      <Archive className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStar(session.id, session.starred);
                        }}
                      >
                        {session.starred ? (
                          <>
                            <StarOff className="h-4 w-4 mr-2" />
                            Unstar
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-2" />
                            Star
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleArchive(session.id, session.archived);
                        }}
                      >
                        {session.archived ? (
                          <>
                            <ArchiveRestore className="h-4 w-4 mr-2" />
                            Unarchive
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-sm text-muted-foreground truncate mb-2">
                  {session.lastMessage || "No messages yet"}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{session.lastUpdated.toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {session.messageCount} msgs
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {session.provider}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{filteredSessions.length} sessions</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="text-xs"
          >
            {showArchived ? "Hide" : "Show"} archived
          </Button>
        </div>
      </div>
    </div>
  );
}
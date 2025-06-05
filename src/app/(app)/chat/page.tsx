"use client";

import { useState, useEffect } from "react";
import { ChatSession, ChatMessage, ChatSessionSummary } from "@/types/chat";
import { chatService } from "@/services/chat-service";
// Removed provider manager import - using API routes instead
import { ChatSessionSidebar } from "@/components/chat/chat-session-sidebar";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatWelcomeScreen } from "@/components/chat/chat-welcome-screen";
import { toast } from "@/hooks/use-toast";

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Subscribe to messages when active session changes
  useEffect(() => {
    if (!activeSession) {
      setMessages([]);
      return;
    }

    // Subscribe to real-time message updates
    const unsubscribe = chatService.subscribeToMessages(activeSession.id, (newMessages) => {
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [activeSession]);

  const loadSessions = async () => {
    try {
      const sessionList = await chatService.listSessions();
      setSessions(sessionList);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load chat sessions",
        variant: "destructive"
      });
    }
  };

  const handleNewSession = async (provider: string = 'claude', model: string = 'claude-3-5-sonnet-20241022') => {
    try {
      setIsLoading(true);
      const newSession = await chatService.createSession(provider, model);
      setSessions(prev => [
        {
          id: newSession.id,
          name: newSession.name,
          lastMessage: '',
          lastUpdated: newSession.lastUpdated,
          messageCount: 0,
          provider: newSession.provider,
          starred: false,
          archived: false
        },
        ...prev
      ]);
      setActiveSession(newSession);
      toast({
        title: "Session Created",
        description: `New ${provider} session started`
      });
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create new session",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionSelect = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const session = await chatService.getSession(sessionId);
      if (session) {
        setActiveSession(session);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: "Error",
        description: "Failed to load session",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string, attachments?: any[]) => {
    if (!activeSession || !content.trim()) return;

    try {
      setIsStreaming(true);
      
      // Send user message
      await chatService.sendMessage(activeSession.id, content, 'user', attachments);
      
      // Send to AI provider via API route
      try {
        // Create conversation context from recent messages
        const recentMessages = messages
          .slice(-10) // Last 10 messages for context
          .map(msg => ({ role: msg.role, content: msg.content }));

        const response = await fetch(`/api/chat/sessions/${activeSession.id}/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            context: recentMessages,
            settings: {
              temperature: activeSession.settings?.temperature || 0.7,
              maxTokens: activeSession.settings?.maxTokens || 2000
            }
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get AI response');
        }

        const result = await response.json();
        
        // The API route should handle saving the assistant response
        // No need to save it here as it's already saved in the API

      } catch (error) {
        console.error('Error getting AI response:', error);
        
        // Send error message to chat
        await chatService.sendMessage(
          activeSession.id,
          `I apologize, but I encountered an error processing your message: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
          'assistant'
        );
        
        toast({
          title: "AI Response Error",
          description: "Failed to get AI response",
          variant: "destructive"
        });
      } finally {
        setIsStreaming(false);
      }

      // Update session in sidebar
      const updatedSessions = sessions.map(s => 
        s.id === activeSession.id 
          ? { ...s, lastMessage: content.slice(0, 100), lastUpdated: new Date(), messageCount: s.messageCount + 1 }
          : s
      );
      setSessions(updatedSessions);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      setIsStreaming(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await chatService.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
      }
      toast({
        title: "Session Deleted",
        description: "Chat session has been deleted"
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive"
      });
    }
  };

  const handleUpdateSession = async (sessionId: string, updates: Partial<ChatSession>) => {
    try {
      await chatService.updateSession(sessionId, updates);
      
      // Update local state
      if (activeSession?.id === sessionId) {
        setActiveSession(prev => prev ? { ...prev, ...updates } : null);
      }
      
      // Update sessions list
      setSessions(prev => prev.map(s => 
        s.id === sessionId 
          ? { ...s, name: updates.name || s.name, starred: updates.metadata?.starred ?? s.starred }
          : s
      ));

      await loadSessions(); // Refresh the list
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Error",
        description: "Failed to update session",
        variant: "destructive"
      });
    }
  };

  const handleBranchSession = async (sessionId: string, fromMessageId?: string) => {
    try {
      const newSession = await chatService.branchSession(sessionId, fromMessageId);
      await loadSessions();
      setActiveSession(newSession);
      toast({
        title: "Session Branched",
        description: "Created a new branch from this conversation"
      });
    } catch (error) {
      console.error('Error branching session:', error);
      toast({
        title: "Error",
        description: "Failed to branch session",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Session sidebar */}
      <ChatSessionSidebar 
        sessions={sessions}
        activeSessionId={activeSession?.id}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onUpdateSession={handleUpdateSession}
        isLoading={isLoading}
      />
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeSession ? (
          <>
            <ChatHeader 
              session={activeSession} 
              onUpdateSession={(updates) => handleUpdateSession(activeSession.id, updates)}
              onBranchSession={() => handleBranchSession(activeSession.id)}
              onDeleteSession={() => handleDeleteSession(activeSession.id)}
            />
            <ChatMessageList 
              messages={messages}
              isStreaming={isStreaming}
              onBranchFromMessage={(messageId) => handleBranchSession(activeSession.id, messageId)}
            />
            <ChatInput 
              onSendMessage={handleSendMessage}
              disabled={isStreaming || isLoading}
              session={activeSession}
            />
          </>
        ) : (
          <ChatWelcomeScreen 
            onNewSession={handleNewSession}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
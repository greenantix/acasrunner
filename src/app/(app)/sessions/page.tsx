
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink, FileJson, FileText, FolderOpen, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ChatSession {
  id: string;
  title: string;
  timestamp: Date;
  summary: string;
  messageCount: number;
  // For simplicity, storing full content. In a real app, this might be fetched on demand.
  content: Array<{ sender: 'user' | 'ai'; text: string }>; 
}

const mockSessions: ChatSession[] = [
  {
    id: "session-1",
    title: "Debugging NullPointerException",
    timestamp: new Date(2024, 6, 20, 10, 30, 0),
    summary: "Discussed common causes of NPEs and reviewed a code snippet. AI suggested using Optional.",
    messageCount: 5,
    content: [
      { sender: "user", text: "I have a NullPointerException, help!" },
      { sender: "ai", text: "Sure, can you show me the code?" },
      { sender: "user", text: "```java\nString x = null;\nSystem.out.println(x.toUpperCase());\n```" },
      { sender: "ai", text: "You are calling toUpperCase on a null string. You should check for null or use Optional." },
      { sender: "user", text: "Thanks!" }
    ]
  },
  {
    id: "session-2",
    title: "React State Management Query",
    timestamp: new Date(2024, 6, 21, 14, 15, 0),
    summary: "Explored options for managing global state in a React application. Compared Context API and Zustand.",
    messageCount: 8,
    content: [
      { sender: "user", text: "What's best for React global state?" },
      { sender: "ai", text: "It depends on complexity. Context API is built-in. Zustand/Redux for larger apps." },
    ]
  },
    {
    id: "session-3",
    title: "Plugin Development Help",
    timestamp: new Date(2024, 6, 22, 9, 0, 0),
    summary: "Asked about creating a custom plugin for leo Runner, focusing on file system access.",
    messageCount: 3,
    content: [
      { sender: "user", text: "How can I make a plugin that reads files?" },
      { sender: "ai", text: "Plugins run in a sandboxed environment for security. Direct file system access might be restricted. Consider using a dedicated service." },
    ]
  },
];

export default function SessionsPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(mockSessions);
  const [sessionToConfirmDelete, setSessionToConfirmDelete] = useState<ChatSession | null>(null);
  const { toast } = useToast();

  const reopenSession = (session: ChatSession) => {
    toast({
      title: "Reopen Session (Mock)",
      description: `Would reopen chat with session: ${session.title}`,
    });
    // In a real app: router.push(`/chat?sessionId=${session.id}`);
  };

  const exportSession = (session: ChatSession, formatType: "markdown" | "json" | "text") => {
    let content = "";
    let fileName = `${session.title.replace(/\s+/g, '_')}_${session.id}.${formatType === 'markdown' ? 'md' : formatType}`;
    let mimeType = "";

    switch (formatType) {
      case "markdown":
        mimeType = "text/markdown";
        content = `# Chat Session: ${session.title}\n\n**Timestamp:** ${format(session.timestamp, "PPP p")}\n**Summary:** ${session.summary}\n\n## Conversation\n\n`;
        session.content.forEach(msg => {
          content += `**${msg.sender === 'user' ? 'User' : 'AI'}:**\n${msg.sender === 'ai' && typeof msg.text === 'string' && (msg.text.includes('```') || msg.text.includes('\n')) ? '```\n' + msg.text + '\n```' : msg.text}\n\n`;
        });
        break;
      case "json":
        mimeType = "application/json";
        content = JSON.stringify(session, null, 2);
        fileName = `${session.title.replace(/\s+/g, '_')}_${session.id}.json`;
        break;
      case "text":
        mimeType = "text/plain";
        content = `Chat Session: ${session.title}\nTimestamp: ${format(session.timestamp, "PPP p")}\nSummary: ${session.summary}\n\nConversation:\n\n`;
        session.content.forEach(msg => {
          content += `${msg.sender === 'user' ? 'User' : 'AI'}:\n${msg.text}\n\n`;
        });
        fileName = `${session.title.replace(/\s+/g, '_')}_${session.id}.txt`;
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Session Exported",
      description: `${session.title} exported as ${formatType.toUpperCase()}.`,
    });
  };

  const handleDeleteConfirmation = (session: ChatSession) => {
    setSessionToConfirmDelete(session);
  };

  const deleteSession = () => {
    if (sessionToConfirmDelete) {
      setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionToConfirmDelete.id));
      toast({
        title: "Session Deleted",
        description: `Session "${sessionToConfirmDelete.title}" has been deleted.`,
      });
      setSessionToConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold font-headline">Chat Session Explorer</h1>
      <CardDescription>View, export, or delete your past chat sessions.</CardDescription>

      {sessions.length === 0 ? (
        <Card className="shadow-lg">
          <CardContent className="p-10 text-center text-muted-foreground">
            No saved sessions yet. Your chat sessions will appear here once saved.
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-15rem)] pr-4"> {/* Adjust height as needed */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()).map((session) => (
              <Card key={session.id} className="shadow-md hover:shadow-lg transition-shadow flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg font-headline truncate" title={session.title}>{session.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {format(session.timestamp, "MMM d, yyyy 'at' h:mm a")} ({session.messageCount} messages)
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground line-clamp-3">{session.summary}</p>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => reopenSession(session)} className="flex-grow sm:flex-grow-0">
                        <FolderOpen className="mr-2 h-4 w-4" /> Reopen
                    </Button>
                    <div className="flex gap-1 justify-end flex-grow sm:flex-grow-0">
                         <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4"/></Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                <DialogTitle>Export Session: {session.title}</DialogTitle>
                                <DialogDescription>
                                    Choose a format to export this chat session.
                                </DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-4">
                                    <Button variant="outline" onClick={() => exportSession(session, "markdown")}><FileText className="mr-2 h-4 w-4" /> Markdown</Button>
                                    <Button variant="outline" onClick={() => exportSession(session, "json")}><FileJson className="mr-2 h-4 w-4" /> JSON</Button>
                                    <Button variant="outline" onClick={() => exportSession(session, "text")}><FileText className="mr-2 h-4 w-4" /> Plain Text</Button>
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="secondary" onClick={() => (document.querySelector('[data-radix-dialog-default-open="true"] [aria-label="Close"]') as HTMLElement)?.click()}>Close</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteConfirmation(session)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {sessionToConfirmDelete && (
        <Dialog open={!!sessionToConfirmDelete} onOpenChange={() => setSessionToConfirmDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the session "{sessionToConfirmDelete.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSessionToConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={deleteSession}>Delete Session</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

    

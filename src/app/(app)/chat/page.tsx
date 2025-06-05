"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BrainCircuit, Download, FileJson, FileText, Save, Send, Trash2, UploadCloud } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { escalateCodingProblem, EscalateCodingProblemInput, EscalateCodingProblemOutput } from "@/ai/flows/escalate-coding-problem";
import { toast } from "@/hooks/use-toast";

const escalationSchema = z.object({
  codingProblemDescription: z.string().min(10, "Please describe the problem in more detail."),
  errorLogs: z.string().optional(),
  fileEdits: z.string().optional(),
});

type EscalationFormValues = z.infer<typeof escalationSchema>;

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
}

export default function ChatPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<EscalateCodingProblemOutput | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const form = useForm<EscalationFormValues>({
    resolver: zodResolver(escalationSchema),
    defaultValues: {
      codingProblemDescription: "",
      errorLogs: "",
      fileEdits: "",
    },
  });

  async function onSubmit(data: EscalationFormValues) {
    setIsLoading(true);
    setAiResponse(null);
    const userInput: EscalateCodingProblemInput = {
      codingProblemDescription: data.codingProblemDescription,
      errorLogs: data.errorLogs || "No error logs provided.",
      fileEdits: data.fileEdits || "No file edits provided.",
    };

    // Add user message to chat
    setChatHistory(prev => [...prev, { 
      id: Date.now().toString(), 
      sender: 'user', 
      content: `Problem: ${data.codingProblemDescription}\nLogs: ${data.errorLogs || 'N/A'}\nEdits: ${data.fileEdits || 'N/A'}`,
      timestamp: new Date().toLocaleTimeString()
    }]);

    try {
      const result = await escalateCodingProblem(userInput);
      setAiResponse(result);
      // Add AI response to chat
      setChatHistory(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        content: result.suggestedSolution,
        timestamp: new Date().toLocaleTimeString()
      }]);
      toast({
        title: "AI Response Received",
        description: "The AI has provided a suggested solution.",
      });
    } catch (error) {
      console.error("Error escalating problem:", error);
      toast({
        title: "Error",
        description: "Failed to get a response from the AI. Please try again.",
        variant: "destructive",
      });
      // Add error message to chat
      setChatHistory(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        content: "Sorry, I encountered an error trying to process your request.",
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold font-headline">AI Escalation & Chat</h1>
      
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline">Describe Your Problem</CardTitle>
            <CardDescription>Provide details for AI assistance.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="codingProblemDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Problem Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the coding challenge you're facing..." {...field} rows={5} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="errorLogs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Error Logs (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Paste relevant error logs here." {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fileEdits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recent File Edits (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe recent changes or paste a diff." {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? "Thinking..." : "Escalate to AI"}
                  <BrainCircuit className="ml-2 h-5 w-5" />
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <Card className="md:col-span-2 shadow-lg">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-xl font-headline">Chat & AI Response</CardTitle>
              <CardDescription>View the conversation and AI suggestions.</CardDescription>
            </div>
            <div className="space-x-2">
              <Button variant="outline" size="sm" onClick={() => toast({ title: "Mock Save", description: "Chat saved (Markdown)"})}><Save className="mr-1 h-4 w-4" /> MD</Button>
              <Button variant="outline" size="sm" onClick={() => toast({ title: "Mock Save", description: "Chat saved (JSON)"})}><FileJson className="mr-1 h-4 w-4" /> JSON</Button>
              <Button variant="outline" size="sm" onClick={() => toast({ title: "Mock Save", description: "Chat saved (TXT)"})}><FileText className="mr-1 h-4 w-4" /> TXT</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-24rem)] border rounded-md p-4 bg-muted/20">
              {chatHistory.length === 0 && (
                <p className="text-muted-foreground text-center py-10">No messages yet. Describe your problem to start.</p>
              )}
              <div className="space-y-4">
                {chatHistory.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-lg shadow ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground'}`}>{msg.timestamp}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                   <div className="flex justify-start">
                    <div className="max-w-[75%] p-3 rounded-lg shadow bg-card animate-pulse">
                      <p className="text-sm">AI is thinking...</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t pt-4 space-x-2">
             <Button variant="outline" size="sm" onClick={() => toast({ title: "Mock Load", description: "Loading previous session..."})}><UploadCloud className="mr-1 h-4 w-4" /> Load Session</Button>
             <Button variant="destructive" size="sm" onClick={() => { setChatHistory([]); setAiResponse(null); toast({title: "Chat Cleared"}); }}><Trash2 className="mr-1 h-4 w-4" /> Clear Chat</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

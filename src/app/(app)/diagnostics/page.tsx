
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Lightbulb, Loader2, Database, Settings, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useStartupStatus } from "@/hooks/use-startup-status";
// Removed direct AI flow import - using API routes instead
interface SuggestCodeFixesOutput {
  explanation?: string;
  suggestedCode: string;
  diff?: string;
  confidenceScore?: number;
}
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface MockError {
  id: string;
  filePath: string;
  lineNumber: number;
  message: string;
  severity: "error" | "warning";
  codeSnippet?: string;
}

const mockErrors: MockError[] = [
  { id: "err-1", filePath: "src/components/UserProfile.tsx", lineNumber: 42, message: "TypeError: Cannot read properties of undefined (reading 'name')", severity: "error", codeSnippet: "const userName = user.profile.name;" },
  { id: "err-2", filePath: "src/utils/api.ts", lineNumber: 101, message: "NetworkError: Failed to fetch data from endpoint.", severity: "error", codeSnippet: "const response = await fetch(API_URL);" },
  { id: "err-3", filePath: "src/app/settings/page.tsx", lineNumber: 78, message: "Unused variable 'config'", severity: "warning", codeSnippet: "const config = getConfig();" },
];

export default function DiagnosticsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestCodeFixesOutput | null>(null);
  const [selectedError, setSelectedError] = useState<MockError | null>(null);
  const startupStatus = useStartupStatus();

  const handleGetAISuggestions = async (error: MockError) => {
    setSelectedError(error);
    setIsLoading(true);
    setAiSuggestions(null);

    try {
      const response = await fetch('/api/ai/suggest-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: error.message,
          fileContext: error.codeSnippet || `Error found in ${error.filePath} at line ${error.lineNumber}. Severity: ${error.severity}.`,
          language: "typescript",
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get AI suggestions');
      }
      
      const result = await response.json();
      setAiSuggestions(result);
      toast({
        title: "AI Suggestions Received",
        description: `Suggestions provided for error in ${error.filePath}.`,
      });
    } catch (e) {
      console.error("Error getting AI suggestions:", e);
      toast({
        title: "Error",
        description: "Failed to get AI suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold font-headline">System Diagnostics</h1>
      <CardDescription>Review system status, detected issues, and get AI-powered suggestions for fixes.</CardDescription>

      {/* Vector Storage Status */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-2">
            <Database className="h-5 w-5" />
            Vector Storage System
          </CardTitle>
          <CardDescription>SQLite-vec embeddings database and services status</CardDescription>
        </CardHeader>
        <CardContent>
          {startupStatus.loading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading system status...</span>
            </div>
          ) : startupStatus.error ? (
            <div className="flex items-center gap-2 py-4 text-destructive">
              <XCircle className="h-4 w-4" />
              <span>Error: {startupStatus.error}</span>
            </div>
          ) : startupStatus.status ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {startupStatus.isInitialized ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    System Status: {startupStatus.isInitialized ? 'Initialized' : 'Not Initialized'}
                  </span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => startupStatus.initialize()}
                  disabled={startupStatus.loading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {startupStatus.isInitialized ? 'Reinitialize' : 'Initialize'}
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(startupStatus.status.services).map(([service, status]) => (
                  <div key={service} className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                    {status ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm capitalize">{service.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>

              {startupStatus.hasErrors && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <h4 className="font-medium text-red-800 mb-2">Initialization Errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {startupStatus.status.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Last updated: {new Date(startupStatus.status.timestamp).toLocaleString()}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline">Detected Issues</CardTitle>
            <CardDescription>List of errors and warnings found in the project.</CardDescription>
          </CardHeader>
          <CardContent>
            {mockErrors.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">No issues detected. Great job!</p>
            ) : (
              <ScrollArea className="h-[calc(100vh-22rem)] pr-3">
                <div className="space-y-4">
                  {mockErrors.map((err) => (
                    <Card key={err.id} className={`p-4 hover:shadow-md transition-shadow ${selectedError?.id === err.id ? 'ring-2 ring-primary' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className={`h-5 w-5 ${err.severity === 'error' ? 'text-destructive' : 'text-yellow-500'}`} />
                            <span className="font-medium">{err.message}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{err.filePath}:{err.lineNumber}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleGetAISuggestions(err)} disabled={isLoading && selectedError?.id === err.id}>
                          {isLoading && selectedError?.id === err.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                          AI Fix
                        </Button>
                      </div>
                      {err.codeSnippet && (
                        <pre className="mt-2 p-2 bg-muted/50 rounded-md text-xs overflow-x-auto">
                          <code>{err.codeSnippet}</code>
                        </pre>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline">AI Suggested Fixes</CardTitle>
            <CardDescription>AI-generated suggestions for the selected issue.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-22rem)]">
              {isLoading && !aiSuggestions && (
                <div className="space-y-3 text-center py-10">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-muted-foreground">AI is analyzing the issue...</p>
                </div>
              )}
              {!isLoading && !aiSuggestions && !selectedError && (
                <p className="text-muted-foreground text-center py-10">Select an issue to see AI suggestions.</p>
              )}
              {!isLoading && !aiSuggestions && selectedError && (
                 <p className="text-muted-foreground text-center py-10">Click "AI Fix" for the selected issue to get suggestions.</p>
              )}
              {aiSuggestions && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-1">Explanation:</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{aiSuggestions.explanation}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Suggested Code:</h3>
                    <Textarea
                      readOnly
                      value={aiSuggestions.suggestedCode}
                      className="font-mono text-xs bg-muted/30 h-48"
                      rows={10}
                    />
                  </div>
                   <Button onClick={() => toast({ title: "Code Applied (Mock)", description: "Suggested code would be applied to the file."})}>
                      Apply Fix (Mock)
                    </Button>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


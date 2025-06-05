
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, PlayCircle, Bot, Sparkles, Loader2 } from "lucide-react";
// Removed direct AI flow import - using API routes instead
interface RealTimeAiTraceInput {
  input: string;
  steps: string[];
  output: string;
  toolsUsed?: string[];
  pluginChain?: string[];
}

interface RealTimeAiTraceOutput {
  trace: string;
}
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const mockTraceInput: RealTimeAiTraceInput = {
  input: "User asked: 'How to fix a NullPointerException in Java?'",
  steps: [
    "[INPUT] Received user query.",
    "[CORE] Identified keywords: 'NullPointerException', 'Java', 'fix'.",
    "[TOOL] Accessed knowledge base for 'NullPointerException'.",
    "[PLUGIN] Consulted 'Java Best Practices' plugin.",
    "[CORE] Formatted response using 'Markdown Output' plugin.",
    "[OUTPUT] Provided solution: To fix a NullPointerException in Java, ensure objects are initialized before use. Check for nulls with if-statements or use Optional. Example: `if (myObject != null) { myObject.doSomething(); }`",
    "[AI] Suggestion: Consider using `Optional.ofNullable(myObject).ifPresent(MyClass::doSomething);` for a more concise approach.",
    "[FAIL] Plugin 'LegacyChecker' failed to load.",
    "[ESC] Escalating complex type inference to senior AI model."
  ],
  output: "To fix a NullPointerException in Java, ensure objects are initialized before use. Check for nulls with if-statements or use Optional. Example: `if (myObject != null) { myObject.doSomething(); }` Consider `Optional.ofNullable()` for more modern Java.",
  toolsUsed: ["Knowledge Base Lookup", "Plugin Executor"],
  pluginChain: ["Java Best Practices v1.2", "Markdown Output v1.0", "LegacyChecker v0.1 (Failed)"],
};

const getStepBadge = (step: string) => {
  const cleanedStep = step.substring(step.indexOf(']') + 2); // Get text after badge

  if (step.startsWith("[PLUGIN]")) return <Badge variant="secondary" className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-400 mr-2">Plugin</Badge>;
  if (step.startsWith("[TOOL]")) return <Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-400 mr-2">Tool</Badge>;
  if (step.startsWith("[AI]")) return <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-400 mr-2">AI</Badge>;
  if (step.startsWith("[FAIL]")) return <Badge variant="destructive" className="mr-2">Failure</Badge>;
  if (step.startsWith("[ESC]")) return <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-400 mr-2">Escalation</Badge>;
  if (step.startsWith("[INPUT]")) return <Badge variant="outline" className="border-foreground/30 mr-2">Input</Badge>;
  if (step.startsWith("[OUTPUT]")) return <Badge variant="outline" className="border-foreground/30 mr-2">Output</Badge>;
  return <Badge variant="outline" className="mr-2">Core</Badge>;
};


export default function AiTracePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [traceOutput, setTraceOutput] = useState<RealTimeAiTraceOutput | null>(null);
  const [currentInput, setCurrentInput] = useState<RealTimeAiTraceInput>(mockTraceInput);

  const handleGenerateTrace = async (inputToUse?: RealTimeAiTraceInput) => {
    setIsLoading(true);
    setTraceOutput(null);
    try {
      const response = await fetch('/api/ai/trace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inputToUse || currentInput),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate trace');
      }
      
      const result = await response.json();
      setTraceOutput(result);
      toast({
        title: "AI Trace Generated",
        description: "The AI's reasoning process has been explained.",
      });
    } catch (error) {
      console.error("Error generating AI trace:", error);
      toast({
        title: "Error",
        description: "Failed to generate AI trace. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExplainChain = async () => {
    setIsLoadingExplanation(true);
    // This is a mock. In a real app, you might call another Genkit flow
    // that takes the currentInput.steps (or the whole currentInput)
    // and generates a more detailed narrative or visual explanation.
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      toast({
        title: "AI Explanation (Mock)",
        description: "The AI would provide a detailed breakdown of this specific chain of events.",
        duration: 5000,
      });
       // Potentially update a part of the UI with this new explanation
    } catch (error) {
        toast({
            title: "Explanation Failed",
            description: "Could not get an AI explanation for this chain.",
            variant: "destructive"
        });
    } finally {
        setIsLoadingExplanation(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold font-headline">Real-time AI Trace</h1>
      
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="shadow-lg md:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl font-headline">AI Decision Log Input</CardTitle>
            <CardDescription>Provide the AI system's internal data to generate a human-readable trace. (Mock data used below)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="trace-input-json">Trace Input (JSON format)</Label>
              <Textarea 
                id="trace-input-json"
                rows={10}
                value={JSON.stringify(currentInput, null, 2)}
                onChange={(e) => {
                  try {
                    const parsedInput = JSON.parse(e.target.value);
                    // Basic validation for key fields
                    if (parsedInput && typeof parsedInput.input === 'string' && Array.isArray(parsedInput.steps) && typeof parsedInput.output === 'string') {
                       setCurrentInput(parsedInput);
                    } else {
                       toast({title: "Invalid JSON Structure", description: "Input must contain 'input', 'steps', and 'output'.", variant: "destructive"})
                    }
                  } catch (err) {
                    toast({title: "Invalid JSON", description: "Please ensure the input is valid JSON.", variant: "destructive"})
                    console.warn("Invalid JSON for trace input");
                  }
                }}
                className="font-mono text-sm bg-muted/30 h-64" 
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => handleGenerateTrace()} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-5 w-5" />}
              {isLoading ? "Generating Trace..." : "Generate AI Explanation"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="text-xl font-headline flex items-center">
                        <Lightbulb className="mr-2 h-6 w-6 text-primary" /> Explained AI Trace
                    </CardTitle>
                    <CardDescription>Understand how the AI arrived at its conclusion based on the input log.</CardDescription>
                </div>
                <Button onClick={handleExplainChain} disabled={isLoadingExplanation || !traceOutput} variant="outline">
                  {isLoadingExplanation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5 text-primary" />}
                  {isLoadingExplanation ? "Thinking..." : "Explain This Chain with AI"}
                </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-24rem)] border rounded-md p-4 bg-muted/20">
              {isLoading && (
                <div className="space-y-3 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5 mt-4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              {!isLoading && !traceOutput && (
                <p className="text-muted-foreground text-center py-10">Click "Generate AI Explanation" to see the human-readable trace.</p>
              )}
              {traceOutput && (
                <div className="space-y-3">
                    <div>
                        <h3 className="font-semibold text-sm mb-2">Summary Explanation:</h3>
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground bg-background/50 p-3 rounded-md">
                            {traceOutput.trace}
                        </pre>
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm mb-2 mt-4">Detailed Steps:</h3>
                        <div className="space-y-2">
                        {currentInput.steps.map((step, index) => (
                            <div key={index} className="flex items-start p-2 rounded-md bg-card text-xs">
                                {getStepBadge(step)}
                                <span className="flex-1 whitespace-pre-wrap">{step.substring(step.indexOf(']') + 2)}</span>
                            </div>
                        ))}
                        </div>
                    </div>
                    {currentInput.toolsUsed && currentInput.toolsUsed.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-sm mb-1 mt-4">Tools Used:</h3>
                            <div className="flex flex-wrap gap-2">
                                {currentInput.toolsUsed.map(tool => <Badge key={tool} variant="secondary">{tool}</Badge>)}
                            </div>
                        </div>
                    )}
                    {currentInput.pluginChain && currentInput.pluginChain.length > 0 && (
                         <div>
                            <h3 className="font-semibold text-sm mb-1 mt-4">Plugin Chain:</h3>
                            <div className="flex flex-wrap gap-2">
                                {currentInput.pluginChain.map(plugin => <Badge key={plugin} variant="outline">{plugin}</Badge>)}
                            </div>
                        </div>
                    )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

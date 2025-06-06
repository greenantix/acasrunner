
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RefreshCw, Play, Filter, FileText, BarChartBig } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface TestResult {
  id: string;
  name: string;
  status: "passed" | "failed" | "skipped";
  duration: number; // in ms
  pluginName: string;
  details?: string;
}

const mockTestResults: TestResult[] = [
  { id: "test-1", name: "Plugin 'Code Formatter' - Basic Formatting", status: "passed", duration: 150, pluginName: "Code Formatter" },
  { id: "test-2", name: "Plugin 'Code Formatter' - Edge Cases", status: "passed", duration: 250, pluginName: "Code Formatter" },
  { id: "test-3", name: "Plugin 'Error Explainer' - NullPointerException", status: "failed", duration: 300, pluginName: "Error Explainer", details: "Expected 'Optional.ofNullable' suggestion, got 'if (x != null)'." },
  { id: "test-4", name: "Plugin 'Error Explainer' - NetworkError", status: "passed", duration: 180, pluginName: "Error Explainer" },
  { id: "test-5", name: "Plugin 'Test Generator' - Simple Function", status: "skipped", duration: 0, pluginName: "Test Generator", details: "Test environment not configured for this plugin." },
  { id: "test-6", name: "Plugin 'Dependency Analyzer' - Check Major Updates", status: "passed", duration: 1200, pluginName: "Dependency Analyzer" },
  { id: "test-7", name: "Plugin 'Dependency Analyzer' - Vulnerability Scan", status: "failed", duration: 2500, pluginName: "Dependency Analyzer", details: "CVE-2024-XXXX found in 'some-lib@1.0.2'" },
];

const TestStatusBadge: React.FC<{ status: TestResult["status"] }> = ({ status }) => {
  switch (status) {
    case "passed":
      return <Badge className="bg-green-500 hover:bg-green-600 text-white"><CheckCircle2 className="mr-1 h-3 w-3" /> Passed</Badge>;
    case "failed":
      return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Failed</Badge>;
    case "skipped":
      return <Badge variant="secondary"><FileText className="mr-1 h-3 w-3" /> Skipped</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export default function TestsPage() {
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [progress, setProgress] = useState(0);

  const runAllTests = () => {
    setIsRunningTests(true);
    setProgress(0);
    toast({ title: "Running All Tests (Mock)", description: "Test execution started..." });

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      if (currentProgress <= 100) {
        setProgress(currentProgress);
      } else {
        clearInterval(interval);
        setIsRunningTests(false);
        toast({ title: "Tests Completed (Mock)", description: "All plugin tests have finished." });
      }
    }, 300);
  };
  
  const passedCount = mockTestResults.filter(t => t.status === 'passed').length;
  const failedCount = mockTestResults.filter(t => t.status === 'failed').length;
  const skippedCount = mockTestResults.filter(t => t.status === 'skipped').length;
  const totalTests = mockTestResults.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-semibold font-headline">Plugin Test Suite</h1>
            <CardDescription>Monitor the health and functionality of your installed plugins.</CardDescription>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => toast({title: "Filter Clicked (Mock)"})}>
                <Filter className="mr-2 h-4 w-4"/> Filter Tests
            </Button>
            <Button onClick={runAllTests} disabled={isRunningTests}>
                {isRunningTests ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                {isRunningTests ? `Running... (${progress}%)` : "Run All Tests"}
            </Button>
        </div>
      </div>

      {isRunningTests && (
        <Card className="shadow-md">
            <CardContent className="p-4">
                 <Progress value={progress} className="w-full h-3" />
            </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-headline">Test Results</CardTitle>
                <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600 dark:text-green-400 font-medium">{passedCount} Passed</span>
                    <span className="text-red-600 dark:text-red-400 font-medium">{failedCount} Failed</span>
                    <span className="text-muted-foreground">{skippedCount} Skipped</span>
                    <span>Total: {totalTests}</span>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-24rem)] pr-3">
            {mockTestResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">No tests run yet. Click "Run All Tests" to begin.</p>
            ) : (
              <div className="space-y-3">
                {mockTestResults.map((test) => (
                  <Card key={test.id} className="p-3 bg-card hover:shadow-sm transition-shadow">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                      <div className="flex-grow mb-2 sm:mb-0">
                        <p className="font-medium text-foreground">{test.name}</p>
                        <p className="text-xs text-muted-foreground">Plugin: {test.pluginName} | Duration: {test.duration}ms</p>
                      </div>
                      <div className="flex-shrink-0">
                        <TestStatusBadge status={test.status} />
                      </div>
                    </div>
                    {test.details && (
                      <p className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">{test.details}</p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => toast({title: "View Report (Mock)", description: "A detailed test report would be generated."})}>
                <BarChartBig className="mr-2 h-4 w-4" /> View Full Report
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


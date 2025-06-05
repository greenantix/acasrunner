
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Zap, Cog, PlusCircle, Edit3, Trash2, Network, ChevronRight, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import Image from "next/image";

interface OrchestrationStep {
  id: string;
  name: string;
  type: "trigger" | "action" | "condition" | "loop" | "ai_flow";
  icon: React.ElementType;
  description: string;
  params?: Record<string, any>;
  children?: OrchestrationStep[]; // For nested steps like conditions or loops
}

const mockOrchestrations: { id: string; name: string; description: string; steps: OrchestrationStep[], isActive: boolean }[] = [
  {
    id: "orch-1",
    name: "Automated Code Review Workflow",
    description: "Runs on every pull request to master branch. Lints, tests, and asks AI for improvement suggestions.",
    isActive: true,
    steps: [
      { id: "s1-1", name: "PR Trigger", type: "trigger", icon: Play, description: "Activates on new Pull Request to 'master'" },
      { id: "s1-2", name: "Lint Code", type: "action", icon: Cog, description: "Runs ESLint & Prettier" },
      { id: "s1-3", name: "Run Unit Tests", type: "action", icon: Cog, description: "Executes 'npm test'" },
      { 
        id: "s1-4", 
        name: "If Tests Pass", 
        type: "condition", 
        icon: ChevronRight, 
        description: "Checks if all unit tests succeeded",
        children: [
            { id: "s1-4-1", name: "Call 'Suggest Code Fixes' AI Flow", type: "ai_flow", icon: Zap, description: "Sends diff to AI for suggestions" },
            { id: "s1-4-2", name: "Post AI Suggestions as PR Comment", type: "action", icon: Cog, description: "Uses GitHub API" }
        ]
      },
       { 
        id: "s1-5", 
        name: "If Tests Fail", 
        type: "condition", 
        icon: ChevronRight, 
        description: "Checks if any unit tests failed",
        children: [
            { id: "s1-5-1", name: "Notify Team Channel", type: "action", icon: Cog, description: "Sends message to Slack #dev-alerts" }
        ]
      }
    ]
  },
  {
    id: "orch-2",
    name: "Daily Readme Update",
    description: "Generates a new README.md summary every morning using AI.",
    isActive: false,
    steps: [
      { id: "s2-1", name: "Scheduled Trigger (Daily 9 AM)", type: "trigger", icon: Play, description: "Runs every day at 9:00 AM" },
      { id: "s2-2", name: "Call 'Generate Documentation' AI Flow", type: "ai_flow", icon: Zap, description: "Asks AI to summarize recent changes" },
      { id: "s2-3", name: "Commit README.md", type: "action", icon: Cog, description: "Commits the updated README.md to the repository" }
    ]
  }
];


const StepCard: React.FC<{ step: OrchestrationStep; level?: number }> = ({ step, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = step.children && step.children.length > 0;

  return (
    <Card className={`mb-2 bg-card/80 shadow-sm ml-${level * 4}`}>
      <CardHeader className="p-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <step.icon className="h-5 w-5 text-primary" />
          <span className="font-medium">{step.name}</span>
          <Badge variant="outline" className="text-xs">{step.type.replace('_', ' ').toUpperCase()}</Badge>
        </div>
        {hasChildren && (
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="h-7 w-7">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-xs text-muted-foreground">{step.description}</p>
        {/* Mock params display */}
        {step.params && Object.keys(step.params).length > 0 && (
            <div className="mt-1 text-xs">
                <strong>Params: </strong> 
                {Object.entries(step.params).map(([key, value]) => `${key}: ${value}`).join(', ')}
            </div>
        )}
      </CardContent>
      {hasChildren && isOpen && (
        <div className="p-3 border-t">
          {step.children?.map(childStep => <StepCard key={childStep.id} step={childStep} level={level + 1} />)}
        </div>
      )}
    </Card>
  );
};

export default function OrchestrationPage() {

  const handleCreateOrchestration = () => {
    toast({ title: "Create New Orchestration (Mock)", description: "This would open an editor to build a new workflow." });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-semibold font-headline">Workflow Orchestration</h1>
            <CardDescription>Define, manage, and monitor automated multi-step workflows involving AI and project tasks.</CardDescription>
        </div>
        <Button onClick={handleCreateOrchestration}>
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Orchestration
        </Button>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-6">
        {mockOrchestrations.map(orch => (
          <Card key={orch.id} className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-headline flex items-center gap-2">
                    <Network className="h-6 w-6 text-primary" /> {orch.name}
                  </CardTitle>
                  <CardDescription>{orch.description}</CardDescription>
                </div>
                <Badge variant={orch.isActive ? "default" : "secondary"}>{orch.isActive ? "Active" : "Inactive"}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">Steps:</h4>
              <ScrollArea className="h-[200px] p-1 border rounded-md bg-muted/30">
                {orch.steps.map(step => <StepCard key={step.id} step={step} />)}
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t pt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => toast({title: "Run History (Mock)"})}>Run History</Button>
                <Button variant="outline" size="sm" onClick={() => toast({title: "Edit Orchestration (Mock)"})}><Edit3 className="mr-1 h-4 w-4"/> Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => toast({title: "Delete Orchestration (Mock)"})}><Trash2 className="mr-1 h-4 w-4"/> Delete</Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-xl font-headline">Visual Workflow Builder (Conceptual)</CardTitle>
            <CardDescription>A conceptual placeholder for a drag-and-drop workflow editor.</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground p-8">
            <Image src="https://placehold.co/600x300.png?text=Drag+and+Drop+Workflow+Editor" alt="Workflow Editor Placeholder" width={600} height={300} className="mx-auto rounded-md shadow-md" data-ai-hint="diagram flowchart" />
            <p className="mt-4">Imagine a canvas here where you can connect triggers, actions, AI flows, and conditions visually.</p>
        </CardContent>
      </Card>
    </div>
  );
}

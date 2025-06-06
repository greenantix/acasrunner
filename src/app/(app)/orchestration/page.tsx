
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Zap, Cog, PlusCircle, Edit3, Trash2, Network, ChevronRight, ChevronDown, Clock, Activity, GitBranch, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import Image from "next/image";
import { Workflow } from "@/types/workflow";
import { workflowService } from "@/services/orchestration/workflow-service";

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
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const workflowList = await workflowService.listWorkflows();
      setWorkflows(workflowList);
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast({
        title: "Error",
        description: "Failed to load workflows",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOrchestration = () => {
    // Navigate to workflow builder
    window.location.href = '/orchestration/builder';
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      await workflowService.deleteWorkflow(workflowId);
      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
      toast({
        title: "Workflow Deleted",
        description: "Workflow has been successfully deleted"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete workflow",
        variant: "destructive"
      });
    }
  };

  const handleToggleWorkflow = async (workflowId: string, enabled: boolean) => {
    try {
      await workflowService.updateWorkflow(workflowId, { enabled: !enabled });
      setWorkflows(prev => prev.map(w => 
        w.id === workflowId ? { ...w, enabled: !enabled } : w
      ));
      toast({
        title: enabled ? "Workflow Disabled" : "Workflow Enabled",
        description: `Workflow has been ${enabled ? 'disabled' : 'enabled'}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update workflow",
        variant: "destructive"
      });
    }
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
      
      {isLoading ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <Card key={i} className="shadow-lg">
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <Card className="shadow-lg">
          <CardContent className="text-center py-12">
            <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Workflows Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first workflow to automate complex multi-step processes.
            </p>
            <Button onClick={handleCreateOrchestration}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Your First Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {workflows.map(workflow => (
            <Card key={workflow.id} className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-headline flex items-center gap-2">
                      <Network className="h-6 w-6 text-primary" /> 
                      {workflow.name}
                    </CardTitle>
                    <CardDescription>{workflow.description}</CardDescription>
                  </div>
                  <Badge variant={workflow.enabled ? "default" : "secondary"}>
                    {workflow.enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {workflow.metadata.executions} runs
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {(workflow.metadata.successRate * 100).toFixed(1)}% success
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {workflow.steps.length} Steps • {workflow.triggers.length} Triggers
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {workflow.metadata.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {workflow.metadata.lastRun && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Last run: {workflow.metadata.lastRun.toLocaleDateString()}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <div className="flex gap-2">
                  <Button
                    variant={workflow.enabled ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleToggleWorkflow(workflow.id, workflow.enabled)}
                  >
                    {workflow.enabled ? "Disable" : "Enable"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Link href={`/orchestration/builder?id=${workflow.id}`}>
                    <Button variant="outline" size="sm">
                      <Edit3 className="mr-1 h-4 w-4"/> Edit
                    </Button>
                  </Link>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4"/> Delete
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

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


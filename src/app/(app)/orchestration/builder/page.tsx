"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Save, 
  Play, 
  ArrowLeft, 
  Plus, 
  FileText, 
  Bot, 
  GitBranch, 
  Bell, 
  Terminal,
  Zap,
  Clock,
  Activity,
  Trash2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { Workflow, WorkflowStep, WorkflowTrigger } from "@/types/workflow";
import { workflowService } from "@/services/orchestration/workflow-service";

interface ActionTemplate {
  id: string;
  name: string;
  type: string;
  category: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const actionTemplates: ActionTemplate[] = [
  {
    id: "file-read",
    name: "Read File",
    type: "file.read",
    category: "File Operations",
    icon: FileText,
    description: "Read content from a file",
    color: "bg-blue-500"
  },
  {
    id: "file-write",
    name: "Write File",
    type: "file.write",
    category: "File Operations",
    icon: FileText,
    description: "Write content to a file",
    color: "bg-blue-500"
  },
  {
    id: "ai-analyze",
    name: "AI Analysis",
    type: "ai.analyze",
    category: "AI Operations",
    icon: Bot,
    description: "Analyze content using AI",
    color: "bg-purple-500"
  },
  {
    id: "git-commit",
    name: "Git Commit",
    type: "git.commit",
    category: "Git Operations",
    icon: GitBranch,
    description: "Commit changes to git",
    color: "bg-green-500"
  },
  {
    id: "notify",
    name: "Send Notification",
    type: "notification.send",
    category: "Notifications",
    icon: Bell,
    description: "Send a notification",
    color: "bg-orange-500"
  },
  {
    id: "shell",
    name: "Shell Command",
    type: "shell.execute",
    category: "System",
    icon: Terminal,
    description: "Execute a shell command",
    color: "bg-red-500"
  }
];

const triggerTemplates = [
  {
    id: "file-change",
    name: "File Change",
    type: "file_change",
    icon: FileText,
    description: "Trigger when files change",
    color: "bg-blue-500"
  },
  {
    id: "schedule",
    name: "Schedule",
    type: "schedule",
    icon: Clock,
    description: "Trigger on a schedule",
    color: "bg-green-500"
  },
  {
    id: "activity",
    name: "Activity",
    type: "activity",
    icon: Activity,
    description: "Trigger on activity events",
    color: "bg-purple-500"
  }
];

export default function WorkflowBuilderPage() {
  const [workflow, setWorkflow] = useState<Partial<Workflow>>({
    name: "",
    description: "",
    enabled: true,
    steps: [],
    triggers: [],
    variables: [],
    settings: {
      timeout: 300000, // 5 minutes
      maxRetries: 3,
      concurrency: 1,
      logLevel: "info",
      notifications: {
        onSuccess: false,
        onFailure: true,
        channels: ["console"]
      }
    },
    metadata: {
      executions: 0,
      averageRuntime: 0,
      successRate: 0,
      tags: []
    }
  });
  
  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveWorkflow = async () => {
    if (!workflow.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Workflow name is required",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const workflowData = {
        ...workflow,
        version: "1.0",
        author: "current_user" // TODO: Get from auth
      } as Omit<Workflow, 'id' | 'created' | 'updated'>;

      await workflowService.createWorkflow(workflowData);
      
      toast({
        title: "Workflow Saved",
        description: "Your workflow has been saved successfully"
      });
      
      // Navigate back to orchestration page
      window.location.href = '/orchestration';
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save workflow",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddStep = (template: ActionTemplate) => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      name: template.name,
      type: "action",
      action: {
        type: template.type,
        provider: template.category.toLowerCase().replace(/\s+/g, '-'),
        parameters: {},
        parameterSchema: {}
      },
      position: { x: 100, y: 100 + (workflow.steps?.length || 0) * 100 },
      connections: {
        inputs: [],
        outputs: []
      },
      config: {}
    };

    setWorkflow(prev => ({
      ...prev,
      steps: [...(prev.steps || []), newStep]
    }));

    setSelectedStep(newStep);
  };

  const handleAddTrigger = (template: any) => {
    const newTrigger: WorkflowTrigger = {
      id: `trigger_${Date.now()}`,
      type: template.type as any,
      config: {},
      enabled: true
    };

    setWorkflow(prev => ({
      ...prev,
      triggers: [...(prev.triggers || []), newTrigger]
    }));
  };

  const handleRemoveStep = (stepId: string) => {
    setWorkflow(prev => ({
      ...prev,
      steps: (prev.steps || []).filter(s => s.id !== stepId)
    }));
    setSelectedStep(null);
  };

  const handleRemoveTrigger = (triggerId: string) => {
    setWorkflow(prev => ({
      ...prev,
      triggers: (prev.triggers || []).filter(t => t.id !== triggerId)
    }));
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b p-4 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/orchestration">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold">Workflow Builder</h1>
              <p className="text-sm text-muted-foreground">
                Create and configure automated workflows
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Play className="h-4 w-4 mr-2" />
              Test Run
            </Button>
            <Button onClick={handleSaveWorkflow} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Workflow"}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Sidebar - Action Library */}
        <div className="w-80 border-r bg-background">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Action Library</h3>
            
            <div className="space-y-4">
              {/* Action Templates */}
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Actions</h4>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {actionTemplates.map(template => (
                      <Card 
                        key={template.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleAddStep(template)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-md ${template.color} text-white`}>
                              <template.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm">{template.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {template.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              {/* Trigger Templates */}
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Triggers</h4>
                <div className="space-y-2">
                  {triggerTemplates.map(template => (
                    <Card 
                      key={template.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleAddTrigger(template)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-md ${template.color} text-white`}>
                            <template.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">{template.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {template.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Workflow Configuration */}
          <div className="p-4 border-b">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="workflow-name">Workflow Name</Label>
                <Input
                  id="workflow-name"
                  value={workflow.name || ""}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter workflow name"
                />
              </div>
              <div>
                <Label htmlFor="workflow-description">Description</Label>
                <Input
                  id="workflow-description"
                  value={workflow.description || ""}
                  onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter workflow description"
                />
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex">
            {/* Workflow Canvas */}
            <div className="flex-1 p-4 bg-muted/20">
              <div className="h-full bg-white rounded-lg border-2 border-dashed border-muted relative overflow-hidden">
                {/* Triggers */}
                {workflow.triggers && workflow.triggers.length > 0 && (
                  <div className="absolute top-4 left-4">
                    <h4 className="text-sm font-medium mb-2">Triggers</h4>
                    <div className="space-y-2">
                      {workflow.triggers.map(trigger => (
                        <div key={trigger.id} className="flex items-center gap-2 p-2 bg-green-100 rounded-md">
                          <Zap className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">{trigger.type}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTrigger(trigger.id)}
                            className="h-6 w-6 p-0 ml-auto"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Steps */}
                {workflow.steps && workflow.steps.length > 0 ? (
                  <div className="absolute top-20 left-4 right-4">
                    <h4 className="text-sm font-medium mb-2">Workflow Steps</h4>
                    <div className="space-y-3">
                      {workflow.steps.map((step, index) => (
                        <div 
                          key={step.id} 
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedStep?.id === step.id 
                              ? 'border-primary bg-primary/10' 
                              : 'border-muted hover:border-muted-foreground/50'
                          }`}
                          onClick={() => setSelectedStep(step)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-xs">
                                {index + 1}
                              </Badge>
                              <div>
                                <p className="font-medium text-sm">{step.name}</p>
                                <p className="text-xs text-muted-foreground">{step.action.type}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveStep(step.id);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium mb-2">Empty Workflow Canvas</p>
                      <p className="text-sm">
                        Drag actions from the sidebar to build your workflow
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Step Configuration */}
            {selectedStep && (
              <div className="w-80 border-l bg-background p-4">
                <h3 className="font-semibold mb-4">Step Configuration</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="step-name">Step Name</Label>
                    <Input
                      id="step-name"
                      value={selectedStep.name}
                      onChange={(e) => {
                        const updatedStep = { ...selectedStep, name: e.target.value };
                        setSelectedStep(updatedStep);
                        setWorkflow(prev => ({
                          ...prev,
                          steps: (prev.steps || []).map(s => 
                            s.id === selectedStep.id ? updatedStep : s
                          )
                        }));
                      }}
                    />
                  </div>

                  <div>
                    <Label>Action Type</Label>
                    <Badge variant="outline" className="mt-1">
                      {selectedStep.action.type}
                    </Badge>
                  </div>

                  <Separator />

                  <div>
                    <Label>Parameters</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Configure action-specific parameters here
                    </p>
                    <Textarea
                      className="mt-2"
                      placeholder="Parameters configuration (JSON format)"
                      rows={6}
                      value={JSON.stringify(selectedStep.action.parameters, null, 2)}
                      onChange={(e) => {
                        try {
                          const parameters = JSON.parse(e.target.value);
                          const updatedStep = {
                            ...selectedStep,
                            action: { ...selectedStep.action, parameters }
                          };
                          setSelectedStep(updatedStep);
                          setWorkflow(prev => ({
                            ...prev,
                            steps: (prev.steps || []).map(s => 
                              s.id === selectedStep.id ? updatedStep : s
                            )
                          }));
                        } catch (error) {
                          // Invalid JSON, don't update
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
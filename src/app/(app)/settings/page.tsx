
"use client";

import { useEffect, useState } from "react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
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
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, HelpCircle, Loader2, RefreshCw, Wifi, WifiOff, XCircle } from "lucide-react";

const llmSettingsSchema = z.object({
  provider: z.enum(["claude", "gpt", "ollama", "lmstudio"]),
  model: z.string().min(1, "Model name is required."),
  apiKey: z.string().optional(),
  baseUrl: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
  temperature: z.coerce.number().min(0).max(1).optional(),
});

type LlmSettingsFormValues = z.infer<typeof llmSettingsSchema>;

type ProviderStatus = "online" | "offline" | "checking" | "unknown";

interface ProviderState {
  status: ProviderStatus;
  name: string;
  defaultUrl?: string;
}

export default function SettingsPage() {
  const [providerStatuses, setProviderStatuses] = useState<Record<string, ProviderState>>({
    ollama: { status: "unknown", name: "Ollama" , defaultUrl: "http://localhost:11434"},
    lmstudio: { status: "unknown", name: "LM Studio", defaultUrl: "http://localhost:1234" },
  });

  const form = useForm<LlmSettingsFormValues>({
    resolver: zodResolver(llmSettingsSchema),
    defaultValues: {
      provider: "gpt",
      model: "gpt-4-turbo",
      temperature: 0.7,
      baseUrl: "",
      apiKey: "",
    },
  });

  const watchedBaseUrl = form.watch("baseUrl");
  const watchedProvider = form.watch("provider");

  const checkProviderStatus = async (providerKey: "ollama" | "lmstudio") => {
    setProviderStatuses(prev => ({ ...prev, [providerKey]: { ...prev[providerKey], status: "checking" } }));
    let urlToCheck = providerStatuses[providerKey].defaultUrl;
    if (watchedProvider === providerKey && watchedBaseUrl) {
        urlToCheck = watchedBaseUrl;
    }

    if (!urlToCheck) {
        setProviderStatuses(prev => ({ ...prev, [providerKey]: { ...prev[providerKey], status: "offline" } }));
        return;
    }
    
    try {
      // For local services, a simple fetch to a known endpoint (often / or /api/version) can work.
      // LM Studio usually has a UI, not a simple health endpoint by default in its API.
      // A generic check might involve trying to list models or a version check if available.
      // For this prototype, we'll assume any 2xx response means it's up.
      const response = await fetch(urlToCheck, { method: 'GET', mode: 'cors' }); // Added mode cors for local fetches
      if (response.ok) {
        setProviderStatuses(prev => ({ ...prev, [providerKey]: { ...prev[providerKey], status: "online" } }));
      } else {
        setProviderStatuses(prev => ({ ...prev, [providerKey]: { ...prev[providerKey], status: "offline" } }));
      }
    } catch (error) {
      setProviderStatuses(prev => ({ ...prev, [providerKey]: { ...prev[providerKey], status: "offline" } }));
    }
  };

  useEffect(() => {
    checkProviderStatus("ollama");
    checkProviderStatus("lmstudio");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  async function onSubmit(data: LlmSettingsFormValues) {
    console.log("LLM Settings Saved:", data);
    toast({
      title: "Settings Saved",
      description: "LLM configurations have been updated.",
    });
  }

  const testConnection = async (provider: LlmSettingsFormValues["provider"], currentData: LlmSettingsFormValues) => {
    toast({ title: `Testing ${provider}...`});
    let urlToTest = currentData.baseUrl;
    let isLocal = false;

    if (provider === "ollama") {
        urlToTest = currentData.baseUrl || providerStatuses.ollama.defaultUrl;
        isLocal = true;
    } else if (provider === "lmstudio") {
        urlToTest = currentData.baseUrl || providerStatuses.lmstudio.defaultUrl;
        isLocal = true;
    } else if (provider === "gpt" && !currentData.apiKey) {
        toast({ title: "Test Failed", description: "API Key required for GPT.", variant: "destructive"});
        return;
    } else if (provider === "claude" && !currentData.apiKey) {
        toast({ title: "Test Failed", description: "API Key required for Claude.", variant: "destructive"});
        return;
    }

    try {
        if (isLocal && urlToTest) {
            const response = await fetch(urlToTest, { method: 'GET', mode: 'cors' });
            if (response.ok) {
                toast({ title: "Connection Successful!", description: `${providerStatuses[provider as "ollama" | "lmstudio"].name} is responsive at ${urlToTest}.`, icon: <CheckCircle className="h-5 w-5 text-green-500" /> });
            } else {
                toast({ title: "Connection Failed", description: `${providerStatuses[provider as "ollama" | "lmstudio"].name} did not respond as expected at ${urlToTest}. Status: ${response.status}`, variant: "destructive", icon: <XCircle className="h-5 w-5 text-red-500" /> });
            }
        } else if (!isLocal) {
            // Mock API call for cloud providers
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast({ title: "Connection Successful (Mock)", description: `Successfully connected to ${provider} (mocked).`, icon: <CheckCircle className="h-5 w-5 text-green-500" /> });
        } else if (isLocal && !urlToTest) {
             toast({ title: "Test Failed", description: `Base URL for ${provider} is not set.`, variant: "destructive"});
        }
    } catch (error) {
        toast({ title: "Connection Error", description: `Could not connect to ${provider} at ${urlToTest}. Check console for details.`, variant: "destructive", icon: <XCircle className="h-5 w-5 text-red-500" /> });
        console.error(`Error testing ${provider}:`, error);
    }
  };
  
  const handlePresetChange = (value: string) => {
    switch(value) {
      case "debug":
        toast({ title: "Debug Mode Preset Activated", description: "All active plugins loaded, verbose trace enabled. (Mocked)" });
        // form.setValue("temperature", 0.2); // Example of actual change
        break;
      case "code":
        toast({ title: "Code Mode Preset Activated", description: "Syntax-aware tools prioritized, chat fluff disabled. (Mocked)" });
        break;
      case "fastlocal":
        toast({ title: "Fast Local Preset Activated", description: "Attempting to select local provider. (Mocked)" });
        const lmStudioOnline = providerStatuses.lmstudio.status === 'online';
        const ollamaOnline = providerStatuses.ollama.status === 'online';
        if (lmStudioOnline) {
          form.setValue("provider", "lmstudio");
          toast({ description: "Switched to LM Studio." });
        } else if (ollamaOnline) {
          form.setValue("provider", "ollama");
          toast({ description: "Switched to Ollama." });
        } else {
          toast({ description: "No local providers seem to be online. Please check their status." });
        }
        break;
    }
  };

  const renderStatusIcon = (status: ProviderStatus) => {
    switch (status) {
      case "online": return <TooltipProvider><Tooltip><TooltipTrigger asChild><Wifi className="h-5 w-5 text-green-500" /></TooltipTrigger><TooltipContent>Online</TooltipContent></Tooltip></TooltipProvider>;
      case "offline": return <TooltipProvider><Tooltip><TooltipTrigger asChild><WifiOff className="h-5 w-5 text-red-500" /></TooltipTrigger><TooltipContent>Offline</TooltipContent></Tooltip></TooltipProvider>;
      case "checking": return <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />;
      default: return <HelpCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <TooltipProvider>
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold font-headline">Settings</h1>
      
      <ThemeSwitcher />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">LLM Configuration</CardTitle>
          <CardDescription>Manage settings for your AI models. Local provider statuses are auto-detected.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI Provider</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gpt">GPT (OpenAI)</SelectItem>
                        <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                        <SelectItem value="ollama">
                          <div className="flex items-center gap-2">
                            Ollama (Local) {renderStatusIcon(providerStatuses.ollama.status)}
                          </div>
                        </SelectItem>
                        <SelectItem value="lmstudio">
                           <div className="flex items-center gap-2">
                            LM Studio (Local) {renderStatusIcon(providerStatuses.lmstudio.status)}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., gpt-4-turbo, claude-3-opus-20240229, llama3" {...field} />
                    </FormControl>
                    <FormDescription>Specify the model to use for this provider.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <FormLabel className="flex items-center gap-1">API Key (Optional) <HelpCircle className="w-3 h-3 text-muted-foreground" /></FormLabel>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Enter your API key if required by the provider (e.g., OpenAI, Anthropic).</p>
                            <p className="text-xs text-muted-foreground">Example: sk-xxxxxxxxxxxxxxxxxxxx</p>
                        </TooltipContent>
                    </Tooltip>
                    <FormControl>
                      <Input type="password" placeholder="Enter API Key if required" {...field} />
                    </FormControl>
                    <FormDescription>Only required for cloud-based providers.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="baseUrl"
                render={({ field }) => (
                  <FormItem>
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <FormLabel className="flex items-center gap-1">Base URL (Optional for Local/Custom) <HelpCircle className="w-3 h-3 text-muted-foreground" /></FormLabel>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>For local providers like Ollama or LM Studio, or custom OpenAI-compatible endpoints.</p>
                            <p className="text-xs text-muted-foreground">Ollama default: http://localhost:11434</p>
                            <p className="text-xs text-muted-foreground">LM Studio default: http://localhost:1234</p>
                        </TooltipContent>
                    </Tooltip>
                    <FormControl>
                      <Input placeholder="e.g., http://localhost:11434" {...field} />
                    </FormControl>
                     <FormDescription>Specify if using a self-hosted or custom endpoint.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <FormLabel className="flex items-center gap-1">Temperature (0.0 - 1.0) <HelpCircle className="w-3 h-3 text-muted-foreground" /></FormLabel>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Controls randomness in the AI's responses. Lower values (e.g., 0.2) make the output more focused and deterministic. Higher values (e.g., 0.8) make it more creative and random.</p>
                            <p className="text-xs text-muted-foreground">Default is usually 0.7.</p>
                        </TooltipContent>
                    </Tooltip>
                    <FormControl>
                      {/* Use Controller for stricter type control with coerce */}
                      <Controller
                        name="temperature"
                        control={form.control}
                        render={({ field: { onChange, ...restField } }) => (
                            <Input 
                                type="number" 
                                step="0.1" 
                                min="0" 
                                max="1" 
                                placeholder="e.g., 0.7" 
                                {...restField}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow empty string or convert to number
                                    onChange(value === "" ? undefined : parseFloat(value));
                                }}
                                value={restField.value === undefined ? "" : String(restField.value)}
                            />
                        )}
                        />
                    </FormControl>
                    <FormDescription>Controls randomness. Lower is more deterministic.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => testConnection(form.getValues("provider"), form.getValues())}>
                  Test Connection
                </Button>
                {(watchedProvider === "ollama" || watchedProvider === "lmstudio") && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => checkProviderStatus(watchedProvider as "ollama" | "lmstudio")}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Re-check Status
                    </Button>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
              <Button type="submit">Save LLM Settings</Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Smart Presets</CardTitle>
          <CardDescription>Quickly configure settings for common scenarios.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a preset..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="debug">Debug Mode</SelectItem>
              <SelectItem value="code">Code Mode</SelectItem>
              <SelectItem value="fastlocal">Fast Local Mode</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-2">Applying a preset may change some of the settings above (mocked).</p>
        </CardContent>
      </Card>

    </div>
    </TooltipProvider>
  );
}

    
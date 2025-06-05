"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Zap, 
  Brain, 
  GitBranch, 
  Download,
  Sparkles,
  Bot,
  User,
  FileText
} from "lucide-react";

interface ChatWelcomeScreenProps {
  onNewSession: (provider?: string, model?: string) => void;
  isLoading?: boolean;
}

export function ChatWelcomeScreen({ onNewSession, isLoading = false }: ChatWelcomeScreenProps) {
  const providers = [
    {
      id: 'claude',
      name: 'Claude',
      model: 'claude-3-5-sonnet-20241022',
      icon: '🤖',
      description: 'Advanced reasoning and coding assistance',
      strengths: ['Coding', 'Analysis', 'Long conversations'],
      color: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
    },
    {
      id: 'openai',
      name: 'OpenAI GPT-4',
      model: 'gpt-4',
      icon: '🧠',
      description: 'General-purpose AI with strong creative abilities',
      strengths: ['Creative writing', 'Problem solving', 'Versatility'],
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      model: 'gemini-pro',
      icon: '💎',
      description: 'Google\'s powerful multimodal AI',
      strengths: ['Multimodal', 'Research', 'Fast responses'],
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    }
  ];

  const features = [
    {
      icon: <MessageCircle className="h-5 w-5" />,
      title: "Real-time Conversations",
      description: "Stream responses as they're generated"
    },
    {
      icon: <GitBranch className="h-5 w-5" />,
      title: "Branch Conversations",
      description: "Create multiple conversation paths"
    },
    {
      icon: <Download className="h-5 w-5" />,
      title: "Export Sessions",
      description: "Save in multiple formats (MD, JSON, HTML, PDF)"
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Context Integration",
      description: "Automatically include activity and file context"
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: "Multiple AI Providers",
      description: "Switch between Claude, GPT-4, and Gemini"
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "File Attachments",
      description: "Upload and discuss files with AI"
    }
  ];

  const examplePrompts = [
    "Help me debug this JavaScript function",
    "Explain the concept of React hooks",
    "Review my code for potential improvements",
    "Create a project structure for a web app",
    "Write tests for my API endpoints",
    "Generate documentation for my code"
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full mr-4">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">AI Chat Assistant</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start a conversation with advanced AI models. Get help with coding, analysis, writing, and more.
          </p>
        </div>

        {/* Provider Selection */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Sparkles className="h-5 w-5 mr-2" />
            Choose Your AI Assistant
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {providers.map((provider) => (
              <Card 
                key={provider.id}
                className={`cursor-pointer transition-all duration-200 ${provider.color}`}
                onClick={() => onNewSession(provider.id, provider.model)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{provider.icon}</span>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {provider.model.includes('claude') ? 'Sonnet' : 
                       provider.model.includes('gpt') ? 'GPT-4' : 'Pro'}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {provider.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Best for:</p>
                    <div className="flex flex-wrap gap-1">
                      {provider.strengths.map((strength) => (
                        <Badge key={strength} variant="secondary" className="text-xs">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <Card key={index} className="border-muted">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-primary/10 rounded-md">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Example Prompts */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Example Prompts</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {examplePrompts.map((prompt, index) => (
              <Card 
                key={index}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  onNewSession('claude', 'claude-3-5-sonnet-20241022');
                  // TODO: Pre-fill the input with this prompt
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{prompt}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Start */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Ready to get started?</h3>
              <p className="text-muted-foreground mb-4">
                Click on any AI provider above to create a new session, or use the button below for the default experience.
              </p>
              <Button 
                onClick={() => onNewSession('claude', 'claude-3-5-sonnet-20241022')} 
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>Creating session...</>
                ) : (
                  <>
                    <Bot className="h-4 w-4 mr-2" />
                    Start with Claude
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p className="mb-2">💡 <strong>Pro tips:</strong></p>
          <div className="grid md:grid-cols-2 gap-2 max-w-2xl mx-auto">
            <p>• Use <code>/</code> to access chat commands</p>
            <p>• Upload files by clicking the paperclip icon</p>
            <p>• Branch conversations to explore different paths</p>
            <p>• Export your conversations for future reference</p>
          </div>
        </div>
      </div>
    </div>
  );
}
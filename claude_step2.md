# Claude-Step2.md - AI Escalation System Implementation

## Current State
The system mentions AI escalation in mock activities but has no real AI integration for automatic problem detection and escalation. The Genkit AI integration exists but is not connected to the monitoring system.

## Implementation Goals

### 1. Error Detection and Analysis
**Location**: `src/services/ai-escalation.ts`

Create an intelligent system that:
- Automatically detects coding problems from activity monitor
- Analyzes error patterns and severity
- Determines when human intervention is needed
- Routes problems to appropriate AI models
- Provides context-aware suggestions

### 2. Multi-LLM Provider Support
**Location**: `src/services/llm-providers/`

Implement support for:
- **Claude** (Anthropic) - Primary for code analysis
- **GPT** (OpenAI) - Alternative for different perspectives  
- **Local Ollama** models - For privacy-sensitive operations
- **Gemini** (existing via Genkit) - Already partially implemented

### 3. Contextual Problem Analysis
**Location**: `src/services/context-analyzer.ts`

Build system to:
- Gather relevant context around detected problems
- Include file contents, git history, recent changes
- Analyze project structure and dependencies
- Create comprehensive problem reports for AI analysis

### 4. AI Decision Engine
**Location**: `src/services/ai-decision-engine.ts`

Implement logic for:
- Problem severity assessment
- AI model selection based on problem type
- Escalation triggers and thresholds
- Human handoff decision making

## Technical Requirements

### AI Provider Configuration
```typescript
interface LLMProvider {
  name: string;
  type: 'claude' | 'openai' | 'ollama' | 'gemini';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  specialties: ('code_review' | 'debugging' | 'optimization' | 'documentation')[];
}

interface EscalationRule {
  id: string;
  name: string;
  triggers: {
    errorTypes: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    frequency: number; // errors per time period
    keywords: string[];
  };
  actions: {
    provider: string;
    prompt: string;
    includeContext: boolean;
    notifyHuman: boolean;
  };
}
```

### AI Integration Flow
1. **Problem Detection**: Activity monitor detects error/issue
2. **Context Gathering**: Collect relevant files, logs, git history
3. **Severity Analysis**: Determine problem severity and type
4. **Provider Selection**: Choose best AI model for the problem
5. **AI Analysis**: Send problem + context to selected AI
6. **Solution Generation**: AI provides analysis and suggestions
7. **Human Notification**: Alert user with AI recommendations
8. **Solution Tracking**: Track resolution success/failure

### Settings UI Integration
**Location**: `src/app/(app)/settings/llm-settings.tsx`

Create interface for:
- Adding/configuring LLM providers
- Setting up escalation rules
- Testing AI connections
- Viewing escalation history
- Adjusting AI behavior parameters

## Implementation Components

### 1. Error Pattern Recognition
```typescript
// src/services/error-patterns.ts
export class ErrorPatternAnalyzer {
  analyzeError(error: string, context: string[]): {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    suggestedProvider: string;
  }
}
```

### 2. Context Collection
```typescript
// src/services/context-collector.ts
export class ContextCollector {
  async gatherContext(filePath: string, errorLocation?: number): Promise<{
    fileContent: string;
    recentChanges: string[];
    relatedFiles: string[];
    projectStructure: any;
    dependencies: string[];
  }>
}
```

### 3. AI Communication Layer
```typescript
// src/services/ai-communicator.ts
export class AICommunicator {
  async sendToProvider(
    provider: LLMProvider,
    prompt: string,
    context: any
  ): Promise<{
    response: string;
    suggestions: string[];
    confidence: number;
    followUpQuestions?: string[];
  }>
}
```

### 4. Escalation Manager
```typescript
// src/services/escalation-manager.ts
export class EscalationManager {
  async processEvent(event: ActivityEvent): Promise<void>;
  async escalateToAI(problem: Problem, rule: EscalationRule): Promise<void>;
  async notifyHuman(escalation: Escalation): Promise<void>;
}
```

## Database Schema Extensions

### Escalation Events
```typescript
interface EscalationEvent {
  id: string;
  activityEventId: string;
  timestamp: Date;
  problemType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  provider: string;
  prompt: string;
  context: any;
  aiResponse: string;
  suggestions: string[];
  status: 'pending' | 'resolved' | 'escalated_to_human' | 'ignored';
  humanFeedback?: string;
  resolutionTime?: Date;
}
```

## API Endpoints

### AI Configuration
- `GET /api/llm-providers` - List configured providers
- `POST /api/llm-providers` - Add new provider
- `PUT /api/llm-providers/:id` - Update provider
- `DELETE /api/llm-providers/:id` - Remove provider
- `POST /api/llm-providers/:id/test` - Test provider connection

### Escalation Management
- `GET /api/escalations` - List recent escalations
- `POST /api/escalations/:id/resolve` - Mark escalation as resolved
- `POST /api/escalations/:id/feedback` - Provide human feedback
- `GET /api/escalations/stats` - Escalation statistics

## Implementation Priority

1. **Critical**: Basic error detection and Claude integration
2. **High**: Context collection and problem analysis
3. **High**: Settings UI for LLM configuration
4. **Medium**: Multi-provider support (OpenAI, Ollama)
5. **Medium**: Advanced escalation rules
6. **Low**: Analytics and optimization features

## Success Criteria

- System automatically detects errors and sends them to AI
- AI provides meaningful suggestions for common coding problems
- Users can configure which AI providers to use for different scenarios
- Escalation history is tracked and can be reviewed
- False positive rate is kept below 20%
- Average time from problem detection to AI suggestion is under 30 seconds

## Integration Points

- **Activity Monitor** (Step 1): Receives problems from activity stream
- **Plugin System** (Step 3): Plugins can trigger escalations
- **Chat System** (Step 4): AI suggestions can be sent to chat interface
- **Orchestration** (Step 5): Escalations can trigger workflows

## Files to Create/Modify

- `src/services/ai-escalation.ts` (new)
- `src/services/llm-providers/` (new directory)
- `src/services/context-analyzer.ts` (new)
- `src/services/ai-decision-engine.ts` (new)
- `src/app/(app)/settings/page.tsx` (modify)
- `src/ai/flows/analyze-problem.ts` (new)
- Environment variables for API keys

## Next Step
After implementing the AI escalation system, proceed to **Claude-Step3.md** for Plugin System implementation.
# Claude-Step4.md - Chat Session Management Implementation

## Current State
The chat interface exists as a basic placeholder. We need to implement a full-featured chat system that integrates with AI providers, manages conversation history, supports multiple formats, and provides export functionality.

## Implementation Goals

### 1. Advanced Chat Interface
**Location**: `src/app/(app)/chat/page.tsx`

Implement a modern chat UI with:
- Real-time message streaming
- Message threading and context management
- Code syntax highlighting in messages
- File attachment support
- Message reactions and annotations
- Search and filtering capabilities
- Multiple conversation tabs

### 2. Session Management System
**Location**: `src/services/chat-session.ts`

Create robust session handling:
- Automatic session creation and management
- Session persistence across browser restarts
- Session branching (fork conversations)
- Session merging and comparison
- Session templates and presets
- Collaborative sessions (future)

### 3. Multi-format Export System
**Location**: `src/services/export-service.ts`

Support export to:
- **Markdown** - Clean, readable format for documentation
- **JSON** - Complete data structure with metadata
- **Plaintext** - Simple text format
- **HTML** - Rich format with styling
- **PDF** - Professional document format
- **Word Document** - Business-ready format

### 4. AI Integration Layer
**Location**: `src/services/chat-ai-integration.ts`

Connect chat system with:
- All configured LLM providers
- Context injection from activity monitor
- Plugin command execution within chat
- AI escalation results display
- Smart context management

## Technical Requirements

### Chat Data Models
```typescript
// src/types/chat.ts
export interface ChatSession {
  id: string;
  name: string;
  created: Date;
  lastUpdated: Date;
  provider: string; // 'claude', 'openai', 'gemini', etc.
  model: string;
  settings: ChatSettings;
  messages: ChatMessage[];
  metadata: {
    messageCount: number;
    totalTokens?: number;
    tags: string[];
    starred: boolean;
    archived: boolean;
  };
  parentSessionId?: string; // For branched conversations
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata: {
    tokens?: number;
    model?: string;
    processing_time?: number;
    attachments?: ChatAttachment[];
    reactions?: ChatReaction[];
    edits?: ChatEdit[];
  };
  context?: {
    activityEvents?: string[]; // References to activity events
    pluginCommands?: string[]; // Plugin commands executed
    files?: string[]; // Referenced files
  };
}

export interface ChatSettings {
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
  autoContext: boolean; // Automatically include recent activity
  contextWindow: number; // How many previous messages to include
}

export interface ChatAttachment {
  id: string;
  type: 'file' | 'image' | 'code' | 'activity_log';
  name: string;
  size: number;
  content: string | Buffer;
  mimeType: string;
}
```

### Chat Service Architecture
```typescript
// src/services/chat-service.ts
export class ChatService {
  async createSession(provider: string, settings?: Partial<ChatSettings>): Promise<ChatSession>;
  async getSession(sessionId: string): Promise<ChatSession>;
  async updateSession(sessionId: string, updates: Partial<ChatSession>): Promise<void>;
  async deleteSession(sessionId: string): Promise<void>;
  async listSessions(filters?: SessionFilters): Promise<ChatSession[]>;
  
  // Message operations
  async sendMessage(sessionId: string, content: string, attachments?: ChatAttachment[]): Promise<ChatMessage>;
  async streamMessage(sessionId: string, content: string): Promise<ReadableStream<string>>;
  async editMessage(messageId: string, newContent: string): Promise<void>;
  async deleteMessage(messageId: string): Promise<void>;
  
  // Session operations
  async branchSession(sessionId: string, fromMessageId?: string): Promise<ChatSession>;
  async mergeSession(sourceId: string, targetId: string): Promise<void>;
  async duplicateSession(sessionId: string): Promise<ChatSession>;
}
```

### Export Service Implementation
```typescript
// src/services/export-service.ts
export class ExportService {
  async exportToMarkdown(sessionId: string, options?: MarkdownExportOptions): Promise<string>;
  async exportToJSON(sessionId: string, includeMetadata?: boolean): Promise<string>;
  async exportToHTML(sessionId: string, options?: HTMLExportOptions): Promise<string>;
  async exportToPDF(sessionId: string, options?: PDFExportOptions): Promise<Buffer>;
  async exportToPlaintext(sessionId: string): Promise<string>;
  async exportToDocx(sessionId: string, options?: DocxExportOptions): Promise<Buffer>;
  
  // Bulk export
  async exportMultipleSessions(sessionIds: string[], format: ExportFormat): Promise<Buffer>;
}

export interface MarkdownExportOptions {
  includeMetadata: boolean;
  includeTimestamps: boolean;
  codeBlockLanguage: string;
  headerLevel: number;
}
```

## Chat UI Components

### 1. Main Chat Interface
```typescript
// src/app/(app)/chat/page.tsx
export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  
  return (
    <div className="flex h-full">
      {/* Session sidebar */}
      <ChatSessionSidebar 
        sessions={sessions}
        activeSessionId={activeSession?.id}
        onSessionSelect={setActiveSession}
        onNewSession={handleNewSession}
      />
      
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {activeSession ? (
          <>
            <ChatHeader session={activeSession} />
            <ChatMessageList 
              messages={messages}
              isStreaming={isStreaming}
            />
            <ChatInput 
              onSendMessage={handleSendMessage}
              disabled={isStreaming}
              session={activeSession}
            />
          </>
        ) : (
          <ChatWelcomeScreen onNewSession={handleNewSession} />
        )}
      </div>
    </div>
  );
}
```

### 2. Advanced Message Input
```typescript
// src/components/chat/chat-input.tsx
export function ChatInput({ onSendMessage, disabled, session }) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [showCommands, setShowCommands] = useState(false);
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    // Command autocomplete
    if (message.startsWith('/')) {
      setShowCommands(true);
    }
  };
  
  return (
    <div className="border-t p-4">
      {/* File attachments */}
      {attachments.length > 0 && (
        <AttachmentPreview 
          attachments={attachments}
          onRemove={removeAttachment}
        />
      )}
      
      {/* Command suggestions */}
      {showCommands && (
        <CommandSuggestions 
          query={message.slice(1)}
          onSelect={handleCommandSelect}
        />
      )}
      
      <div className="flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (/ for commands)"
          disabled={disabled}
          className="flex-1"
        />
        <div className="flex flex-col gap-2">
          <AttachmentButton onAttach={handleAttachment} />
          <Button onClick={handleSend} disabled={disabled || !message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 3. Export Dialog
```typescript
// src/components/chat/export-dialog.tsx
export function ExportDialog({ session, isOpen, onClose }) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [options, setOptions] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportService.export(session.id, format, options);
      downloadFile(result, `${session.name}.${format}`);
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Conversation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Format selection */}
          <div>
            <Label>Export Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectItem value="markdown">Markdown (.md)</SelectItem>
              <SelectItem value="json">JSON (.json)</SelectItem>
              <SelectItem value="html">HTML (.html)</SelectItem>
              <SelectItem value="pdf">PDF (.pdf)</SelectItem>
              <SelectItem value="plaintext">Plain Text (.txt)</SelectItem>
              <SelectItem value="docx">Word Document (.docx)</SelectItem>
            </Select>
          </div>
          
          {/* Format-specific options */}
          <ExportOptions format={format} options={options} onChange={setOptions} />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

## Chat Commands System

### Built-in Commands
```typescript
// src/services/chat-commands.ts
export const BUILT_IN_COMMANDS = [
  {
    name: '/clear',
    description: 'Clear the current conversation',
    handler: async (session: ChatSession) => {
      await chatService.clearMessages(session.id);
    }
  },
  {
    name: '/export',
    description: 'Export conversation to file',
    handler: async (session: ChatSession, format?: string) => {
      // Open export dialog
    }
  },
  {
    name: '/branch',
    description: 'Create a new branch from this conversation',
    handler: async (session: ChatSession, messageId?: string) => {
      return await chatService.branchSession(session.id, messageId);
    }
  },
  {
    name: '/context',
    description: 'Add recent activity context to conversation',
    handler: async (session: ChatSession, timeframe?: string) => {
      const activities = await activityService.getRecent(timeframe);
      return formatActivitiesForChat(activities);
    }
  },
  {
    name: '/plugin',
    description: 'Execute a plugin command',
    handler: async (session: ChatSession, pluginCommand: string, ...args: string[]) => {
      return await pluginSystem.executeCommand(pluginCommand, args);
    }
  }
];
```

## Database Schema

### Chat Tables
```sql
-- Chat sessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  settings JSONB NOT NULL,
  metadata JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  parent_session_id UUID REFERENCES chat_sessions(id)
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  context JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat attachments table
CREATE TABLE chat_attachments (
  id UUID PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  content BYTEA,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Session Management
- `GET /api/chat/sessions` - List user's chat sessions
- `POST /api/chat/sessions` - Create new chat session
- `GET /api/chat/sessions/:id` - Get specific session
- `PUT /api/chat/sessions/:id` - Update session
- `DELETE /api/chat/sessions/:id` - Delete session
- `POST /api/chat/sessions/:id/branch` - Branch session
- `POST /api/chat/sessions/:id/duplicate` - Duplicate session

### Messaging
- `GET /api/chat/sessions/:id/messages` - Get session messages
- `POST /api/chat/sessions/:id/messages` - Send new message
- `GET /api/chat/sessions/:id/stream` - Server-sent events for streaming
- `PUT /api/chat/messages/:id` - Edit message
- `DELETE /api/chat/messages/:id` - Delete message

### Export
- `POST /api/chat/sessions/:id/export` - Export session
- `POST /api/chat/export/bulk` - Bulk export multiple sessions

## Integration Features

### Activity Context Integration
- Automatically include recent errors in chat context
- Reference specific activity events in conversations
- Plugin events become chat context
- File changes can be discussed in context

### AI Provider Integration
- Seamless switching between Claude, GPT, Gemini
- Provider-specific optimizations
- Fallback mechanisms for provider failures
- Cost tracking per provider

### Plugin Integration
- Plugins can register chat commands
- Plugin results displayed in chat
- Chat can trigger plugin actions
- Plugin configuration via chat commands

## Implementation Priority

1. **Critical**: Basic chat interface and messaging
2. **Critical**: Session management and persistence
3. **High**: Real-time streaming and AI integration
4. **High**: Export functionality (at least Markdown and JSON)
5. **Medium**: Advanced features (branching, commands)
6. **Medium**: File attachments and rich content
7. **Low**: Collaborative features
8. **Low**: Advanced export formats (PDF, DOCX)

## Success Criteria

- Users can have fluid conversations with AI providers
- Chat history is reliably saved and restored
- Export functionality works for all major formats
- Context from activity monitor enhances conversations
- Plugin commands work seamlessly within chat
- Performance remains smooth with large conversation histories
- Search and filtering help users find specific conversations

## Integration Points

- **Activity Monitor** (Step 1): Provides context for chat
- **AI Escalation** (Step 2): Escalation results appear in chat
- **Plugin System** (Step 3): Plugins add chat commands
- **Orchestration** (Step 5): Workflows can use chat for notifications

## Files to Create/Modify

- `src/app/(app)/chat/page.tsx` (major rewrite)
- `src/services/chat-service.ts` (new)
- `src/services/export-service.ts` (new)
- `src/services/chat-ai-integration.ts` (new)
- `src/services/chat-commands.ts` (new)
- `src/components/chat/` (new directory)
- `src/types/chat.ts` (new)
- `src/api/chat/` (new API routes)
- Database migration scripts

## Next Step
After implementing the chat session management, proceed to **Claude-Step5.md** for Workflow Orchestration system implementation.
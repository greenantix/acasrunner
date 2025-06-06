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

export interface ChatReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  timestamp: Date;
}

export interface ChatEdit {
  id: string;
  messageId: string;
  originalContent: string;
  newContent: string;
  timestamp: Date;
  reason?: string;
}

export interface SessionFilters {
  provider?: string;
  model?: string;
  starred?: boolean;
  archived?: boolean;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

export type ExportFormat = 'markdown' | 'json' | 'html' | 'pdf' | 'plaintext' | 'docx';

export interface MarkdownExportOptions {
  includeMetadata: boolean;
  includeTimestamps: boolean;
  codeBlockLanguage: string;
  headerLevel: number;
}

export interface HTMLExportOptions {
  includeCSS: boolean;
  darkMode: boolean;
  includeMetadata: boolean;
}

export interface PDFExportOptions {
  pageSize: 'A4' | 'Letter' | 'Legal';
  margin: number;
  includeMetadata: boolean;
  headerFooter: boolean;
}

export interface DocxExportOptions {
  fontSize: number;
  fontFamily: string;
  includeMetadata: boolean;
  pageMargin: number;
}

export interface ChatCommand {
  name: string;
  description: string;
  usage: string;
  parameters?: ChatCommandParameter[];
  handler: (session: ChatSession, ...args: string[]) => Promise<string | ChatMessage | void>;
}

export interface ChatCommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'file';
  required: boolean;
  description: string;
  default?: any;
}

export interface StreamingResponse {
  id: string;
  content: string;
  done: boolean;
  metadata?: {
    tokens?: number;
    model?: string;
  };
}

export interface ChatSessionSummary {
  id: string;
  name: string;
  lastMessage: string;
  lastUpdated: Date;
  messageCount: number;
  provider: string;
  starred: boolean;
  archived: boolean;
}

export interface ChatSearchResult {
  sessionId: string;
  sessionName: string;
  messageId: string;
  messageContent: string;
  timestamp: Date;
  relevanceScore: number;
}

export interface ChatSessionTemplate {
  id: string;
  name: string;
  description: string;
  provider: string;
  model: string;
  settings: ChatSettings;
  initialMessages: Omit<ChatMessage, 'id' | 'sessionId' | 'timestamp'>[];
  tags: string[];
}

export interface ChatMetrics {
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  averageSessionLength: number;
  mostUsedProvider: string;
  dailyUsage: Array<{
    date: Date;
    sessions: number;
    messages: number;
    tokens: number;
  }>;
  providerUsage: Array<{
    provider: string;
    sessions: number;
    messages: number;
    tokens: number;
  }>;
}

export interface ChatContextItem {
  type: 'activity' | 'file' | 'plugin' | 'escalation';
  id: string;
  title: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ChatStreamEvent {
  type: 'message_start' | 'message_delta' | 'message_stop' | 'error';
  data: any;
}

// Event types for real-time updates
export interface ChatEvents {
  'session:created': ChatSession;
  'session:updated': ChatSession;
  'session:deleted': { sessionId: string };
  'message:added': ChatMessage;
  'message:updated': ChatMessage;
  'message:deleted': { messageId: string; sessionId: string };
  'typing:start': { sessionId: string; userId: string };
  'typing:stop': { sessionId: string; userId: string };
}

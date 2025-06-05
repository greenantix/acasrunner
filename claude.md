# ACAS Runner - Claude Implementation Guide

## Project Overview
ACAS Runner (AI Coding Assistant Supervisor) is an AI-powered developer workflow automation system built with Next.js, TypeScript, and Firebase. It provides real-time activity monitoring, AI escalation, plugin extensibility, chat integration, and workflow orchestration.

## Quick Start
1. Follow the implementation steps in order (step1.md → step5.md)
2. Each step builds upon the previous one
3. Test each step before proceeding to the next

## Available Tools & Technologies

### Core Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Firebase Firestore
- **Real-time**: WebSockets + Server-Sent Events
- **AI Integration**: Genkit with multiple LLM providers

### Pre-installed Dependencies
```json
{
  "ui-components": "@radix-ui/* + shadcn/ui",
  "ai-integration": "@genkit-ai/googleai + @genkit-ai/next",
  "file-monitoring": "chokidar",
  "real-time": "ws",
  "database": "firebase",
  "forms": "react-hook-form + @hookform/resolvers + zod",
  "charts": "recharts",
  "theming": "next-themes",
  "date-handling": "date-fns",
  "state-management": "@tanstack/react-query"
}
```

### Available Scripts
```bash
# Development
npm run dev              # Start development server (port 9002)
npm run dev:ai           # Start with AI services (Genkit)
npm run genkit:dev       # Start Genkit development server

# Production
npm run build            # Build for production
npm run start            # Start production server

# Quality
npm run lint             # ESLint checking
npm run lint:fix         # Fix ESLint issues
npm run format           # Prettier formatting
npm run typecheck        # TypeScript checking
npm run test             # Jest testing
npm run test:e2e         # Playwright E2E tests

# Utilities
npm run clean            # Clean build artifacts
npm run claude:setup     # Setup project for Claude
npm run generate:docs    # Generate documentation
```

## Implementation Steps (Execute in Order)

### Step 1: Real Activity Monitor
**File**: `claude_step1.md`
**Status**: ✅ Completed by Claude Code
**Focus**: File system monitoring, error detection, real-time activity stream

### Step 2: AI Escalation System  
**File**: `claude_step2.md`
**Status**: ✅ Completed by Claude Code
**Focus**: Multi-LLM provider support, automatic problem detection, context-aware AI analysis

### Step 3: Plugin System
**File**: `claude_step3.md`
**Status**: ✅ Completed by Claude Code
**Focus**: Plugin architecture, drag-and-drop installation, plugin API framework

### Step 4: Chat Session Management
**File**: `claude_step4.md`
**Status**: ⏳ Next Priority
**Focus**: Advanced chat interface, session persistence, multi-format export, AI integration

### Step 5: Workflow Orchestration
**File**: `claude_step5.md`
**Status**: ⏳ Needs Implementation
**Focus**: Visual workflow builder, trigger system, action library, execution engine

### Step 6+: Additional Features
**Status**: 📝 To Be Created
**See**: Additional implementation steps below

## Current Issues to Address

### 1. Theme Switching Not Working
**Problem**: Themes defined in layout.tsx but not applying correctly
**Solution**: 
- Check CSS custom properties in globals.css
- Ensure theme classes are defined in tailwind.config.ts
- Verify ThemeProvider configuration

### 2. Data Persistence Issues
**Problem**: LLM data not saving in dev mode, Firestore integration incomplete
**Solution**:
- Complete Firebase configuration in `src/lib/firebase.ts`
- Implement Firestore collections for activity, escalations, chat, workflows
- Add proper error handling for Firebase operations

### 3. Logo Integration
**Assets**: `public/logo.png` available but not used
**Solution**:
- Update `src/components/layout/logo.tsx` to use actual logo
- Add favicon.ico generation from logo
- Update metadata in layout.tsx

### 4. VS Code Integration
**Future Goal**: Plugin for direct IDE integration
**Planning**: Custom VS Code extension to communicate with ACAS Runner

## Recommended Implementation Order

### Phase 1: Complete Core Features (Current Priority)
1. **Fix Theme System** - Resolve CSS/theme switching
2. **Complete Firestore Integration** - Data persistence
3. **Implement Step 4** - Chat session management
4. **Implement Step 5** - Workflow orchestration

### Phase 2: Enhancement Features
5. **Create Step 6** - Advanced Analytics Dashboard
6. **Create Step 7** - Team Collaboration Features
7. **Create Step 8** - VS Code Extension
8. **Create Step 9** - Mobile/Progressive Web App
9. **Create Step 10** - Enterprise Features

## File Structure Reference

### Core Application
```
src/
├── app/                 # Next.js App Router
│   ├── (app)/          # Main application routes
│   │   ├── dashboard/   # Activity monitoring dashboard
│   │   ├── chat/        # Chat interface
│   │   ├── plugins/     # Plugin management
│   │   ├── orchestration/ # Workflow builder
│   │   └── settings/    # Configuration
│   └── api/            # API routes
├── components/         # React components
│   ├── ui/            # shadcn/ui components
│   └── layout/        # Layout components
├── services/          # Business logic
├── lib/              # Utilities
├── hooks/            # Custom React hooks
└── types/            # TypeScript definitions
```

### Plugin System
```
plugins/
├── examples/          # Example plugins
├── installed/         # User-installed plugins
├── core/             # Built-in plugins
└── disabled/         # Disabled plugins
```

### Configuration Files
```
├── firebase.json       # Firebase configuration
├── firestore.rules    # Firestore security rules
├── components.json    # shadcn/ui configuration
├── tailwind.config.ts # Tailwind CSS configuration
└── tsconfig.json      # TypeScript configuration
```

## Development Workflow

### 1. Start Development Environment
```bash
cd D:\AI\acas-runner-local
npm run dev:ai  # Starts both Next.js and Genkit
```

### 2. Access Applications
- **Main App**: http://localhost:9002
- **Genkit Dev UI**: http://localhost:4000 (if running)

### 3. Development Best Practices
- Follow TypeScript strict mode
- Use ESLint and Prettier for code quality
- Write tests for critical functionality
- Use conventional commits for version control

### 4. Testing Strategy
```bash
npm run test        # Unit tests with Jest
npm run test:e2e    # E2E tests with Playwright
npm run lint        # Code quality checks
npm run typecheck   # TypeScript validation
```

## API Integration

### Available AI Providers
```typescript
// Configured in src/services/llm-providers/
interface LLMProvider {
  claude: "Anthropic Claude (primary)"
  openai: "OpenAI GPT models"
  gemini: "Google Gemini (via Genkit)"
  ollama: "Local Ollama models (future)"
}
```

### Firebase Services
```typescript
// Available via src/lib/firebase.ts
interface FirebaseServices {
  firestore: "Document database"
  auth: "User authentication"
  storage: "File storage"
  hosting: "Static hosting"
}
```

## Environment Variables
Create `.env.local` with:
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# AI Provider API Keys
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=

# Development
NODE_ENV=development
```

## Key Integration Points

### Activity Monitor → AI Escalation
- File changes trigger analysis
- Error patterns trigger AI responses
- Activity context enhances AI accuracy

### AI Escalation → Chat System
- AI suggestions appear in chat
- Chat can trigger AI analysis
- Context flows between systems

### Plugin System → All Components
- Plugins extend all system capabilities
- Plugin events feed activity monitor
- Plugins can trigger workflows

### Workflow Orchestration → Everything
- Workflows automate repetitive tasks
- Can include AI analysis steps
- Integrates with all other systems

## Success Metrics

### Performance Targets
- **Activity Detection**: < 100ms response time
- **AI Escalation**: < 30s end-to-end
- **Chat Response**: < 5s for AI responses
- **Workflow Execution**: Variable based on complexity

### Quality Metrics
- **False Positive Rate**: < 20% for AI escalations
- **Plugin Load Time**: < 2s per plugin
- **Theme Switch**: < 200ms visual response
- **Data Persistence**: 99.9% reliability

## Next Steps for Claude

1. **Immediate**: Review and implement Step 4 (Chat Session Management)
2. **Short-term**: Complete Step 5 (Workflow Orchestration)
3. **Medium-term**: Create Steps 6-10 for advanced features
4. **Long-term**: VS Code extension and enterprise features

## Support & Resources

### Documentation
- Implementation steps: `claude_step1.md` through `claude_step5.md`
- Project structure: This file (`claude.md`)
- Component docs: `src/components/*/README.md` (create as needed)

### External Dependencies
- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Genkit Documentation](https://firebase.google.com/docs/genkit)

### Development Tools
- **VS Code**: Recommended IDE with TypeScript extensions
- **Claude Code**: AI-powered development assistant
- **Browser DevTools**: For debugging and performance analysis

Remember: Each step builds upon the previous ones. Complete them in order for best results!

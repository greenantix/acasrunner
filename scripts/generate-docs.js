#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('📝 Generating documentation for leo Runner...');

// Documentation generator for leo Runner
class DocumentationGenerator {
  constructor() {
    this.projectRoot = process.cwd();
    this.outputDir = path.join('docs', 'claude-generated');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  // Generate API documentation from TypeScript files
  generateApiDocs() {
    console.log('📊 Generating API documentation...');
    
    const apiFiles = this.findFiles('src', /\.(ts|tsx)$/);
    const apiDocs = {
      timestamp: new Date().toISOString(),
      endpoints: [],
      components: [],
      types: [],
      services: []
    };

    apiFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Extract API routes
      if (content.includes('export') && (content.includes('GET') || content.includes('POST'))) {
        apiDocs.endpoints.push({
          file: file.replace(this.projectRoot, ''),
          content: this.extractExports(content)
        });
      }
      
      // Extract React components
      if (content.includes('export default function') || content.includes('export function')) {
        apiDocs.components.push({
          file: file.replace(this.projectRoot, ''),
          exports: this.extractExports(content)
        });
      }
      
      // Extract TypeScript interfaces/types
      if (content.includes('interface') || content.includes('type ')) {
        apiDocs.types.push({
          file: file.replace(this.projectRoot, ''),
          types: this.extractTypes(content)
        });
      }
    });

    const apiDocPath = path.join(this.outputDir, 'api-documentation.json');
    fs.writeFileSync(apiDocPath, JSON.stringify(apiDocs, null, 2));
    
    // Generate markdown version
    this.generateMarkdownApiDocs(apiDocs);
    
    console.log(`✅ API documentation generated: ${apiDocPath}`);
  }

  generateMarkdownApiDocs(apiDocs) {
    let markdown = `# leo Runner API Documentation

Generated on: ${new Date().toISOString()}

## Overview

leo Runner is an AI-powered developer workflow automation system with the following components:

- **Activity Monitor**: Real-time file and error monitoring
- **AI Escalation**: Intelligent problem detection and routing
- **Plugin System**: Extensible architecture for custom tools
- **Chat Integration**: AI-powered conversations with context
- **Workflow Orchestration**: Automated multi-step processes

## Components

`;

    // Add components documentation
    apiDocs.components.forEach(comp => {
      markdown += `### ${path.basename(comp.file)}

**File**: \`${comp.file}\`

**Exports**:
${comp.exports.map(exp => `- \`${exp}\``).join('\\n')}

`;
    });

    markdown += `## API Endpoints

`;

    // Add API endpoints
    apiDocs.endpoints.forEach(endpoint => {
      markdown += `### ${path.basename(endpoint.file)}

**File**: \`${endpoint.file}\`

**Functions**:
${endpoint.content.map(exp => `- \`${exp}\``).join('\\n')}

`;
    });

    markdown += `## Types & Interfaces

`;

    // Add type definitions
    apiDocs.types.forEach(typeFile => {
      if (typeFile.types.length > 0) {
        markdown += `### ${path.basename(typeFile.file)}

**File**: \`${typeFile.file}\`

**Types**:
${typeFile.types.map(type => `- \`${type}\``).join('\\n')}

`;
      }
    });

    const markdownPath = path.join(this.outputDir, 'api-documentation.md');
    fs.writeFileSync(markdownPath, markdown);
    console.log(`✅ Markdown API docs: ${markdownPath}`);
  }

  // Generate project README
  generateReadme() {
    console.log('📖 Generating project README...');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const readme = `# ${packageJson.name || 'leo Runner'}

${packageJson.description || 'AI-powered developer workflow automation system'}

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase CLI (optional)

### Installation

\`\`\`bash
# Clone the repository
git clone <repository-url>
cd leo-runner-local

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
\`\`\`

### With Claude Code

\`\`\`bash
# Setup Claude Code integration
npm run claude:setup

# Start with AI services
npm run dev:ai

# Open workspace in VSCode
code leo-runner.code-workspace
\`\`\`

## 🏗️ Architecture

### Core Components

- **Frontend**: Next.js 15 with Turbopack, React, TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components  
- **AI Integration**: Multiple providers (Claude, OpenAI, DeepSeek, Gemini)
- **Database**: Firebase Firestore + Neo4j (optional)
- **Monitoring**: LangChain/LangSmith integration
- **Backend**: Firebase Functions + Custom services

### Project Structure

\`\`\`
leo-runner-local/
├── src/                    # Main application source
│   ├── app/               # Next.js app router pages
│   ├── components/        # Reusable React components
│   ├── lib/              # Utility libraries
│   ├── services/         # Business logic services
│   └── ai/               # AI integration layer
├── functions/            # Firebase Functions
├── leorunner/          # Backend services
├── docs/                # Documentation
└── scripts/             # Development scripts
\`\`\`

## 🛠️ Available Scripts

\`\`\`bash
npm run dev              # Start development server
npm run dev:ai           # Start with AI services
npm run build            # Build for production
npm run test             # Run tests
npm run lint             # Lint code
npm run format           # Format code
npm run type-check       # TypeScript checking
npm run claude:setup     # Setup Claude Code
npm run claude:analyze   # Analyze project
npm run claude:docs      # Generate documentation
\`\`\`

## 🤖 AI Integration

### Supported Providers

- **Anthropic Claude**: Primary AI provider for code analysis
- **OpenAI GPT**: Alternative provider and specialized tasks
- **DeepSeek**: Cost-effective option for large workloads
- **Google Gemini**: Integrated via Genkit framework

### Configuration

Set up your API keys in the \`.env\` file:

\`\`\`env
ANTHROPIC_API_KEY=your_claude_key
OPENAI_API_KEY=your_openai_key
DEEPSEEK_API_KEY=your_deepseek_key
GOOGLE_API_KEY=your_google_key
\`\`\`

## 📚 Features

### Activity Monitor
- Real-time file system monitoring
- Error detection and categorization
- Plugin event integration
- WebSocket-based live updates

### AI Escalation
- Automatic problem detection
- Multi-provider AI routing
- Context-aware analysis
- Human handoff triggers

### Plugin System
- Drag-and-drop plugin installation
- TypeScript/JavaScript plugin support
- Secure sandbox execution
- Plugin marketplace ready

### Chat Integration
- Multi-provider AI conversations
- Context injection from activity
- Export to multiple formats
- Session management and branching

### Workflow Orchestration
- Visual workflow builder
- Multiple trigger types
- Comprehensive action library
- Parallel and conditional execution

## 🔧 Development

### Adding New Features

1. Create feature branch: \`git checkout -b feature/new-feature\`
2. Implement changes following existing patterns
3. Add tests and documentation
4. Run quality checks: \`npm run lint && npm run type-check\`
5. Submit pull request

### Plugin Development

1. Create plugin in \`plugins/\` directory
2. Follow plugin interface in \`src/types/plugin.ts\`
3. Test with drag-and-drop installation
4. Document plugin capabilities

## 📖 Documentation

- [API Documentation](./docs/claude-generated/api-documentation.md)
- [Plugin Development Guide](./docs/plugins.md)
- [AI Integration Guide](./docs/ai-integration.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

${packageJson.license || 'MIT'} License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- AI integration via [Genkit](https://firebase.google.com/docs/genkit)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)

---

Generated by Claude Code on ${new Date().toISOString()}
`;

    fs.writeFileSync('README.md', readme);
    console.log('✅ README.md generated');
  }

  // Helper methods
  findFiles(dir, pattern) {
    const files = [];
    
    function traverse(currentDir) {
      try {
        const items = fs.readdirSync(currentDir);
        
        items.forEach(item => {
          if (item.startsWith('.') || item === 'node_modules') return;
          
          const itemPath = path.join(currentDir, item);
          const stats = fs.statSync(itemPath);
          
          if (stats.isDirectory()) {
            traverse(itemPath);
          } else if (pattern.test(item)) {
            files.push(itemPath);
          }
        });
      } catch (error) {
        // Skip inaccessible directories
      }
    }
    
    traverse(dir);
    return files;
  }

  extractExports(content) {
    const exports = [];
    const lines = content.split('\\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('export')) {
        // Extract function/class/const names
        const match = trimmed.match(/export\\s+(default\\s+)?(function|class|const|let|var)\\s+([\\w]+)/);
        if (match) {
          exports.push(match[3]);
        }
      }
    });
    
    return exports;
  }

  extractTypes(content) {
    const types = [];
    const lines = content.split('\\n');
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Extract interfaces
      const interfaceMatch = trimmed.match(/^export\\s+interface\\s+([\\w]+)/);
      if (interfaceMatch) {
        types.push(`interface ${interfaceMatch[1]}`);
      }
      
      // Extract type aliases
      const typeMatch = trimmed.match(/^export\\s+type\\s+([\\w]+)/);
      if (typeMatch) {
        types.push(`type ${typeMatch[1]}`);
      }
    });
    
    return types;
  }

  // Generate all documentation
  generateAll() {
    this.generateApiDocs();
    this.generateReadme();
    
    console.log('\\n🎉 Documentation generation complete!');
    console.log(`📁 Output directory: ${this.outputDir}`);
    console.log('\\n📚 Generated files:');
    console.log('- README.md (project overview)');
    console.log('- docs/claude-generated/api-documentation.md');
    console.log('- docs/claude-generated/api-documentation.json');
  }
}

// Run documentation generation
const generator = new DocumentationGenerator();
generator.generateAll();


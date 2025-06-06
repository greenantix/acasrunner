#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Claude Code environment...');

// Create necessary directories
const dirs = [
  'src/claude-analysis',
  'docs/claude-generated', 
  'scripts/claude-helpers',
  '.claude-cache',
  'logs',
  'temp'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory already exists: ${dir}`);
  }
});

// Create Claude-specific gitignore entries
const gitignoreAdditions = `
# Claude Code
.claude-cache/
claude-analysis/
*.claude-temp
logs/
temp/

# Environment files (already in your .env)
*.env.local
*.env.development.local
*.env.test.local
*.env.production.local

# API Keys and sensitive files
keyfile.json
*.pem
*.key
*-key.json

# biOS specific (from your config)
biOS/logs/
biOS/data/temp/
`;

const gitignorePath = '.gitignore';
if (fs.existsSync(gitignorePath)) {
  const content = fs.readFileSync(gitignorePath, 'utf8');
  if (!content.includes('# Claude Code')) {
    fs.appendFileSync(gitignorePath, gitignoreAdditions);
    console.log('✅ Updated .gitignore with Claude Code entries');
  } else {
    console.log('📄 .gitignore already contains Claude Code entries');
  }
} else {
  fs.writeFileSync(gitignorePath, gitignoreAdditions);
  console.log('✅ Created .gitignore with Claude Code entries');
}

// Create a project analysis file
const projectAnalysis = {
  name: "leo Runner",
  type: "Next.js with AI Integration",
  framework: "React + TypeScript",
  aiProviders: ["Anthropic Claude", "OpenAI", "DeepSeek", "Google AI"],
  databases: ["Firebase Firestore", "Neo4j"],
  monitoring: ["LangChain", "LangSmith"],
  lastAnalyzed: new Date().toISOString(),
  structure: {
    frontend: "Next.js 15 with Turbopack",
    backend: "Firebase Functions",
    aiLayer: "Genkit integration",
    styling: "Tailwind CSS",
    components: "Radix UI + shadcn/ui"
  },
  apiKeys: {
    anthropic: process.env.ANTHROPIC_API_KEY ? "✅ Configured" : "❌ Missing",
    openai: process.env.OPENAI_API_KEY ? "✅ Configured" : "❌ Missing", 
    deepseek: process.env.DEEPSEEK_API_KEY ? "✅ Configured" : "❌ Missing",
    google: process.env.GOOGLE_API_KEY ? "✅ Configured" : "❌ Missing",
    firebase: process.env.FIREBASE_API_KEY ? "✅ Configured" : "❌ Missing"
  }
};

fs.writeFileSync(
  path.join('.claude-cache', 'project-analysis.json'),
  JSON.stringify(projectAnalysis, null, 2)
);
console.log('✅ Created project analysis file');

// Create a development helper script
const devHelper = `#!/usr/bin/env node
// Development helper for leo Runner
const { spawn } = require('child_process');

const commands = {
  'dev': 'npm run dev',
  'dev:ai': 'npm run dev:ai', 
  'build': 'npm run build',
  'test': 'npm test',
  'lint': 'npm run lint',
  'format': 'npm run format',
  'type-check': 'npm run type-check'
};

const command = process.argv[2];
if (!command || !commands[command]) {
  console.log('Available commands:');
  Object.keys(commands).forEach(cmd => {
    console.log(\`  \${cmd}: \${commands[cmd]}\`);
  });
  process.exit(1);
}

console.log(\`Running: \${commands[command]}\`);
const child = spawn('npm', ['run', command], { stdio: 'inherit' });
child.on('close', (code) => process.exit(code));
`;

fs.writeFileSync(path.join('scripts', 'dev-helper.js'), devHelper);
console.log('✅ Created development helper script');

// Check environment configuration
console.log('\\n🔍 Environment Configuration Check:');
const requiredEnvVars = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY', 
  'GOOGLE_API_KEY',
  'FIREBASE_API_KEY',
  'FIREBASE_PROJECT_ID'
];

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: Configured`);
  } else {
    console.log(`❌ ${envVar}: Missing`);
  }
});

console.log('\\n🎉 Claude Code setup complete!');
console.log('\\n📋 Next steps:');
console.log('1. Install development dependencies: npm install');
console.log('2. Open workspace: code leo-runner.code-workspace');
console.log('3. Install recommended extensions');
console.log('4. Start development: npm run dev:ai');
console.log('\\n🚀 Happy coding with Claude!');


#!/usr/bin/env node
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
    console.log(`  ${cmd}: ${commands[cmd]}`);
  });
  process.exit(1);
}

console.log(`Running: ${commands[command]}`);
const child = spawn('npm', ['run', command], { stdio: 'inherit' });
child.on('close', (code) => process.exit(code));


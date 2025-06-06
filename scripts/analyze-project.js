console.log('\\n📦 Packages:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
Object.entries(analysis.packages).forEach(([pkgPath, pkg]) => {
  console.log(`📋 ${pkgPath}:`);
  console.log(`   Name: ${pkg.name}`);
  console.log(`   Version: ${pkg.version}`);
  console.log(`   Scripts: ${pkg.scripts.length}`);
  console.log(`   Dependencies: ${pkg.dependencies.length}`);
  console.log(`   Dev Dependencies: ${pkg.devDependencies.length}`);
  console.log('');
});

console.log('\\n💡 Recommendations:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Check for missing recommended dependencies
const recommendedDeps = [
  '@typescript-eslint/eslint-plugin',
  'prettier',
  'eslint-config-prettier',
  'husky',
  'lint-staged'
];

const mainPkg = analysis.packages['./package.json'];
if (mainPkg) {
  const allDeps = [...mainPkg.dependencies, ...mainPkg.devDependencies];
  recommendedDeps.forEach(dep => {
    if (!allDeps.includes(dep)) {
      console.log(`📦 Consider adding: ${dep}`);
    }
  });
}

// Check for Claude Code optimization opportunities
if (analysis.fileStats.typeScript > 20) {
  console.log('🚀 Large TypeScript project - Claude Code will excel here!');
}

if (analysis.aiIntegration.providers.length > 2) {
  console.log('🤖 Multiple AI providers detected - perfect for Claude Code integration!');
}

console.log('\\n📊 Analysis saved to:', outputPath);
console.log('\\n🎯 Claude Code is ready to supercharge this project!');


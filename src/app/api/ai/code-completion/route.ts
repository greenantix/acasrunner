import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileContent, currentLine, language, position } = body;

    // Validate required fields
    if (!fileContent || !currentLine || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: fileContent, currentLine, language' },
        { status: 400 }
      );
    }

    // Generate AI-powered code completion suggestions
    const suggestions = await generateCompletionSuggestions(
      fileContent,
      currentLine,
      language,
      position
    );

    return NextResponse.json({
      success: true,
      suggestions,
      language,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Code completion generation failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate code completion',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function generateCompletionSuggestions(
  fileContent: string,
  currentLine: string,
  language: string,
  position: any
) {
  // Analyze the current context
  const context = analyzeCodeContext(fileContent, currentLine, language, position);
  
  // Generate suggestions based on context
  const suggestions = [];
  
  // Language-specific completions
  switch (language) {
    case 'typescript':
    case 'javascript':
      suggestions.push(...generateJSTSCompletions(context));
      break;
    case 'python':
      suggestions.push(...generatePythonCompletions(context));
      break;
    case 'java':
      suggestions.push(...generateJavaCompletions(context));
      break;
    case 'cpp':
    case 'c':
      suggestions.push(...generateCppCompletions(context));
      break;
    default:
      suggestions.push(...generateGenericCompletions(context));
  }
  
  // Add common patterns
  suggestions.push(...generateCommonPatterns(context));
  
  // Filter and rank suggestions
  return rankSuggestions(suggestions, context);
}

function analyzeCodeContext(fileContent: string, currentLine: string, language: string, position: any) {
  const lines = fileContent.split('\n');
  const currentLineIndex = position?.line || 0;
  
  // Get surrounding context
  const contextBefore = lines.slice(Math.max(0, currentLineIndex - 5), currentLineIndex);
  const contextAfter = lines.slice(currentLineIndex + 1, Math.min(lines.length, currentLineIndex + 5));
  
  // Analyze what's being typed
  const trimmedLine = currentLine.trim();
  const words = trimmedLine.split(/\s+/);
  const lastWord = words[words.length - 1] || '';
  
  // Detect patterns
  const isInFunction = contextBefore.some(line => line.includes('function') || line.includes('def') || line.includes('class'));
  const isInClass = contextBefore.some(line => line.match(/class\s+\w+/));
  const isInLoop = contextBefore.some(line => line.includes('for') || line.includes('while'));
  const isInIf = contextBefore.some(line => line.includes('if') || line.includes('else'));
  
  // Extract imports and variables
  const imports = extractImports(fileContent, language);
  const variables = extractVariables(contextBefore);
  const functions = extractFunctions(fileContent, language);
  
  return {
    currentLine: trimmedLine,
    lastWord,
    contextBefore,
    contextAfter,
    isInFunction,
    isInClass,
    isInLoop,
    isInIf,
    imports,
    variables,
    functions,
    language,
    indentation: currentLine.match(/^\s*/)?.[0] || ''
  };
}

function generateJSTSCompletions(context: any) {
  const suggestions = [];
  const { currentLine, lastWord, isInFunction, isInClass } = context;
  
  // Console completions
  if (lastWord === 'console' || currentLine.includes('console.')) {
    suggestions.push(
      {
        text: 'console.log()',
        insertText: 'console.log($1)',
        detail: 'Log to console',
        documentation: 'Outputs a message to the console',
        kind: 'Method'
      },
      {
        text: 'console.error()',
        insertText: 'console.error($1)',
        detail: 'Log error to console',
        documentation: 'Outputs an error message to the console',
        kind: 'Method'
      },
      {
        text: 'console.warn()',
        insertText: 'console.warn($1)',
        detail: 'Log warning to console',
        documentation: 'Outputs a warning message to the console',
        kind: 'Method'
      }
    );
  }
  
  // Function-related completions
  if (isInFunction) {
    suggestions.push(
      {
        text: 'return',
        insertText: 'return $1;',
        detail: 'Return statement',
        documentation: 'Returns a value from the function',
        kind: 'Keyword'
      }
    );
  }
  
  // Async/await patterns
  if (currentLine.includes('await') || currentLine.includes('async')) {
    suggestions.push(
      {
        text: 'try-catch',
        insertText: 'try {\n  $1\n} catch (error) {\n  console.error(error);\n}',
        detail: 'Try-catch block',
        documentation: 'Handle asynchronous errors',
        kind: 'Snippet'
      }
    );
  }
  
  // Import suggestions
  if (currentLine.startsWith('import') || lastWord === 'import') {
    suggestions.push(
      {
        text: 'import { } from',
        insertText: 'import { $1 } from \'$2\';',
        detail: 'Named import',
        documentation: 'Import specific exports from a module',
        kind: 'Snippet'
      },
      {
        text: 'import * as',
        insertText: 'import * as $1 from \'$2\';',
        detail: 'Namespace import',
        documentation: 'Import all exports as a namespace',
        kind: 'Snippet'
      }
    );
  }
  
  return suggestions;
}

function generatePythonCompletions(context: any) {
  const suggestions = [];
  const { currentLine, lastWord, isInFunction, isInClass } = context;
  
  // Print statements
  if (lastWord === 'print' || currentLine.includes('print(')) {
    suggestions.push({
      text: 'print()',
      insertText: 'print($1)',
      detail: 'Print statement',
      documentation: 'Outputs text to the console',
      kind: 'Function'
    });
  }
  
  // Def keyword
  if (currentLine.startsWith('def') || lastWord === 'def') {
    suggestions.push({
      text: 'def function',
      insertText: 'def $1($2):\n    $3',
      detail: 'Function definition',
      documentation: 'Define a new function',
      kind: 'Snippet'
    });
  }
  
  // Class keyword
  if (currentLine.startsWith('class') || lastWord === 'class') {
    suggestions.push({
      text: 'class definition',
      insertText: 'class $1:\n    def __init__(self$2):\n        $3',
      detail: 'Class definition',
      documentation: 'Define a new class',
      kind: 'Snippet'
    });
  }
  
  return suggestions;
}

function generateJavaCompletions(context: any) {
  const suggestions = [];
  const { currentLine, lastWord } = context;
  
  // System.out completions
  if (currentLine.includes('System.out')) {
    suggestions.push(
      {
        text: 'System.out.println()',
        insertText: 'System.out.println($1);',
        detail: 'Print line',
        documentation: 'Prints a line to the console',
        kind: 'Method'
      }
    );
  }
  
  // Public static void main
  if (currentLine.includes('public static')) {
    suggestions.push({
      text: 'main method',
      insertText: 'public static void main(String[] args) {\n    $1\n}',
      detail: 'Main method',
      documentation: 'Entry point for Java application',
      kind: 'Snippet'
    });
  }
  
  return suggestions;
}

function generateCppCompletions(context: any) {
  const suggestions = [];
  const { currentLine, lastWord } = context;
  
  // Include statements
  if (currentLine.startsWith('#include') || lastWord === '#include') {
    suggestions.push(
      {
        text: '#include <iostream>',
        insertText: '#include <iostream>',
        detail: 'Include iostream',
        documentation: 'Include standard input/output stream',
        kind: 'Module'
      },
      {
        text: '#include <vector>',
        insertText: '#include <vector>',
        detail: 'Include vector',
        documentation: 'Include standard vector container',
        kind: 'Module'
      }
    );
  }
  
  // Cout statements
  if (currentLine.includes('std::cout') || currentLine.includes('cout')) {
    suggestions.push({
      text: 'cout statement',
      insertText: 'std::cout << $1 << std::endl;',
      detail: 'Console output',
      documentation: 'Output to console',
      kind: 'Snippet'
    });
  }
  
  return suggestions;
}

function generateGenericCompletions(context: any) {
  const suggestions: any[] = [];
  const { currentLine, variables, functions } = context;
  
  // Variable suggestions
  variables.forEach((variable: any) => {
    suggestions.push({
      text: variable,
      insertText: variable,
      detail: 'Variable',
      documentation: `Local variable: ${variable}`,
      kind: 'Variable'
    });
  });
  
  // Function suggestions
  functions.forEach((func: any) => {
    suggestions.push({
      text: func.name,
      insertText: `${func.name}($1)`,
      detail: 'Function',
      documentation: `Function: ${func.name}`,
      kind: 'Function'
    });
  });
  
  return suggestions;
}

function generateCommonPatterns(context: any) {
  const suggestions = [];
  const { language, isInFunction, isInLoop } = context;
  
  // Common error handling
  suggestions.push({
    text: 'try-catch',
    insertText: language === 'python' ? 'try:\n    $1\nexcept Exception as e:\n    print(f"Error: {e}")' :
                language === 'java' ? 'try {\n    $1\n} catch (Exception e) {\n    e.printStackTrace();\n}' :
                'try {\n    $1\n} catch (error) {\n    console.error(error);\n}',
    detail: 'Error handling',
    documentation: 'Try-catch error handling pattern',
    kind: 'Snippet'
  });
  
  // Conditional statements
  if (!isInLoop) {
    suggestions.push({
      text: 'if statement',
      insertText: language === 'python' ? 'if $1:\n    $2' : 'if ($1) {\n    $2\n}',
      detail: 'Conditional statement',
      documentation: 'If conditional statement',
      kind: 'Snippet'
    });
  }
  
  return suggestions;
}

function extractImports(fileContent: string, language: string) {
  const imports = [];
  const lines = fileContent.split('\n');
  
  for (const line of lines) {
    if (language === 'javascript' || language === 'typescript') {
      const importMatch = line.match(/import\s+.*\s+from\s+['"`]([^'"`]+)['"`]/);
      if (importMatch) {
        imports.push(importMatch[1]);
      }
    } else if (language === 'python') {
      const importMatch = line.match(/import\s+(\w+)|from\s+(\w+)\s+import/);
      if (importMatch) {
        imports.push(importMatch[1] || importMatch[2]);
      }
    }
  }
  
  return imports;
}

function extractVariables(contextLines: string[]) {
  const variables = new Set<string>();
  
  for (const line of contextLines) {
    // Simple variable extraction (this could be more sophisticated)
    const matches = line.match(/(?:let|const|var)\s+(\w+)|(\w+)\s*=/g);
    if (matches) {
      matches.forEach(match => {
        const varMatch = match.match(/(?:let|const|var)\s+(\w+)|(\w+)\s*=/);
        if (varMatch) {
          variables.add(varMatch[1] || varMatch[2]);
        }
      });
    }
  }
  
  return Array.from(variables);
}

function extractFunctions(fileContent: string, language: string) {
  const functions = [];
  const lines = fileContent.split('\n');
  
  for (const line of lines) {
    if (language === 'javascript' || language === 'typescript') {
      const funcMatch = line.match(/function\s+(\w+)\s*\(|(\w+)\s*:\s*\([^)]*\)\s*=>/);
      if (funcMatch) {
        functions.push({ name: funcMatch[1] || funcMatch[2] });
      }
    } else if (language === 'python') {
      const funcMatch = line.match(/def\s+(\w+)\s*\(/);
      if (funcMatch) {
        functions.push({ name: funcMatch[1] });
      }
    }
  }
  
  return functions;
}

function rankSuggestions(suggestions: any[], context: any) {
  // Simple ranking based on relevance
  return suggestions
    .map(suggestion => ({
      ...suggestion,
      relevance: calculateRelevance(suggestion, context)
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 10); // Return top 10 suggestions
}

function calculateRelevance(suggestion: any, context: any) {
  let score = 0;
  
  // Boost score based on context
  if (suggestion.text.toLowerCase().includes(context.lastWord.toLowerCase())) {
    score += 10;
  }
  
  // Boost common patterns
  if (suggestion.kind === 'Snippet') {
    score += 5;
  }
  
  // Boost based on current line context
  if (context.currentLine.includes('console') && suggestion.text.includes('console')) {
    score += 8;
  }
  
  return score;
}
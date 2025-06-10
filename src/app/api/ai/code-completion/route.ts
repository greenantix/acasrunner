import { NextRequest, NextResponse } from 'next/server';
import { providerManager } from '@/services/llm-providers/provider-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  try {
    // Get the best LLM provider for code completion
    const provider = await providerManager.selectBestProvider(
      'code_completion',
      'low',
      ['code_review', 'debugging']
    );
    
    if (!provider) {
      throw new Error('No LLM providers available');
    }

    // Analyze context
    const context = analyzeCodeContext(fileContent, currentLine, language, position);
    
    // Create completion prompt
    const prompt = createCompletionPrompt(fileContent, currentLine, language, position, context);
    
    // Get AI response
    const response = await provider.sendRequest({
      prompt,
      context: `Language: ${language}, Position: ${position?.line || 0}:${position?.character || 0}`,
      temperature: 0.3, // Higher temperature for more creative completions
      maxTokens: 500
    });

    // Parse and format suggestions
    const suggestions = parseCompletionResponse(response, context);
    
    return suggestions;

  } catch (error) {
    console.error('LLM completion error:', error);
    // Fallback to basic context-aware completions
    return generateBasicCompletions(fileContent, currentLine, language, position);
  }
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

function createCompletionPrompt(fileContent: string, currentLine: string, language: string, position: any, context: any): string {
  const lineNumber = position?.line || 0;
  const character = position?.character || 0;
  
  return `You are an expert ${language} code completion assistant. Complete the code at the cursor position.

File content:
\`\`\`${language}
${fileContent}
\`\`\`

Current line (line ${lineNumber + 1}): "${currentLine}"
Cursor position: character ${character}

Context:
- In function: ${context.isInFunction}
- In class: ${context.isInClass}
- In loop: ${context.isInLoop}
- Available variables: ${context.variables.join(', ') || 'none'}
- Available functions: ${context.functions.map((f: any) => f.name).join(', ') || 'none'}

Provide 3-5 most relevant code completions for this position. Format each suggestion as:
SUGGESTION: [completion text]
DETAIL: [brief description]
KIND: [Method|Function|Variable|Keyword|Snippet|Module]

Focus on contextually appropriate completions based on what's being typed and the surrounding code.`;
}

function parseCompletionResponse(response: any, context: any): any[] {
  const content = response.content || '';
  const suggestions: any[] = [];
  
  // Parse suggestions from AI response
  const suggestionBlocks = content.split('SUGGESTION:').slice(1);
  
  for (const block of suggestionBlocks) {
    const lines = block.trim().split('\n');
    if (lines.length === 0) continue;
    
    const suggestion = lines[0].trim();
    const detailLine = lines.find((line: string) => line.startsWith('DETAIL:'));
    const kindLine = lines.find((line: string) => line.startsWith('KIND:'));
    
    if (suggestion) {
      suggestions.push({
        text: suggestion,
        insertText: suggestion,
        detail: detailLine ? detailLine.replace('DETAIL:', '').trim() : suggestion,
        kind: kindLine ? kindLine.replace('KIND:', '').trim() : 'Text',
        documentation: `AI-generated completion for ${context.language}`,
        sortText: `0${suggestions.length}` // Ensure AI suggestions appear first
      });
    }
  }
  
  // If parsing fails, try to extract any code-like content
  if (suggestions.length === 0) {
    const codeMatches = content.match(/`([^`]+)`/g);
    if (codeMatches) {
      codeMatches.slice(0, 5).forEach((match: string, index: number) => {
        const code = match.replace(/`/g, '');
        suggestions.push({
          text: code,
          insertText: code,
          detail: 'AI suggestion',
          kind: 'Text',
          documentation: 'AI-generated code completion',
          sortText: `0${index}`
        });
      });
    }
  }
  
  return suggestions.slice(0, 10); // Limit to 10 suggestions
}

function generateBasicCompletions(fileContent: string, currentLine: string, language: string, position: any): any[] {
  const context = analyzeCodeContext(fileContent, currentLine, language, position);
  const suggestions: any[] = [];
  
  // Add variable completions
  context.variables.forEach((variable: string, index: number) => {
    if (variable.toLowerCase().includes(context.lastWord.toLowerCase())) {
      suggestions.push({
        text: variable,
        insertText: variable,
        detail: 'Local variable',
        kind: 'Variable',
        documentation: `Variable: ${variable}`,
        sortText: `1${index.toString().padStart(3, '0')}`
      });
    }
  });
  
  // Add function completions
  context.functions.forEach((func: any, index: number) => {
    if (func.name.toLowerCase().includes(context.lastWord.toLowerCase())) {
      suggestions.push({
        text: func.name,
        insertText: `${func.name}()`,
        detail: 'Function',
        kind: 'Function',
        documentation: `Function: ${func.name}`,
        sortText: `2${index.toString().padStart(3, '0')}`
      });
    }
  });
  
  // Add language-specific keywords
  const keywords = getLanguageKeywords(language);
  keywords.forEach((keyword: string, index: number) => {
    if (keyword.toLowerCase().includes(context.lastWord.toLowerCase())) {
      suggestions.push({
        text: keyword,
        insertText: keyword,
        detail: `${language} keyword`,
        kind: 'Keyword',
        documentation: `${language} language keyword`,
        sortText: `3${index.toString().padStart(3, '0')}`
      });
    }
  });
  
  return suggestions.slice(0, 10);
}

function getLanguageKeywords(language: string): string[] {
  const keywordMap: { [key: string]: string[] } = {
    javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export'],
    typescript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'interface', 'type'],
    python: ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from', 'try', 'except'],
    java: ['public', 'private', 'protected', 'class', 'interface', 'if', 'else', 'for', 'while', 'return', 'import'],
    cpp: ['#include', 'namespace', 'class', 'struct', 'if', 'else', 'for', 'while', 'return', 'public', 'private'],
    c: ['#include', 'struct', 'if', 'else', 'for', 'while', 'return', 'typedef']
  };
  
  return keywordMap[language] || [];
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

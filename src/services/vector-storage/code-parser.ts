import * as path from 'path';
import { LezerCodeParser } from './lezer-parser';

export interface CodeChunk {
  id: string;
  content: string;
  startLine: number;
  endLine: number;
  type: 'function' | 'class' | 'method' | 'interface' | 'chunk';
  name?: string;
  language: string;
  filePath: string;
  context: {
    parentClass?: string;
    imports?: string[];
    docstring?: string;
    parameters?: string[];
    returnType?: string;
  };
}

export class CodeParser {
  private lezerParser: LezerCodeParser;

  constructor() {
    this.lezerParser = new LezerCodeParser();
  }

  parseFile(filePath: string, content: string): CodeChunk[] {
    const language = this.getLanguageFromPath(filePath);
    
    // For JavaScript and TypeScript, use the Lezer parser
    if (language === 'javascript' || language === 'typescript') {
      return this.lezerParser.parseFile(filePath, content);
    }
    
    // For other languages, create simple chunks
    return this.createSimpleChunks(filePath, content, language);
  }

  // Helper methods for using Lezer directly
  parseCodeToAST(code: string): any {
    return this.lezerParser.parseCodeToAST(code);
  }

  extractIdentifiers(code: string): string[] {
    return this.lezerParser.extractIdentifiers(code);
  }

  private getLanguageFromPath(filePath: string): string {
    const ext = path.extname(filePath).slice(1).toLowerCase();
    
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'dart': 'dart',
      'scala': 'scala',
    };

    return languageMap[ext] || 'text';
  }

  private createSimpleChunks(filePath: string, content: string, language: string, chunkSize: number = 1000): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');
    
    let currentChunk = '';
    let startLine = 0;
    let currentLineCount = 0;

    for (let i = 0; i < lines.length; i++) {
      currentChunk += lines[i] + '\n';
      currentLineCount++;

      if (currentChunk.length >= chunkSize || i === lines.length - 1) {
        chunks.push({
          id: `${filePath}:chunk:${startLine}`,
          content: currentChunk.trim(),
          startLine,
          endLine: i,
          type: 'chunk',
          language,
          filePath,
          context: {}
        });

        currentChunk = '';
        startLine = i + 1;
        currentLineCount = 0;
      }
    }

    return chunks;
  }
}

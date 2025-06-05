import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import JavaScript from 'tree-sitter-javascript';
import Python from 'tree-sitter-python';
import path from 'path';

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
  private parsers: Map<string, Parser> = new Map();

  constructor() {
    this.initializeParsers();
  }

  private initializeParsers(): void {
    // TypeScript parser
    const tsParser = new Parser();
    tsParser.setLanguage(TypeScript.typescript);
    this.parsers.set('typescript', tsParser);
    this.parsers.set('ts', tsParser);

    // JavaScript parser
    const jsParser = new Parser();
    jsParser.setLanguage(JavaScript);
    this.parsers.set('javascript', jsParser);
    this.parsers.set('js', jsParser);

    // Python parser
    const pythonParser = new Parser();
    pythonParser.setLanguage(Python);
    this.parsers.set('python', pythonParser);
    this.parsers.set('py', pythonParser);
  }

  parseFile(filePath: string, content: string): CodeChunk[] {
    const language = this.getLanguageFromPath(filePath);
    const parser = this.parsers.get(language);

    if (!parser) {
      // For unsupported languages, create simple chunks
      return this.createSimpleChunks(filePath, content, language);
    }

    try {
      const tree = parser.parse(content);
      return this.extractChunks(tree, content, filePath, language);
    } catch (error) {
      console.error(`Failed to parse file ${filePath}:`, error);
      return this.createSimpleChunks(filePath, content, language);
    }
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

  private extractChunks(tree: Parser.Tree, content: string, filePath: string, language: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');

    const extractFromNode = (node: Parser.SyntaxNode, parentClass?: string) => {
      const nodeType = node.type;
      const nodeText = node.text;
      const startLine = node.startPosition.row;
      const endLine = node.endPosition.row;

      // Function definitions
      if (this.isFunctionNode(nodeType, language)) {
        const functionName = this.extractFunctionName(node, language);
        const parameters = this.extractParameters(node, language);
        const returnType = this.extractReturnType(node, language);
        const docstring = this.extractDocstring(node, lines, language);

        chunks.push({
          id: `${filePath}:${functionName}:${startLine}`,
          content: nodeText,
          startLine,
          endLine,
          type: parentClass ? 'method' : 'function',
          name: functionName,
          language,
          filePath,
          context: {
            parentClass,
            parameters,
            returnType,
            docstring
          }
        });
      }

      // Class definitions
      else if (this.isClassNode(nodeType, language)) {
        const className = this.extractClassName(node, language);
        const docstring = this.extractDocstring(node, lines, language);

        chunks.push({
          id: `${filePath}:${className}:${startLine}`,
          content: nodeText,
          startLine,
          endLine,
          type: 'class',
          name: className,
          language,
          filePath,
          context: {
            docstring
          }
        });

        // Process methods within the class
        for (const child of node.children) {
          extractFromNode(child, className);
        }
        return; // Don't process children again
      }

      // Interface definitions (TypeScript)
      else if (nodeType === 'interface_declaration' && language === 'typescript') {
        const interfaceName = this.extractInterfaceName(node);
        
        chunks.push({
          id: `${filePath}:${interfaceName}:${startLine}`,
          content: nodeText,
          startLine,
          endLine,
          type: 'interface',
          name: interfaceName,
          language,
          filePath,
          context: {}
        });
      }

      // Process children
      for (const child of node.children) {
        extractFromNode(child, parentClass);
      }
    };

    extractFromNode(tree.rootNode);

    // If no specific chunks found, create general chunks
    if (chunks.length === 0) {
      return this.createSimpleChunks(filePath, content, language);
    }

    return chunks;
  }

  private isFunctionNode(nodeType: string, language: string): boolean {
    const functionTypes: Record<string, string[]> = {
      typescript: ['function_declaration', 'method_definition', 'arrow_function'],
      javascript: ['function_declaration', 'method_definition', 'arrow_function'],
      python: ['function_definition']
    };

    return functionTypes[language]?.includes(nodeType) || false;
  }

  private isClassNode(nodeType: string, language: string): boolean {
    const classTypes: Record<string, string[]> = {
      typescript: ['class_declaration'],
      javascript: ['class_declaration'],
      python: ['class_definition']
    };

    return classTypes[language]?.includes(nodeType) || false;
  }

  private extractFunctionName(node: Parser.SyntaxNode, language: string): string {
    // Find the identifier node that represents the function name
    const findIdentifier = (n: Parser.SyntaxNode): string => {
      if (n.type === 'identifier') {
        return n.text;
      }
      for (const child of n.children) {
        const result = findIdentifier(child);
        if (result) return result;
      }
      return '';
    };

    return findIdentifier(node) || 'anonymous';
  }

  private extractClassName(node: Parser.SyntaxNode, language: string): string {
    const findIdentifier = (n: Parser.SyntaxNode): string => {
      if (n.type === 'identifier') {
        return n.text;
      }
      for (const child of n.children) {
        const result = findIdentifier(child);
        if (result) return result;
      }
      return '';
    };

    return findIdentifier(node) || 'AnonymousClass';
  }

  private extractInterfaceName(node: Parser.SyntaxNode): string {
    const findIdentifier = (n: Parser.SyntaxNode): string => {
      if (n.type === 'type_identifier') {
        return n.text;
      }
      for (const child of n.children) {
        const result = findIdentifier(child);
        if (result) return result;
      }
      return '';
    };

    return findIdentifier(node) || 'AnonymousInterface';
  }

  private extractParameters(node: Parser.SyntaxNode, language: string): string[] {
    const parameters: string[] = [];
    
    const findParameters = (n: Parser.SyntaxNode) => {
      if (n.type === 'formal_parameters' || n.type === 'parameters') {
        for (const child of n.children) {
          if (child.type === 'identifier' || child.type === 'parameter') {
            parameters.push(child.text);
          }
        }
      } else {
        for (const child of n.children) {
          findParameters(child);
        }
      }
    };

    findParameters(node);
    return parameters;
  }

  private extractReturnType(node: Parser.SyntaxNode, language: string): string | undefined {
    if (language !== 'typescript') return undefined;

    const findReturnType = (n: Parser.SyntaxNode): string | undefined => {
      if (n.type === 'type_annotation') {
        return n.text.replace(':', '').trim();
      }
      for (const child of n.children) {
        const result = findReturnType(child);
        if (result) return result;
      }
      return undefined;
    };

    return findReturnType(node);
  }

  private extractDocstring(node: Parser.SyntaxNode, lines: string[], language: string): string | undefined {
    const startLine = node.startPosition.row;
    
    // Look for docstring/comment before the node
    for (let i = startLine - 1; i >= Math.max(0, startLine - 5); i--) {
      const line = lines[i]?.trim();
      if (!line) continue;
      
      if (language === 'python' && (line.startsWith('"""') || line.startsWith("'''"))) {
        return line;
      } else if ((language === 'typescript' || language === 'javascript') && line.startsWith('/**')) {
        return line;
      }
    }

    return undefined;
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
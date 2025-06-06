import { parser as javascriptParser } from '@lezer/javascript';
import { SyntaxNode, Tree, TreeCursor } from '@lezer/common';
import { CodeChunk } from './code-parser';

export class LezerCodeParser {
  parseFile(filePath: string, content: string): CodeChunk[] {
    try {
      const tree = this.parseCodeToAST(content);
      return this.extractChunksFromTree(tree, content, filePath);
    } catch (error) {
      console.error(`Failed to parse file ${filePath} with Lezer:`, error);
      return this.createSimpleChunks(filePath, content);
    }
  }

  parseCodeToAST(code: string): Tree {
    return javascriptParser.parse(code);
  }

  extractIdentifiers(code: string): string[] {
    const tree = this.parseCodeToAST(code);
    const identifiers: string[] = [];
    const cursor = tree.cursor();

    const visitNode = (cursor: TreeCursor) => {
      do {
        const node = cursor.node;
        if (node.type.name === 'VariableName' || 
            node.type.name === 'PropertyName' || 
            node.type.name === 'DefinitionName') {
          const text = code.slice(node.from, node.to);
          if (text && !identifiers.includes(text)) {
            identifiers.push(text);
          }
        }

        if (cursor.firstChild()) {
          visitNode(cursor);
          cursor.parent();
        }
      } while (cursor.nextSibling());
    };

    if (cursor.firstChild()) {
      visitNode(cursor);
    }

    return identifiers;
  }

  private extractChunksFromTree(tree: Tree, content: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');
    const cursor = tree.cursor();

    const visitNode = (cursor: TreeCursor, parentClass?: string) => {
      do {
        const node = cursor.node;
        const nodeType = node.type.name;
        const startPos = node.from;
        const endPos = node.to;
        const nodeContent = content.slice(startPos, endPos);
        
        // Calculate line numbers
        const beforeContent = content.slice(0, startPos);
        const startLine = beforeContent.split('\n').length - 1;
        const endLine = startLine + nodeContent.split('\n').length - 1;

        // Function declarations
        if (nodeType === 'FunctionDeclaration' || nodeType === 'MethodDefinition' || nodeType === 'ArrowFunction') {
          const functionName = this.extractName(cursor, content, 'function');
          const parameters = this.extractParameters(cursor, content);
          const docstring = this.extractDocstring(startLine, lines);

          chunks.push({
            id: `${filePath}:${functionName}:${startLine}`,
            content: nodeContent,
            startLine,
            endLine,
            type: parentClass ? 'method' : 'function',
            name: functionName,
            language: 'javascript',
            filePath,
            context: {
              parentClass,
              parameters,
              docstring
            }
          });
        }

        // Class declarations
        else if (nodeType === 'ClassDeclaration') {
          const className = this.extractName(cursor, content, 'class');
          const docstring = this.extractDocstring(startLine, lines);

          chunks.push({
            id: `${filePath}:${className}:${startLine}`,
            content: nodeContent,
            startLine,
            endLine,
            type: 'class',
            name: className,
            language: 'javascript',
            filePath,
            context: {
              docstring
            }
          });

          // Process methods within the class
          if (cursor.firstChild()) {
            visitNode(cursor, className);
            cursor.parent();
          }
          return; // Don't process children again
        }

        // Interface declarations (TypeScript)
        else if (nodeType === 'InterfaceDeclaration') {
          const interfaceName = this.extractName(cursor, content, 'interface');

          chunks.push({
            id: `${filePath}:${interfaceName}:${startLine}`,
            content: nodeContent,
            startLine,
            endLine,
            type: 'interface',
            name: interfaceName,
            language: 'typescript',
            filePath,
            context: {}
          });
        }

        // Process children
        if (cursor.firstChild()) {
          visitNode(cursor, parentClass);
          cursor.parent();
        }
      } while (cursor.nextSibling());
    };

    if (cursor.firstChild()) {
      visitNode(cursor);
    }

    // If no specific chunks found, create general chunks
    if (chunks.length === 0) {
      return this.createSimpleChunks(filePath, content);
    }

    return chunks;
  }

  private extractName(cursor: TreeCursor, content: string, type: 'function' | 'class' | 'interface'): string {
    // Save current position
    const currentNode = cursor.node;
    
    // Look for the name identifier
    if (cursor.firstChild()) {
      do {
        const childType = cursor.node.type.name;
        if (childType === 'VariableName' || childType === 'DefinitionName') {
          const name = content.slice(cursor.node.from, cursor.node.to);
          cursor.moveTo(currentNode); // Restore position
          return name;
        }
      } while (cursor.nextSibling());
    }
    
    cursor.moveTo(currentNode); // Restore position
    return `anonymous_${type}`;
  }

  private extractParameters(cursor: TreeCursor, content: string): string[] {
    const parameters: string[] = [];
    const currentNode = cursor.node;

    // Look for parameter list
    if (cursor.firstChild()) {
      do {
        const childType = cursor.node.type.name;
        if (childType === 'ParamList') {
          // Found parameter list, extract parameters
          if (cursor.firstChild()) {
            do {
              const paramType = cursor.node.type.name;
              if (paramType === 'VariableName' || paramType === 'DefinitionName') {
                const param = content.slice(cursor.node.from, cursor.node.to);
                parameters.push(param);
              }
            } while (cursor.nextSibling());
            cursor.parent(); // Back to ParamList
          }
          break;
        }
      } while (cursor.nextSibling());
    }

    cursor.moveTo(currentNode); // Restore position
    return parameters;
  }

  private extractDocstring(startLine: number, lines: string[]): string | undefined {
    // Look for JSDoc comments before the function/class
    for (let i = startLine - 1; i >= Math.max(0, startLine - 5); i--) {
      const line = lines[i]?.trim();
      if (!line) continue;
      
      if (line.startsWith('/**') || line.startsWith('//')) {
        return line;
      }
    }

    return undefined;
  }

  private createSimpleChunks(filePath: string, content: string, chunkSize: number = 1000): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');
    
    let currentChunk = '';
    let startLine = 0;

    for (let i = 0; i < lines.length; i++) {
      currentChunk += lines[i] + '\n';

      if (currentChunk.length >= chunkSize || i === lines.length - 1) {
        chunks.push({
          id: `${filePath}:chunk:${startLine}`,
          content: currentChunk.trim(),
          startLine,
          endLine: i,
          type: 'chunk',
          language: 'javascript',
          filePath,
          context: {}
        });

        currentChunk = '';
        startLine = i + 1;
      }
    }

    return chunks;
  }
}
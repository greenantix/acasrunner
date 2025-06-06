import * as vscode from 'vscode';
import { leoConnection } from '../communication/leo-connection';

export class AIAssistant {
    private leoConnection: leoConnection;

    constructor(leoConnection: leoConnection) {
        this.leoConnection = leoConnection;
    }

    async ask(question: string, context?: any): Promise<string> {
        try {
            const response = await this.leoConnection.sendHTTP('chat/sessions', {
                message: question,
                context: context || {},
                source: 'vscode-extension'
            });

            return response.response || 'Sorry, I could not process your request.';
        } catch (error) {
            throw new Error(`AI request failed: ${error}`);
        }
    }

    async analyzeCode(code: string, language: string): Promise<any> {
        try {
            const response = await this.leoConnection.sendHTTP('ai/analyze-code', {
                code,
                language,
                context: {
                    source: 'vscode-extension',
                    workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
                }
            });

            return response;
        } catch (error) {
            throw new Error(`Code analysis failed: ${error}`);
        }
    }

    async suggestFix(error: string, code: string, language: string): Promise<any> {
        try {
            const response = await this.leoConnection.sendHTTP('ai/suggest-fix', {
                error,
                code,
                language,
                context: {
                    source: 'vscode-extension'
                }
            });

            return response;
        } catch (error) {
            throw new Error(`Fix suggestion failed: ${error}`);
        }
    }

    async generateDocumentation(code: string, language: string, docType: 'readme' | 'comments' | 'docs_page' = 'comments'): Promise<string> {
        try {
            const response = await this.leoConnection.sendHTTP('ai/generate-docs', {
                code,
                language,
                docType,
                context: {
                    source: 'vscode-extension'
                }
            });

            return response.generatedContent || '';
        } catch (error) {
            throw new Error(`Documentation generation failed: ${error}`);
        }
    }

    async provideCodeCompletion(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.CompletionItem[]> {
        try {
            const linePrefix = document.lineAt(position).text.substr(0, position.character);
            const context = {
                fileContent: document.getText(),
                currentLine: linePrefix,
                language: document.languageId,
                position: {
                    line: position.line,
                    character: position.character
                }
            };

            const response = await this.leoConnection.sendHTTP('ai/code-completion', context);
            
            if (!response.suggestions) {
                return [];
            }

            return response.suggestions.map((suggestion: any, index: number) => {
                const item = new vscode.CompletionItem(
                    suggestion.text,
                    vscode.CompletionItemKind.Text
                );
                
                item.detail = suggestion.detail || 'AI Suggestion';
                item.documentation = new vscode.MarkdownString(suggestion.documentation || '');
                item.insertText = suggestion.insertText || suggestion.text;
                item.sortText = `000${index}`;
                
                return item;
            });
        } catch (error) {
            console.error('Code completion failed:', error);
            return [];
        }
    }

    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.Hover | null> {
        try {
            const wordRange = document.getWordRangeAtPosition(position);
            if (!wordRange) {
                return null;
            }

            const word = document.getText(wordRange);
            const context = {
                word,
                fileContent: document.getText(),
                language: document.languageId,
                position: {
                    line: position.line,
                    character: position.character
                }
            };

            const response = await this.leoConnection.sendHTTP('ai/hover-info', context);
            
            if (!response.explanation) {
                return null;
            }

            const markdownString = new vscode.MarkdownString();
            markdownString.appendMarkdown(`**${word}**\n\n`);
            markdownString.appendMarkdown(response.explanation);
            
            if (response.examples) {
                markdownString.appendMarkdown('\n\n**Examples:**\n');
                response.examples.forEach((example: string) => {
                    markdownString.appendCodeblock(example, document.languageId);
                });
            }

            return new vscode.Hover(markdownString, wordRange);
        } catch (error) {
            console.error('Hover provider failed:', error);
            return null;
        }
    }
}

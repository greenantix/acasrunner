"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAssistant = void 0;
const vscode = __importStar(require("vscode"));
class AIAssistant {
    constructor(leoConnection) {
        this.leoConnection = leoConnection;
    }
    async ask(question, context) {
        try {
            const response = await this.leoConnection.sendHTTP('chat/sessions', {
                message: question,
                context: context || {},
                source: 'vscode-extension'
            });
            return response.response || 'Sorry, I could not process your request.';
        }
        catch (error) {
            throw new Error(`AI request failed: ${error}`);
        }
    }
    async analyzeCode(code, language) {
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
        }
        catch (error) {
            throw new Error(`Code analysis failed: ${error}`);
        }
    }
    async suggestFix(error, code, language) {
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
        }
        catch (error) {
            throw new Error(`Fix suggestion failed: ${error}`);
        }
    }
    async generateDocumentation(code, language, docType = 'comments') {
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
        }
        catch (error) {
            throw new Error(`Documentation generation failed: ${error}`);
        }
    }
    async provideCodeCompletion(document, position) {
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
            return response.suggestions.map((suggestion, index) => {
                const item = new vscode.CompletionItem(suggestion.text, vscode.CompletionItemKind.Text);
                item.detail = suggestion.detail || 'AI Suggestion';
                item.documentation = new vscode.MarkdownString(suggestion.documentation || '');
                item.insertText = suggestion.insertText || suggestion.text;
                item.sortText = `000${index}`;
                return item;
            });
        }
        catch (error) {
            console.error('Code completion failed:', error);
            return [];
        }
    }
    async provideHover(document, position) {
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
                response.examples.forEach((example) => {
                    markdownString.appendCodeblock(example, document.languageId);
                });
            }
            return new vscode.Hover(markdownString, wordRange);
        }
        catch (error) {
            console.error('Hover provider failed:', error);
            return null;
        }
    }
}
exports.AIAssistant = AIAssistant;
//# sourceMappingURL=ai-assistant.js.map

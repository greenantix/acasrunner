import * as vscode from 'vscode';
import { AIAssistant } from '../ai/ai-assistant';

export class ACASCompletionProvider implements vscode.CompletionItemProvider {
    private aiAssistant: AIAssistant;

    constructor(aiAssistant: AIAssistant) {
        this.aiAssistant = aiAssistant;
    }

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        // Only provide completions if configured to do so
        const config = vscode.workspace.getConfiguration('acas');
        if (!config.get('showInlineHints')) {
            return [];
        }

        try {
            const completions = await this.aiAssistant.provideCodeCompletion(document, position);
            return completions;
        } catch (error) {
            console.error('ACAS completion provider error:', error);
            return [];
        }
    }

    resolveCompletionItem(
        item: vscode.CompletionItem,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CompletionItem> {
        // Add additional details if needed
        return item;
    }
}
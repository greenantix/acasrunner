import * as vscode from 'vscode';
import { AIAssistant } from '../ai/ai-assistant';

export class ACASHoverProvider implements vscode.HoverProvider {
    private aiAssistant: AIAssistant;

    constructor(aiAssistant: AIAssistant) {
        this.aiAssistant = aiAssistant;
    }

    async provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.Hover | null> {
        // Only provide hover info if configured to do so
        const config = vscode.workspace.getConfiguration('acas');
        if (!config.get('showInlineHints')) {
            return null;
        }

        try {
            const hover = await this.aiAssistant.provideHover(document, position);
            return hover;
        } catch (error) {
            console.error('ACAS hover provider error:', error);
            return null;
        }
    }
}
import * as vscode from 'vscode';
import { AIAssistant } from '../ai/ai-assistant';

export class leoHoverProvider implements vscode.HoverProvider {
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
        const config = vscode.workspace.getConfiguration('leo');
        if (!config.get('showInlineHints')) {
            return null;
        }

        try {
            const hover = await this.aiAssistant.provideHover(document, position);
            return hover;
        } catch (error) {
            console.error('leo hover provider error:', error);
            return null;
        }
    }
}

import { 
  ExportFormat, 
  ChatSession, 
  ChatMessage, 
  MarkdownExportOptions,
  HTMLExportOptions,
  PDFExportOptions,
  DocxExportOptions
} from '@/types/chat';
import { chatService } from './chat-service';

export class ExportService {
  async exportToMarkdown(
    sessionId: string, 
    options: MarkdownExportOptions = {
      includeMetadata: true,
      includeTimestamps: true,
      codeBlockLanguage: 'markdown',
      headerLevel: 1
    }
  ): Promise<string> {
    const session = await chatService.getSession(sessionId);
    const messages = await chatService.getMessages(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    let markdown = '';
    
    // Header
    markdown += `${'#'.repeat(options.headerLevel)} ${session.name}\n\n`;
    
    if (options.includeMetadata) {
      markdown += `**Provider:** ${session.provider}\n`;
      markdown += `**Model:** ${session.model}\n`;
      markdown += `**Created:** ${session.created.toLocaleDateString()}\n`;
      markdown += `**Messages:** ${session.metadata.messageCount}\n`;
      if (session.metadata.totalTokens) {
        markdown += `**Total Tokens:** ${session.metadata.totalTokens}\n`;
      }
      markdown += '\n---\n\n';
    }

    // Messages
    for (const message of messages) {
      const roleIcon = message.role === 'user' ? '👤' : message.role === 'assistant' ? '🤖' : '⚙️';
      markdown += `### ${roleIcon} ${message.role.charAt(0).toUpperCase() + message.role.slice(1)}\n\n`;
      
      if (options.includeTimestamps) {
        markdown += `*${message.timestamp.toLocaleString()}*\n\n`;
      }
      
      // Format code blocks
      const content = this.formatCodeInMarkdown(message.content);
      markdown += `${content}\n\n`;
      
      // Attachments
      if (message.metadata.attachments && message.metadata.attachments.length > 0) {
        markdown += '**Attachments:**\n';
        for (const attachment of message.metadata.attachments) {
          markdown += `- ${attachment.name} (${attachment.type})\n`;
        }
        markdown += '\n';
      }
      
      markdown += '---\n\n';
    }

    return markdown;
  }

  async exportToJSON(sessionId: string, includeMetadata: boolean = true): Promise<string> {
    const session = await chatService.getSession(sessionId);
    const messages = await chatService.getMessages(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const exportData = {
      session: includeMetadata ? session : {
        id: session.id,
        name: session.name,
        provider: session.provider,
        model: session.model
      },
      messages: messages.map(message => includeMetadata ? message : {
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp
      }),
      exportedAt: new Date().toISOString(),
      format: 'json',
      version: '1.0'
    };

    return JSON.stringify(exportData, null, 2);
  }

  async exportToHTML(
    sessionId: string, 
    options: HTMLExportOptions = {
      includeCSS: true,
      darkMode: false,
      includeMetadata: true
    }
  ): Promise<string> {
    const session = await chatService.getSession(sessionId);
    const messages = await chatService.getMessages(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    const css = options.includeCSS ? this.getHTMLStyles(options.darkMode) : '';
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${session.name}</title>
    ${css ? `<style>${css}</style>` : ''}
</head>
<body class="${options.darkMode ? 'dark' : 'light'}">
    <div class="chat-container">
        <header class="chat-header">
            <h1>${session.name}</h1>`;

    if (options.includeMetadata) {
      html += `
            <div class="metadata">
                <p><strong>Provider:</strong> ${session.provider}</p>
                <p><strong>Model:</strong> ${session.model}</p>
                <p><strong>Created:</strong> ${session.created.toLocaleDateString()}</p>
                <p><strong>Messages:</strong> ${session.metadata.messageCount}</p>
            </div>`;
    }

    html += `
        </header>
        <main class="messages">`;

    for (const message of messages) {
      const roleClass = `message-${message.role}`;
      const roleIcon = message.role === 'user' ? '👤' : message.role === 'assistant' ? '🤖' : '⚙️';
      
      html += `
            <div class="message ${roleClass}">
                <div class="message-header">
                    <span class="role-icon">${roleIcon}</span>
                    <span class="role-name">${message.role}</span>
                    <span class="timestamp">${message.timestamp.toLocaleString()}</span>
                </div>
                <div class="message-content">
                    ${this.formatContentForHTML(message.content)}
                </div>`;
      
      if (message.metadata.attachments && message.metadata.attachments.length > 0) {
        html += `
                <div class="attachments">
                    <h4>Attachments:</h4>
                    <ul>`;
        for (const attachment of message.metadata.attachments) {
          html += `<li>${attachment.name} (${attachment.type})</li>`;
        }
        html += `
                    </ul>
                </div>`;
      }
      
      html += `
            </div>`;
    }

    html += `
        </main>
        <footer class="chat-footer">
            <p>Exported on ${new Date().toLocaleString()}</p>
        </footer>
    </div>
</body>
</html>`;

    return html;
  }

  async exportToPlaintext(sessionId: string): Promise<string> {
    const session = await chatService.getSession(sessionId);
    const messages = await chatService.getMessages(sessionId);
    
    if (!session) {
      throw new Error('Session not found');
    }

    let text = `${session.name}\n`;
    text += `${'='.repeat(session.name.length)}\n\n`;
    text += `Provider: ${session.provider}\n`;
    text += `Model: ${session.model}\n`;
    text += `Created: ${session.created.toLocaleDateString()}\n`;
    text += `Messages: ${session.metadata.messageCount}\n\n`;
    text += `${'-'.repeat(50)}\n\n`;

    for (const message of messages) {
      const roleLabel = message.role.toUpperCase();
      text += `[${roleLabel}] ${message.timestamp.toLocaleString()}\n`;
      text += `${message.content}\n\n`;
      
      if (message.metadata.attachments && message.metadata.attachments.length > 0) {
        text += 'Attachments:\n';
        for (const attachment of message.metadata.attachments) {
          text += `- ${attachment.name} (${attachment.type})\n`;
        }
        text += '\n';
      }
      
      text += `${'-'.repeat(30)}\n\n`;
    }

    text += `Exported on ${new Date().toLocaleString()}\n`;
    return text;
  }

  async exportToPDF(sessionId: string, options?: PDFExportOptions): Promise<Buffer> {
    // For now, we'll create a simple PDF using HTML conversion
    // In a real implementation, you'd use a library like puppeteer or jsPDF
    const htmlContent = await this.exportToHTML(sessionId, {
      includeCSS: true,
      darkMode: false,
      includeMetadata: true
    });

    // This is a placeholder - you'd need to implement actual PDF generation
    // using a library like puppeteer, jsPDF, or a server-side service
    throw new Error('PDF export not yet implemented. Please use HTML export for now.');
  }

  async exportToDocx(sessionId: string, options?: DocxExportOptions): Promise<Buffer> {
    // Placeholder for Word document export
    // You'd use a library like docx or mammoth.js for actual implementation
    throw new Error('DOCX export not yet implemented. Please use Markdown or HTML export for now.');
  }

  async exportMultipleSessions(sessionIds: string[], format: ExportFormat): Promise<string | Buffer> {
    const exports: string[] = [];
    
    for (const sessionId of sessionIds) {
      try {
        let content: string;
        
        switch (format) {
          case 'markdown':
            content = await this.exportToMarkdown(sessionId);
            break;
          case 'json':
            content = await this.exportToJSON(sessionId);
            break;
          case 'html':
            content = await this.exportToHTML(sessionId);
            break;
          case 'plaintext':
            content = await this.exportToPlaintext(sessionId);
            break;
          default:
            throw new Error(`Bulk export not supported for format: ${format}`);
        }
        
        exports.push(content);
      } catch (error) {
        console.error(`Failed to export session ${sessionId}:`, error);
        exports.push(`Error exporting session ${sessionId}: ${error.message}`);
      }
    }

    if (format === 'json') {
      return JSON.stringify({
        sessions: exports.map((content, index) => ({
          sessionId: sessionIds[index],
          content: JSON.parse(content)
        })),
        exportedAt: new Date().toISOString(),
        format: 'bulk-json'
      }, null, 2);
    }

    return exports.join('\n\n' + '='.repeat(80) + '\n\n');
  }

  // Helper methods
  private formatCodeInMarkdown(content: string): string {
    // Simple code block detection and formatting
    return content.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `\`\`\`${lang || ''}\n${code}\`\`\``;
    });
  }

  private formatContentForHTML(content: string): string {
    // Convert markdown-style formatting to HTML
    let html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');

    // Format code blocks
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code class="language-${lang || 'text'}">${code}</code></pre>`;
    });

    return html;
  }

  private getHTMLStyles(darkMode: boolean): string {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        ${darkMode ? 'background: #1a1a1a; color: #e1e1e1;' : 'background: #fff; color: #333;'}
      }
      
      .chat-container {
        max-width: 100%;
      }
      
      .chat-header {
        border-bottom: 1px solid ${darkMode ? '#333' : '#eee'};
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .chat-header h1 {
        margin: 0 0 10px 0;
        color: ${darkMode ? '#fff' : '#333'};
      }
      
      .metadata p {
        margin: 5px 0;
        color: ${darkMode ? '#ccc' : '#666'};
      }
      
      .message {
        margin-bottom: 30px;
        padding: 15px;
        border-radius: 8px;
        ${darkMode ? 'background: #2a2a2a;' : 'background: #f8f9fa;'}
      }
      
      .message-user {
        ${darkMode ? 'background: #1e3a8a;' : 'background: #e3f2fd;'}
      }
      
      .message-assistant {
        ${darkMode ? 'background: #166534;' : 'background: #f1f8e9;'}
      }
      
      .message-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        font-size: 14px;
        color: ${darkMode ? '#ccc' : '#666'};
      }
      
      .role-icon {
        font-size: 16px;
      }
      
      .role-name {
        font-weight: bold;
        text-transform: capitalize;
      }
      
      .timestamp {
        margin-left: auto;
        font-size: 12px;
      }
      
      .message-content {
        white-space: pre-wrap;
      }
      
      .attachments {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid ${darkMode ? '#444' : '#ddd'};
      }
      
      .attachments h4 {
        margin: 0 0 10px 0;
        font-size: 14px;
      }
      
      .attachments ul {
        margin: 0;
        padding-left: 20px;
      }
      
      pre {
        background: ${darkMode ? '#111' : '#f5f5f5'};
        padding: 15px;
        border-radius: 4px;
        overflow-x: auto;
      }
      
      code {
        background: ${darkMode ? '#333' : '#f0f0f0'};
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'Monaco', 'Consolas', monospace;
      }
      
      .chat-footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid ${darkMode ? '#333' : '#eee'};
        text-align: center;
        color: ${darkMode ? '#888' : '#666'};
        font-size: 14px;
      }
    `;
  }

  // Utility method to trigger download in browser
  static downloadFile(content: string | Buffer, filename: string, mimeType?: string) {
    if (typeof window === 'undefined') {
      throw new Error('Download only available in browser environment');
    }

    const blob = new Blob([content], { 
      type: mimeType || 'application/octet-stream' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const exportService = new ExportService();
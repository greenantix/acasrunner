import * as vscode from 'vscode';
import WebSocket from 'ws';
import axios from 'axios';

export class leoConnection {
    private ws: WebSocket | null = null;
    private serverUrl: string;
    private isConnected: boolean = false;
    private reconnectInterval: NodeJS.Timeout | null = null;
    private eventEmitter = new vscode.EventEmitter<any>();

    constructor() {
        const config = vscode.workspace.getConfiguration('leo');
        this.serverUrl = config.get('serverUrl') as string;
    }

    public readonly onMessage = this.eventEmitter.event;

    async connect(): Promise<void> {
        if (this.isConnected) {
            return;
        }

        try {
            // Test HTTP connection first
            await this.testConnection();
            
            // Establish WebSocket connection
            const wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/api/extension/ws';
            this.ws = new WebSocket(wsUrl);

            return new Promise((resolve, reject) => {
                if (!this.ws) {
                    reject(new Error('Failed to create WebSocket'));
                    return;
                }

                this.ws.on('open', () => {
                    console.log('Connected to leo Runner');
                    this.isConnected = true;
                    this.startHeartbeat();
                    resolve();
                });

                this.ws.on('message', (data: WebSocket.Data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('Failed to parse message:', error);
                    }
                });

                this.ws.on('close', () => {
                    console.log('Disconnected from leo Runner');
                    this.isConnected = false;
                    this.scheduleReconnect();
                });

                this.ws.on('error', (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                });

                // Timeout after 10 seconds
                setTimeout(() => {
                    if (!this.isConnected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 10000);
            });
        } catch (error) {
            throw new Error(`Failed to connect to leo Runner: ${error}`);
        }
    }

    async disconnect(): Promise<void> {
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.isConnected = false;
    }

    private async testConnection(): Promise<void> {
        try {
            const response = await axios.get(`${this.serverUrl}/api/health`, {
                timeout: 5000
            });
            
            if (response.status !== 200) {
                throw new Error(`Server returned status ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Cannot reach leo Runner at ${this.serverUrl}`);
        }
    }

    private startHeartbeat(): void {
        setInterval(() => {
            if (this.isConnected && this.ws) {
                this.send({ type: 'ping' });
            }
        }, 30000); // Ping every 30 seconds
    }

    private scheduleReconnect(): void {
        if (this.reconnectInterval) {
            return;
        }

        this.reconnectInterval = setInterval(async () => {
            try {
                await this.connect();
                if (this.reconnectInterval) {
                    clearInterval(this.reconnectInterval);
                    this.reconnectInterval = null;
                }
            } catch (error) {
                console.log('Reconnection attempt failed, will retry...');
            }
        }, 5000); // Try to reconnect every 5 seconds
    }

    private handleMessage(message: any): void {
        switch (message.type) {
            case 'activity':
                this.eventEmitter.fire({ type: 'activity', data: message.data });
                break;
            case 'notification':
                vscode.window.showInformationMessage(message.message);
                break;
            case 'error':
                vscode.window.showErrorMessage(message.message);
                break;
            case 'workflow_status':
                this.eventEmitter.fire({ type: 'workflow_status', data: message.data });
                break;
            case 'ai_response':
                this.eventEmitter.fire({ type: 'ai_response', data: message.data });
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    }

    public send(message: any): void {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('Cannot send message: not connected to leo Runner');
        }
    }

    public async sendHTTP(endpoint: string, data?: any): Promise<any> {
        try {
            const url = `${this.serverUrl}/api/${endpoint}`;
            const response = data 
                ? await axios.post(url, data)
                : await axios.get(url);
            
            return response.data;
        } catch (error) {
            throw new Error(`HTTP request failed: ${error}`);
        }
    }

    public getIsConnected(): boolean {
        return this.isConnected;
    }

    public getServerUrl(): string {
        return this.serverUrl;
    }
}

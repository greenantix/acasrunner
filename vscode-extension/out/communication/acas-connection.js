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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leoConnection = void 0;
const vscode = __importStar(require("vscode"));
const ws_1 = __importDefault(require("ws"));
const axios_1 = __importDefault(require("axios"));
class leoConnection {
    constructor() {
        this.ws = null;
        this.isConnected = false;
        this.reconnectInterval = null;
        this.eventEmitter = new vscode.EventEmitter();
        this.onMessage = this.eventEmitter.event;
        const config = vscode.workspace.getConfiguration('leo');
        this.serverUrl = config.get('serverUrl');
    }
    async connect() {
        if (this.isConnected) {
            return;
        }
        try {
            // Test HTTP connection first
            await this.testConnection();
            // Establish WebSocket connection
            const wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/api/extension/ws';
            this.ws = new ws_1.default(wsUrl);
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
                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleMessage(message);
                    }
                    catch (error) {
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
        }
        catch (error) {
            throw new Error(`Failed to connect to leo Runner: ${error}`);
        }
    }
    async disconnect() {
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
    async testConnection() {
        try {
            const response = await axios_1.default.get(`${this.serverUrl}/api/health`, {
                timeout: 5000
            });
            if (response.status !== 200) {
                throw new Error(`Server returned status ${response.status}`);
            }
        }
        catch (error) {
            throw new Error(`Cannot reach leo Runner at ${this.serverUrl}`);
        }
    }
    startHeartbeat() {
        setInterval(() => {
            if (this.isConnected && this.ws) {
                this.send({ type: 'ping' });
            }
        }, 30000); // Ping every 30 seconds
    }
    scheduleReconnect() {
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
            }
            catch (error) {
                console.log('Reconnection attempt failed, will retry...');
            }
        }, 5000); // Try to reconnect every 5 seconds
    }
    handleMessage(message) {
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
    send(message) {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify(message));
        }
        else {
            console.warn('Cannot send message: not connected to leo Runner');
        }
    }
    async sendHTTP(endpoint, data) {
        try {
            const url = `${this.serverUrl}/api/${endpoint}`;
            const response = data
                ? await axios_1.default.post(url, data)
                : await axios_1.default.get(url);
            return response.data;
        }
        catch (error) {
            throw new Error(`HTTP request failed: ${error}`);
        }
    }
    getIsConnected() {
        return this.isConnected;
    }
    getServerUrl() {
        return this.serverUrl;
    }
}
exports.leoConnection = leoConnection;
//# sourceMappingURL=leo-connection.js.map

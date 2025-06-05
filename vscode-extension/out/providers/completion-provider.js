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
exports.ACASCompletionProvider = void 0;
const vscode = __importStar(require("vscode"));
class ACASCompletionProvider {
    constructor(aiAssistant) {
        this.aiAssistant = aiAssistant;
    }
    async provideCompletionItems(document, position, token, context) {
        // Only provide completions if configured to do so
        const config = vscode.workspace.getConfiguration('acas');
        if (!config.get('showInlineHints')) {
            return [];
        }
        try {
            const completions = await this.aiAssistant.provideCodeCompletion(document, position);
            return completions;
        }
        catch (error) {
            console.error('ACAS completion provider error:', error);
            return [];
        }
    }
    resolveCompletionItem(item, token) {
        // Add additional details if needed
        return item;
    }
}
exports.ACASCompletionProvider = ACASCompletionProvider;
//# sourceMappingURL=completion-provider.js.map
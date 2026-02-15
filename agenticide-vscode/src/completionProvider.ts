/**
 * Inline Completion Provider - Ghost text autocomplete like Copilot
 */
import * as vscode from 'vscode';
import { AIProviderManager } from './aiProviders';

export class AgenticideCompletionProvider implements vscode.InlineCompletionItemProvider {
    private aiProvider: AIProviderManager;
    private lastTriggerTime = 0;
    private debounceMs = 300; // Wait 300ms after typing stops
    private cache = new Map<string, { completion: string; timestamp: number }>();
    private cacheTTL = 60000; // 1 minute cache

    constructor(aiProvider: AIProviderManager) {
        this.aiProvider = aiProvider;
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | undefined> {
        // Debounce: Don't trigger too frequently
        const now = Date.now();
        if (now - this.lastTriggerTime < this.debounceMs) {
            return undefined;
        }
        this.lastTriggerTime = now;

        // Check if user is actively typing (not just invoked manually)
        if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic) {
            // Get text around cursor
            const line = document.lineAt(position.line);
            const textBeforeCursor = line.text.substring(0, position.character);
            
            // Only trigger if there's meaningful context
            if (textBeforeCursor.trim().length < 2) {
                return undefined;
            }
        }

        try {
            // Build context
            const beforeCursor = this.getTextBeforeCursor(document, position, 50);
            const afterCursor = this.getTextAfterCursor(document, position, 20);
            
            // Check cache
            const cacheKey = `${document.uri.toString()}:${position.line}:${position.character}:${beforeCursor}`;
            const cached = this.cache.get(cacheKey);
            if (cached && now - cached.timestamp < this.cacheTTL) {
                return [new vscode.InlineCompletionItem(cached.completion)];
            }

            // Build prompt for AI
            const prompt = this.buildCompletionPrompt(document, position, beforeCursor, afterCursor);
            
            // Get completion from AI (with timeout)
            const completionPromise = this.getAICompletion(prompt, document.languageId);
            const timeoutPromise = new Promise<string>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
            );
            
            const completion = await Promise.race([completionPromise, timeoutPromise]) as string;
            
            if (!completion || completion.trim().length === 0) {
                return undefined;
            }

            // Cache the result
            this.cache.set(cacheKey, { completion, timestamp: now });
            
            // Clean old cache entries
            if (this.cache.size > 100) {
                const oldestKey = Array.from(this.cache.keys())[0];
                this.cache.delete(oldestKey);
            }

            // Return as inline completion item
            return [new vscode.InlineCompletionItem(completion)];

        } catch (error) {
            // Silently fail - don't interrupt user
            console.error('Completion error:', error);
            return undefined;
        }
    }

    private getTextBeforeCursor(document: vscode.TextDocument, position: vscode.Position, lines: number): string {
        const startLine = Math.max(0, position.line - lines);
        const range = new vscode.Range(startLine, 0, position.line, position.character);
        return document.getText(range);
    }

    private getTextAfterCursor(document: vscode.TextDocument, position: vscode.Position, lines: number): string {
        const endLine = Math.min(document.lineCount - 1, position.line + lines);
        const range = new vscode.Range(position.line, position.character, endLine, Number.MAX_SAFE_INTEGER);
        return document.getText(range);
    }

    private buildCompletionPrompt(
        document: vscode.TextDocument,
        position: vscode.Position,
        beforeCursor: string,
        afterCursor: string
    ): string {
        const fileName = vscode.workspace.asRelativePath(document.uri);
        const language = document.languageId;
        
        return `Continue this ${language} code. Generate ONLY the next 1-3 lines. Do NOT include explanations or the code that's already written.

File: ${fileName}
Language: ${language}

Code before cursor:
\`\`\`${language}
${beforeCursor}
\`\`\`

Code after cursor:
\`\`\`${language}
${afterCursor}
\`\`\`

Generate the completion (only the new code):`;
    }

    private async getAICompletion(prompt: string, language: string): Promise<string> {
        try {
            // Use AI provider to get completion
            const response = await this.aiProvider.sendMessage(prompt, {
                maxTokens: 100, // Short completions only
                temperature: 0.3, // More deterministic
                stopSequences: ['\n\n', '```'] // Stop at double newline or code block
            });

            // Extract just the code completion
            let completion = response.trim();
            
            // Remove markdown code blocks if present
            completion = completion.replace(/```[\w]*\n?/g, '');
            completion = completion.replace(/```$/g, '');
            
            // Remove explanatory text
            const lines = completion.split('\n');
            const codeLines = lines.filter(line => {
                const trimmed = line.trim();
                // Skip lines that look like explanations
                return !trimmed.match(/^(Here|This|The|I've|Let|We)/i) &&
                       !trimmed.endsWith(':') &&
                       trimmed.length > 0;
            });
            
            completion = codeLines.join('\n');
            
            // Limit to 3 lines max
            const limitedLines = completion.split('\n').slice(0, 3);
            completion = limitedLines.join('\n');
            
            return completion;

        } catch (error) {
            console.error('AI completion failed:', error);
            return '';
        }
    }

    public clearCache(): void {
        this.cache.clear();
    }
}

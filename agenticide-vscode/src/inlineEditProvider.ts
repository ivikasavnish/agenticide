/**
 * Inline Edit Provider - Cmd+K style editing like Cursor
 */
import * as vscode from 'vscode';
import { AIProviderManager } from './aiProviders';

export class InlineEditProvider {
    private aiProvider: AIProviderManager;
    private decorationType: vscode.TextEditorDecorationType;
    private currentEdit: {
        editor: vscode.TextEditor;
        range: vscode.Range;
        original: string;
        decoration: vscode.DecorationOptions[];
    } | null = null;

    constructor(aiProvider: AIProviderManager) {
        this.aiProvider = aiProvider;
        
        // Create decoration for preview
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('diffEditor.insertedTextBackground'),
            border: '1px solid',
            borderColor: new vscode.ThemeColor('diffEditor.insertedLineBackground'),
            isWholeLine: false,
            after: {
                contentText: ' ← AI suggestion',
                color: new vscode.ThemeColor('editorCodeLens.foreground'),
                fontStyle: 'italic'
            }
        });
    }

    /**
     * Edit selected code with AI instructions
     */
    async editSelection(editor: vscode.TextEditor | undefined, instructions?: string): Promise<void> {
        if (!editor) {
            editor = vscode.window.activeTextEditor;
        }
        
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('Select code first, then use Cmd+K to edit');
            return;
        }

        const selectedText = editor.document.getText(selection);
        
        // Get instructions from user
        if (!instructions) {
            instructions = await vscode.window.showInputBox({
                prompt: 'How should I modify this code?',
                placeHolder: 'e.g., "add error handling", "optimize for performance", "add comments"'
            });
        }

        if (!instructions) {
            return; // User cancelled
        }

        // Show progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Agenticide: Generating edit...',
            cancellable: true
        }, async (progress, token) => {
            try {
                // Build prompt
                const prompt = this.buildEditPrompt(
                    editor!.document,
                    selectedText,
                    instructions!,
                    selection
                );

                // Get AI response
                const editedCode = await this.getAIEdit(prompt, editor!.document.languageId);
                
                if (token.isCancellationRequested) {
                    return;
                }

                if (!editedCode) {
                    vscode.window.showErrorMessage('Failed to generate edit');
                    return;
                }

                // Show diff and ask user to accept/reject
                await this.showDiffAndApply(editor!, selection, selectedText, editedCode, instructions!);

            } catch (error: any) {
                vscode.window.showErrorMessage(`Edit failed: ${error.message}`);
            }
        });
    }

    private buildEditPrompt(
        document: vscode.TextDocument,
        selectedText: string,
        instructions: string,
        selection: vscode.Selection
    ): string {
        const fileName = vscode.workspace.asRelativePath(document.uri);
        const language = document.languageId;
        
        // Get surrounding context
        const contextBefore = this.getContextBefore(document, selection.start, 10);
        const contextAfter = this.getContextAfter(document, selection.end, 10);

        return `Modify this ${language} code according to the instructions. Return ONLY the modified code, no explanations.

File: ${fileName}
Language: ${language}

Context before:
\`\`\`${language}
${contextBefore}
\`\`\`

Code to modify:
\`\`\`${language}
${selectedText}
\`\`\`

Context after:
\`\`\`${language}
${contextAfter}
\`\`\`

Instructions: ${instructions}

Return the modified code (only the code that replaces the selection):`;
    }

    private getContextBefore(document: vscode.TextDocument, position: vscode.Position, lines: number): string {
        const startLine = Math.max(0, position.line - lines);
        const range = new vscode.Range(startLine, 0, position.line, 0);
        return document.getText(range);
    }

    private getContextAfter(document: vscode.TextDocument, position: vscode.Position, lines: number): string {
        const endLine = Math.min(document.lineCount - 1, position.line + lines);
        const range = new vscode.Range(position.line, 0, endLine, Number.MAX_SAFE_INTEGER);
        return document.getText(range);
    }

    private async getAIEdit(prompt: string, language: string): Promise<string> {
        const response = await this.aiProvider.sendMessage(prompt, {
            maxTokens: 1000,
            temperature: 0.2 // More deterministic
        });

        // Extract code from response
        let code = response.trim();
        
        // Remove markdown code blocks
        const codeBlockMatch = code.match(/```[\w]*\n([\s\S]*?)\n```/);
        if (codeBlockMatch) {
            code = codeBlockMatch[1];
        } else {
            // Remove inline code markers
            code = code.replace(/```[\w]*\n?/g, '');
            code = code.replace(/```$/g, '');
        }

        return code.trim();
    }

    private async showDiffAndApply(
        editor: vscode.TextEditor,
        range: vscode.Range,
        original: string,
        edited: string,
        instructions: string
    ): Promise<void> {
        // Create temporary files for diff
        const originalUri = vscode.Uri.parse(`agenticide-original:/${Date.now()}.${editor.document.languageId}`);
        const editedUri = vscode.Uri.parse(`agenticide-edited:/${Date.now()}.${editor.document.languageId}`);

        // Register text document content providers
        const originalProvider = new (class implements vscode.TextDocumentContentProvider {
            provideTextDocumentContent(uri: vscode.Uri): string {
                return original;
            }
        })();
        
        const editedProvider = new (class implements vscode.TextDocumentContentProvider {
            provideTextDocumentContent(uri: vscode.Uri): string {
                return edited;
            }
        })();

        const originalDisposable = vscode.workspace.registerTextDocumentContentProvider('agenticide-original', originalProvider);
        const editedDisposable = vscode.workspace.registerTextDocumentContentProvider('agenticide-edited', editedProvider);

        try {
            // Show diff
            await vscode.commands.executeCommand(
                'vscode.diff',
                originalUri,
                editedUri,
                `Agenticide Edit: "${instructions}"`
            );

            // Ask user to accept or reject
            const choice = await vscode.window.showInformationMessage(
                `Apply this edit? "${instructions}"`,
                { modal: true },
                'Accept',
                'Reject',
                'Edit Instructions'
            );

            if (choice === 'Accept') {
                // Apply the edit
                await editor.edit(editBuilder => {
                    editBuilder.replace(range, edited);
                });
                vscode.window.showInformationMessage('✅ Edit applied');
            } else if (choice === 'Edit Instructions') {
                // Retry with new instructions
                const newInstructions = await vscode.window.showInputBox({
                    prompt: 'Enter new instructions',
                    value: instructions
                });
                if (newInstructions) {
                    await this.editSelection(editor, newInstructions);
                }
            } else {
                vscode.window.showInformationMessage('Edit rejected');
            }
        } finally {
            originalDisposable.dispose();
            editedDisposable.dispose();
        }
    }

    dispose(): void {
        this.decorationType.dispose();
    }
}

/**
 * Quick Edit Command - Cmd+K shortcut
 */
export async function quickEdit(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    // Show quick pick with common edit actions
    const action = await vscode.window.showQuickPick([
        { label: '$(edit) Custom Instructions', description: 'Type your own instructions', value: 'custom' },
        { label: '$(wrench) Fix Issues', description: 'Fix bugs and errors', value: 'fix' },
        { label: '$(beaker) Add Tests', description: 'Generate unit tests', value: 'tests' },
        { label: '$(comment) Add Comments', description: 'Add documentation comments', value: 'comments' },
        { label: '$(symbol-method) Refactor', description: 'Improve code quality', value: 'refactor' },
        { label: '$(zap) Optimize', description: 'Improve performance', value: 'optimize' },
        { label: '$(shield) Add Error Handling', description: 'Add try-catch and validation', value: 'errors' }
    ], {
        placeHolder: 'What do you want to do with this code?'
    });

    if (!action) {
        return;
    }

    let instructions: string;
    if (action.value === 'custom') {
        const input = await vscode.window.showInputBox({
            prompt: 'How should I modify this code?',
            placeHolder: 'e.g., "convert to async/await", "add type hints"'
        });
        if (!input) return;
        instructions = input;
    } else {
        instructions = action.description;
    }

    // Get the inline edit provider from extension context
    const inlineEditProvider = (global as any).agenticideInlineEditProvider;
    if (inlineEditProvider) {
        await inlineEditProvider.editSelection(editor, instructions);
    }
}

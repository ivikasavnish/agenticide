// Context Attachment System - Handle @file references, paste, and git tracking
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class ContextAttachment {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.attachmentsDir = path.join(
            process.env.HOME || process.env.USERPROFILE,
            '.agenticide',
            'attachments'
        );
        
        // Ensure attachments directory exists
        if (!fs.existsSync(this.attachmentsDir)) {
            fs.mkdirSync(this.attachmentsDir, { recursive: true });
        }
    }

    /**
     * Parse message for @file references
     * Supports: @file.txt, @src/app.js, @"file with spaces.js"
     */
    parseFileReferences(message) {
        const references = [];
        // Match @filename or @"filename with spaces"
        const pattern = /@(?:"([^"]+)"|(\S+))/g;
        let match;

        while ((match = pattern.exec(message)) !== null) {
            const filename = match[1] || match[2];
            references.push({
                raw: match[0],
                filename: filename,
                position: match.index
            });
        }

        return references;
    }

    /**
     * Resolve file reference to actual path
     */
    resolveFilePath(filename) {
        // Try relative to current directory
        let fullPath = path.resolve(this.projectPath, filename);
        if (fs.existsSync(fullPath)) {
            return fullPath;
        }

        // Try relative to project root if in git repo
        const gitRoot = this.getGitRoot();
        if (gitRoot) {
            fullPath = path.resolve(gitRoot, filename);
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }

        return null;
    }

    /**
     * Get git repository root
     */
    getGitRoot() {
        try {
            return execSync('git rev-parse --show-toplevel', {
                cwd: this.projectPath,
                encoding: 'utf8'
            }).trim();
        } catch (error) {
            return null;
        }
    }

    /**
     * Get current git branch
     */
    getCurrentBranch() {
        try {
            return execSync('git rev-parse --abbrev-ref HEAD', {
                cwd: this.projectPath,
                encoding: 'utf8'
            }).trim();
        } catch (error) {
            return null;
        }
    }

    /**
     * Get current commit hash
     */
    getCurrentCommit() {
        try {
            return execSync('git rev-parse HEAD', {
                cwd: this.projectPath,
                encoding: 'utf8'
            }).trim();
        } catch (error) {
            return null;
        }
    }

    /**
     * Get file at specific commit
     */
    getFileAtCommit(filePath, commit) {
        try {
            const gitRoot = this.getGitRoot();
            if (!gitRoot) return null;

            const relativePath = path.relative(gitRoot, filePath);
            return execSync(`git show ${commit}:${relativePath}`, {
                cwd: gitRoot,
                encoding: 'utf8'
            });
        } catch (error) {
            return null;
        }
    }

    /**
     * Create git-aware softlink metadata
     */
    createGitLink(filePath) {
        const gitRoot = this.getGitRoot();
        if (!gitRoot) {
            return {
                path: filePath,
                relativePath: path.relative(this.projectPath, filePath),
                gitTracked: false
            };
        }

        const relativePath = path.relative(gitRoot, filePath);
        const branch = this.getCurrentBranch();
        const commit = this.getCurrentCommit();

        return {
            path: filePath,
            relativePath: relativePath,
            gitTracked: true,
            gitRoot: gitRoot,
            branch: branch,
            commit: commit,
            gitUrl: `git://${relativePath}#${branch}@${commit.substring(0, 7)}`
        };
    }

    /**
     * Read file content with git metadata
     */
    readFileWithMetadata(filePath) {
        try {
            const stats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            const gitLink = this.createGitLink(filePath);

            return {
                success: true,
                content: content,
                size: stats.size,
                modified: stats.mtime,
                lines: content.split('\n').length,
                ...gitLink
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                path: filePath
            };
        }
    }

    /**
     * Detect if input is pasted content (multi-line)
     */
    isPastedContent(input) {
        return input.includes('\n') && input.split('\n').length > 3;
    }

    /**
     * Save pasted content to temporary file with metadata
     */
    savePastedContent(content, sessionId = 'default') {
        const timestamp = Date.now();
        const hash = crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
        const filename = `paste-${sessionId}-${timestamp}-${hash}.txt`;
        const filePath = path.join(this.attachmentsDir, filename);

        const metadata = {
            type: 'paste',
            timestamp: new Date().toISOString(),
            sessionId: sessionId,
            lines: content.split('\n').length,
            size: Buffer.byteLength(content, 'utf8'),
            hash: hash
        };

        // Save content
        fs.writeFileSync(filePath, content);

        // Save metadata
        const metadataPath = `${filePath}.meta.json`;
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        return {
            success: true,
            path: filePath,
            metadata: metadata,
            reference: `@paste:${hash}`
        };
    }

    /**
     * Process message with attachments
     * Returns enhanced message and attachment metadata
     */
    processMessage(message, sessionId = 'default') {
        const result = {
            originalMessage: message,
            processedMessage: message,
            attachments: [],
            pastedContent: null,
            errors: []
        };

        // Check if message is pasted content
        if (this.isPastedContent(message)) {
            const pasteResult = this.savePastedContent(message, sessionId);
            result.pastedContent = pasteResult;
            result.attachments.push({
                type: 'paste',
                ...pasteResult
            });
        }

        // Parse @file references
        const references = this.parseFileReferences(message);
        
        for (const ref of references) {
            const filePath = this.resolveFilePath(ref.filename);
            
            if (filePath) {
                const fileData = this.readFileWithMetadata(filePath);
                
                if (fileData.success) {
                    result.attachments.push({
                        type: 'file',
                        reference: ref.raw,
                        filename: ref.filename,
                        ...fileData
                    });

                    // Replace @reference with file summary
                    const summary = this._formatFileSummary(fileData);
                    result.processedMessage = result.processedMessage.replace(
                        ref.raw,
                        `[File: ${ref.filename} (${fileData.lines} lines, ${fileData.gitUrl || 'not in git'})]`
                    );
                } else {
                    result.errors.push({
                        type: 'file_not_found',
                        reference: ref.raw,
                        filename: ref.filename,
                        error: fileData.error
                    });
                }
            } else {
                result.errors.push({
                    type: 'file_not_found',
                    reference: ref.raw,
                    filename: ref.filename,
                    error: 'File not found'
                });
            }
        }

        return result;
    }

    /**
     * Format file summary for display
     */
    _formatFileSummary(fileData) {
        const parts = [
            `Path: ${fileData.relativePath}`,
            `Lines: ${fileData.lines}`,
            `Size: ${this._formatBytes(fileData.size)}`
        ];

        if (fileData.gitTracked) {
            parts.push(`Git: ${fileData.branch}@${fileData.commit.substring(0, 7)}`);
        }

        return parts.join(', ');
    }

    /**
     * Format bytes to human readable
     */
    _formatBytes(bytes) {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }

    /**
     * Create attachment summary for AI context
     */
    createContextSummary(attachments) {
        if (attachments.length === 0) return '';

        const lines = ['\n--- Attached Context ---'];

        for (const attachment of attachments) {
            if (attachment.type === 'file') {
                lines.push(`\nFile: ${attachment.filename}`);
                if (attachment.gitUrl) {
                    lines.push(`Location: ${attachment.gitUrl}`);
                }
                lines.push(`Content:\n${attachment.content}`);
            } else if (attachment.type === 'paste') {
                lines.push(`\nPasted Content (${attachment.metadata.lines} lines):`);
                lines.push(attachment.content || '');
            }
        }

        lines.push('--- End Context ---\n');

        return lines.join('\n');
    }

    /**
     * Save session with attachment references
     */
    saveSessionAttachments(sessionId, attachments) {
        const sessionAttachmentsFile = path.join(
            this.attachmentsDir,
            `session-${sessionId}-attachments.json`
        );

        const data = {
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
            attachments: attachments.map(a => ({
                type: a.type,
                reference: a.reference,
                path: a.path,
                gitUrl: a.gitUrl,
                metadata: a.metadata
            }))
        };

        fs.writeFileSync(sessionAttachmentsFile, JSON.stringify(data, null, 2));

        return sessionAttachmentsFile;
    }

    /**
     * Load session attachments
     */
    loadSessionAttachments(sessionId) {
        const sessionAttachmentsFile = path.join(
            this.attachmentsDir,
            `session-${sessionId}-attachments.json`
        );

        if (fs.existsSync(sessionAttachmentsFile)) {
            return JSON.parse(fs.readFileSync(sessionAttachmentsFile, 'utf8'));
        }

        return null;
    }

    /**
     * List all attachments for a session
     */
    listAttachments(sessionId = null) {
        const files = fs.readdirSync(this.attachmentsDir);
        const pattern = sessionId 
            ? new RegExp(`session-${sessionId}-attachments\\.json`)
            : /session-.*-attachments\.json/;

        return files
            .filter(f => pattern.test(f))
            .map(f => {
                const data = JSON.parse(
                    fs.readFileSync(path.join(this.attachmentsDir, f), 'utf8')
                );
                return data;
            });
    }

    /**
     * Clean old attachments (older than specified days)
     */
    cleanOldAttachments(days = 30) {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const files = fs.readdirSync(this.attachmentsDir);
        let cleaned = 0;

        for (const file of files) {
            const filePath = path.join(this.attachmentsDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime.getTime() < cutoff) {
                fs.unlinkSync(filePath);
                cleaned++;
            }
        }

        return cleaned;
    }
}

module.exports = ContextAttachment;

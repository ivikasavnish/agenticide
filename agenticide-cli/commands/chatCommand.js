// Chat command extracted from index.js
// This is the main chat interface with all interactive features

module.exports = function createChatCommand(dependencies) {
    return async function chatAction(options) {
        // Load chat implementation from original index.js
        // For now, require the full implementation
        const chatImpl = require('./chat/fullChatImplementation');
        await chatImpl(options, dependencies);
    };
};

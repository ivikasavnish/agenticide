#!/bin/bash

# Agenticide IDE - Setup Script
# This script sets up the IDE tools and adds them to your PATH

set -e

INSTALL_DIR="$HOME/.agenticide"
BIN_DIR="$INSTALL_DIR/bin"

echo "🚀 Setting up Agenticide IDE..."

# Create directories
mkdir -p "$BIN_DIR"
mkdir -p "$INSTALL_DIR/config"

# Copy binaries
echo "📦 Installing binaries..."
cp /Users/vikasavnish/agenticide/lsp-manager/target/release/lsp_manager "$BIN_DIR/"
cp /Users/vikasavnish/agenticide/context-manager/target/release/context_manager "$BIN_DIR/"

# Make them executable
chmod +x "$BIN_DIR/lsp_manager"
chmod +x "$BIN_DIR/context_manager"

# Create aliases
cat > "$INSTALL_DIR/aliases.sh" << 'EOF'
# Agenticide IDE Aliases
export PATH="$HOME/.agenticide/bin:$PATH"

# Shortcuts
alias cm='context_manager'
alias lsp='lsp_manager'
alias cm-init='context_manager init'
alias cm-show='context_manager show'
alias cm-todo='context_manager add-todo'
alias cm-todos='context_manager list-todos'
alias cm-suggest='context_manager suggest'
alias cm-tool='context_manager tool'
EOF

# Create global config
cat > "$INSTALL_DIR/config/global.json" << 'EOF'
{
  "tools": {
    "lsp_manager": "~/.agenticide/bin/lsp_manager",
    "context_manager": "~/.agenticide/bin/context_manager"
  },
  "version": "0.1.0",
  "auto_suggest": true,
  "auto_track_conversations": true
}
EOF

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Add this to your ~/.bashrc or ~/.zshrc:"
echo "   source ~/.agenticide/aliases.sh"
echo ""
echo "2. Or run this now:"
echo "   source ~/.agenticide/aliases.sh"
echo ""
echo "3. Test the installation:"
echo "   cm --help"
echo "   lsp --help"
echo ""
echo "4. Initialize a project:"
echo "   cd /path/to/your/project"
echo "   cm init"
echo ""
echo "🎉 Enjoy your AI-powered IDE tools!"

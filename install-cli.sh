#!/bin/bash

# Agenticide CLI - Installation Script
set -e

INSTALL_DIR="$HOME/.agenticide"
BIN_DIR="$INSTALL_DIR/bin"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Installing Agenticide CLI..."
echo ""

# Create directories
mkdir -p "$BIN_DIR"
mkdir -p "$INSTALL_DIR/config"

# Check if binary exists
if [ ! -f "$SCRIPT_DIR/agenticide-bin" ]; then
    echo "⚠️  Binary not found. Building..."
    if command -v bun &> /dev/null; then
        cd "$SCRIPT_DIR"
        ./build-binary.sh
    else
        echo "❌ Error: agenticide-bin not found and bun is not installed"
        echo "   Please either:"
        echo "   1. Install bun: curl -fsSL https://bun.sh/install | bash"
        echo "   2. Or use Node.js directly: node agenticide-cli/index.js"
        exit 1
    fi
fi

# Install binary
echo "📦 Installing binary..."
cp "$SCRIPT_DIR/agenticide-bin" "$BIN_DIR/agenticide"
chmod +x "$BIN_DIR/agenticide"

# Also create symlink to CLI for development
if [ -d "$SCRIPT_DIR/agenticide-cli" ]; then
    ln -sf "$SCRIPT_DIR/agenticide-cli/index.js" "$BIN_DIR/agenticide-dev"
    chmod +x "$BIN_DIR/agenticide-dev"
fi

# Update PATH in shell configs
SHELL_CONFIG=""
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
fi

# Create aliases file
cat > "$INSTALL_DIR/aliases.sh" << 'EOF'
# Agenticide CLI
export PATH="$HOME/.agenticide/bin:$PATH"

# Aliases
alias agenticide-dev='node $HOME/.agenticide/bin/agenticide-dev'
EOF

# Add to shell config if not already present
if [ -n "$SHELL_CONFIG" ] && [ -f "$SHELL_CONFIG" ]; then
    if ! grep -q "source ~/.agenticide/aliases.sh" "$SHELL_CONFIG"; then
        echo "" >> "$SHELL_CONFIG"
        echo "# Agenticide CLI" >> "$SHELL_CONFIG"
        echo "source ~/.agenticide/aliases.sh" >> "$SHELL_CONFIG"
        echo "✅ Added to $SHELL_CONFIG"
    else
        echo "ℹ️  Already configured in $SHELL_CONFIG"
    fi
fi

# Create config
cat > "$INSTALL_DIR/config.json" << 'EOF'
{
  "version": "3.1.0",
  "extensions_enabled": true,
  "auto_hint": true
}
EOF

echo ""
echo "✅ Installation complete!"
echo ""
echo "📍 Installed to: $BIN_DIR/agenticide"
echo "📊 Size: $(du -h $BIN_DIR/agenticide | cut -f1)"
echo ""
echo "🎯 Next steps:"
echo ""
echo "1. Reload your shell:"
if [ -n "$SHELL_CONFIG" ]; then
    echo "   source $SHELL_CONFIG"
else
    echo "   source ~/.agenticide/aliases.sh"
fi
echo ""
echo "2. Or run directly:"
echo "   $BIN_DIR/agenticide"
echo ""
echo "3. Test installation:"
echo "   agenticide --version"
echo "   agenticide --help"
echo ""
echo "4. Start using:"
echo "   agenticide"
echo ""
echo "💡 For development (uses source):"
echo "   agenticide-dev"
echo ""
echo "🎉 Ready to code!"

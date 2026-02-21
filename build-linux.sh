#!/bin/bash

# Build Agenticide for Linux using Docker

set -e

VERSION="3.1.0"
RELEASE_DIR="release-v${VERSION}"

echo "🐧 Building Agenticide for Linux using Docker..."
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# Create release directory
mkdir -p "$RELEASE_DIR"

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    ARCH="x64"
elif [ "$ARCH" = "aarch64" ]; then
    ARCH="arm64"
fi

echo "📦 Building for Linux ${ARCH}..."
echo ""

# Build using Bun in Docker
docker run --rm \
    -v "$(pwd):/workspace" \
    -w /workspace \
    oven/bun:latest \
    bash -c "
        cd agenticide-cli && \
        bun build --compile --minify \
            --target=bun \
            --outfile=../${RELEASE_DIR}/agenticide \
            ./index.js
    "

# Package
PLATFORM_NAME="agenticide-linux-${ARCH}"
PACKAGE_DIR="${RELEASE_DIR}/${PLATFORM_NAME}"
mkdir -p "$PACKAGE_DIR"

# Copy files
cp "${RELEASE_DIR}/agenticide" "${PACKAGE_DIR}/"
cp RELEASE_NOTES.md "${PACKAGE_DIR}/" 2>/dev/null || true
cp INSTALL_GUIDE.md "${PACKAGE_DIR}/" 2>/dev/null || true
mkdir -p "${PACKAGE_DIR}/docs"
cp docs/*.md "${PACKAGE_DIR}/docs/" 2>/dev/null || true

# Create README
cat > "${PACKAGE_DIR}/README.md" << 'EOFREADME'
# Agenticide v3.1.0 - Linux

## Installation

```bash
# Make executable
chmod +x agenticide

# Move to PATH
sudo mv agenticide /usr/local/bin/

# Or user directory
mv agenticide ~/.local/bin/
```

## Test

```bash
agenticide --version
agenticide --help
agenticide
```

## Features
- 🌐 API Testing
- 🗄️ SQL Queries  
- 💡 Smart Hints
- 🚀 Code Generation
- 🖥️ Process Management

Visit: https://github.com/ivikasavnish/agenticide
EOFREADME

# Create tarball
echo ""
echo "📦 Creating tarball..."
cd "$RELEASE_DIR"
tar -czf "${PLATFORM_NAME}.tar.gz" "$PLATFORM_NAME"
cd ..

# Calculate SHA256
echo ""
echo "🔐 Calculating SHA256..."
if command -v shasum &> /dev/null; then
    SHA256=$(shasum -a 256 "${RELEASE_DIR}/${PLATFORM_NAME}.tar.gz" | awk '{print $1}')
else
    SHA256=$(sha256sum "${RELEASE_DIR}/${PLATFORM_NAME}.tar.gz" | awk '{print $1}')
fi

echo "$SHA256" > "${RELEASE_DIR}/${PLATFORM_NAME}.sha256"

echo ""
echo "✅ Linux Build Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 Package: ${RELEASE_DIR}/${PLATFORM_NAME}.tar.gz"
echo "📊 Size: $(du -h "${RELEASE_DIR}/${PLATFORM_NAME}.tar.gz" | cut -f1)"
echo "🔐 SHA256: $SHA256"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Upload to GitHub release:"
echo "   gh release upload v3.1.0 ${RELEASE_DIR}/${PLATFORM_NAME}.tar.gz"
echo ""
echo "2. Update Formula/agenticide.rb with SHA256:"
echo "   Linux x64: $SHA256"
echo ""
echo "🎉 Done!"

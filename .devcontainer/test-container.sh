#!/bin/bash
# DevContainer testing script

set -e

echo "🧪 Running DevContainer Tests"
echo "========================================"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Test function
test_command() {
    local name="$1"
    local command="$2"
    local expected="$3"
    
    echo -n "Testing: $name... "
    
    if output=$(eval "$command" 2>&1); then
        if [[ -z "$expected" ]] || echo "$output" | grep -q "$expected"; then
            echo -e "${GREEN}✓ PASSED${NC}"
            ((PASSED++))
            return 0
        fi
    fi
    
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Command: $command"
    echo "  Output: ${output:0:200}"
    ((FAILED++))
    return 1
}

echo ""
echo "1. System Tools"
echo "----------------"
test_command "Git" "git --version" "git version"
test_command "Node.js" "node --version" "v"
test_command "npm" "npm --version" ""
test_command "Bun" "bun --version" ""
test_command "Rust" "rustc --version" "rustc"
test_command "Cargo" "cargo --version" "cargo"
test_command "Go" "go version" "go version"
test_command "Python" "python3 --version" "Python"
test_command "GitHub CLI" "gh --version" "gh version"

echo ""
echo "2. Node.js Packages"
echo "-------------------"
test_command "TypeScript" "tsc --version" "Version"
test_command "ESLint" "eslint --version" ""
test_command "Prettier" "prettier --version" ""

echo ""
echo "3. Agenticide Installation"
echo "-------------------------"
test_command "Agenticide CLI" "agenticide --version" "3."
test_command "Agenticide Help" "agenticide --help" "AI Coding Assistant"

echo ""
echo "4. Dependencies Installed"
echo "------------------------"
test_command "CLI node_modules" "test -d /workspace/agenticide-cli/node_modules && echo 'exists'" "exists"
test_command "Core node_modules" "test -d /workspace/agenticide-core/node_modules && echo 'exists'" "exists"
test_command "VSCode node_modules" "test -d /workspace/agenticide-vscode/node_modules && echo 'exists'" "exists"

echo ""
echo "5. Configuration"
echo "---------------"
test_command "Config directory" "test -d ~/.agenticide && echo 'exists'" "exists"
test_command "Config file" "test -f ~/.agenticide/config.json && echo 'exists'" "exists"
test_command "Sessions directory" "test -d ~/.agenticide/sessions && echo 'exists'" "exists"

echo ""
echo "6. Workspace Permissions"
echo "------------------------"
test_command "Workspace writable" "test -w /workspace && echo 'writable'" "writable"
test_command "Git safe directory" "git config --get safe.directory" "/workspace"

echo ""
echo "7. Module Tests"
echo "---------------"
test_command "Context Attachment" "cd /workspace && node test-context-attachment.js" "All tests passed"
test_command "Bug Fixes" "cd /workspace && node test-all-bug-fixes.js" "passed"

echo ""
echo "8. Build Tests"
echo "--------------"
test_command "VSCode Extension Compile" "cd /workspace/agenticide-vscode && npm run compile 2>&1" ""

echo ""
echo "========================================"
echo "Results: ${GREEN}${PASSED} passed${NC}, ${RED}${FAILED} failed${NC}"
echo "========================================"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All DevContainer tests passed!${NC}"
    echo ""
    echo "DevContainer is ready for:"
    echo "  • agenticide chat"
    echo "  • Stub generation (/stub)"
    echo "  • Context attachments (@file)"
    echo "  • Multi-language development"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi

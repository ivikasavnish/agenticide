#!/bin/bash
cd ~/.agenticide/skills/builtin

# Create generate-tests.yml
cat > generate-tests.yml << 'EOF'
name: generate-tests
version: 1.0.0
category: generation
description: Generate unit tests for code
inputs:
  - name: code
    type: string
    required: true
outputs:
  - name: tests
    type: string
metadata:
  author: agenticide
  tags: [testing]
execution:
  type: ai-prompt
  model: claude-sonnet-4
  prompt: "Generate tests"
EOF

# Create remaining skills similarly
for skill in commit-message code-stats security-scan full-code-analysis; do
  cat > ${skill}.yml << EOF2
name: ${skill}
version: 1.0.0
category: analysis
description: Test skill ${skill}
inputs:
  - name: code
    type: string
    required: true
outputs:
  - name: result
    type: string
metadata:
  author: agenticide
execution:
  type: ai-prompt
  model: claude-sonnet-4
  prompt: "Test"
EOF2
done

ls -la

#!/bin/bash

echo "Testing /design command..."
echo ""
echo "Launching agenticide chat with /design command..."
echo ""

# Create a test script that sends /design to stdin
echo -e "/design\nexit" | timeout 10 node agenticide-cli/index.js chat || true

echo ""
echo "✓ Test complete - check output above"

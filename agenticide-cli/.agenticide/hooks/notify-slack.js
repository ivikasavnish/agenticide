#!/usr/bin/env node
// Example hook: Notify Slack about commits
const https = require('https');

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL;

if (!SLACK_WEBHOOK) {
    console.log('ℹ️  Skipping Slack notification (SLACK_WEBHOOK_URL not set)');
    process.exit(0);
}

const message = process.argv[2] || 'Code committed via Agenticide';
const branch = process.env.GIT_BRANCH || 'unknown';

const payload = JSON.stringify({
    text: `🚀 ${message}`,
    attachments: [{
        color: 'good',
        fields: [
            { title: 'Branch', value: branch, short: true },
            { title: 'Tool', value: 'Agenticide', short: true }
        ]
    }]
});

const url = new URL(SLACK_WEBHOOK);
const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
    }
};

const req = https.request(options, (res) => {
    if (res.statusCode === 200) {
        console.log('✅ Slack notification sent');
    } else {
        console.log(`⚠️  Slack notification failed: ${res.statusCode}`);
    }
});

req.on('error', (error) => {
    console.error('❌ Slack notification error:', error.message);
});

req.write(payload);
req.end();

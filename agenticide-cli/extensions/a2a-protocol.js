// A2A Protocol Extension - Agents to Agentic Communication
// Multi-agent collaboration, delegation, and orchestration
const { Extension } = require('../core/extensionManager');
const { EventEmitter } = require('events');
const chalk = require('chalk');
const crypto = require('crypto');

class A2AProtocolExtension extends Extension {
    constructor() {
        super();
        this.name = 'a2a-protocol';
        this.version = '1.0.0';
        this.description = 'Agent-to-Agent protocol for multi-agent collaboration';
        this.author = 'Agenticide';
        
        // Agent registry
        this.agents = new Map();
        this.agentCapabilities = new Map();
        this.agentConnections = new Map();
        
        // Communication channels
        this.messageQueue = [];
        this.eventBus = new EventEmitter();
        this.channels = new Map();
        
        // Collaboration state
        this.collaborations = new Map();
        this.delegations = new Map();
        this.taskAssignments = new Map();
        
        // Protocol config
        this.config = {
            messageTimeout: 30000,  // 30 seconds
            maxRetries: 3,
            heartbeatInterval: 5000,  // 5 seconds
            discoveryEnabled: true
        };

        this.commands = [
            {
                name: 'a2a',
                description: 'Agent-to-Agent protocol operations',
                usage: '/a2a <action> [args]',
                aliases: ['agents', 'collaborate']
            },
            {
                name: 'agent-network',
                description: 'Manage agent network',
                usage: '/agent-network <list|connect|disconnect>',
                aliases: ['network']
            },
            {
                name: 'collaborate',
                description: 'Start agent collaboration',
                usage: '/collaborate "<task>" --agents=<agent1,agent2>',
                aliases: ['team', 'multi-agent']
            },
            {
                name: 'delegate',
                description: 'Delegate task to another agent',
                usage: '/delegate "<task>" --to=<agent-id>',
                aliases: ['assign', 'handoff']
            }
        ];

        this.hooks = [];
    }

    async enable() {
        // Start heartbeat
        this.startHeartbeat();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log(chalk.green('✓ A2A Protocol enabled'));
        console.log(chalk.dim('  Multi-agent collaboration ready'));
        
        return { success: true, message: 'A2A Protocol active' };
    }

    async disable() {
        this.stopHeartbeat();
        this.disconnectAllAgents();
        
        return { success: true, message: 'A2A Protocol disabled' };
    }

    setupEventListeners() {
        // Message events
        this.eventBus.on('message:received', this.handleIncomingMessage.bind(this));
        this.eventBus.on('message:sent', this.handleOutgoingMessage.bind(this));
        
        // Agent events
        this.eventBus.on('agent:connected', this.handleAgentConnected.bind(this));
        this.eventBus.on('agent:disconnected', this.handleAgentDisconnected.bind(this));
        
        // Collaboration events
        this.eventBus.on('collaboration:started', this.handleCollaborationStarted.bind(this));
        this.eventBus.on('collaboration:completed', this.handleCollaborationCompleted.bind(this));
        
        // Task events
        this.eventBus.on('task:delegated', this.handleTaskDelegated.bind(this));
        this.eventBus.on('task:accepted', this.handleTaskAccepted.bind(this));
        this.eventBus.on('task:rejected', this.handleTaskRejected.bind(this));
    }

    async handleCommand(command, args, context) {
        switch (command) {
            case 'a2a':
            case 'agents':
                return await this.handleA2A(args, context);
            
            case 'agent-network':
            case 'network':
                return await this.handleNetwork(args, context);
            
            case 'collaborate':
            case 'team':
            case 'multi-agent':
                return await this.handleCollaborate(args, context);
            
            case 'delegate':
            case 'assign':
            case 'handoff':
                return await this.handleDelegate(args, context);
            
            default:
                return {
                    success: false,
                    message: `Unknown command: ${command}`
                };
        }
    }

    async handleA2A(args, context) {
        const action = args[0];
        
        switch (action) {
            case 'register':
                return await this.registerAgent(args.slice(1), context);
            
            case 'send':
                return await this.sendMessage(args.slice(1), context);
            
            case 'broadcast':
                return await this.broadcast(args.slice(1), context);
            
            case 'status':
                return this.getProtocolStatus();
            
            case 'channels':
                return this.listChannels();
            
            default:
                return {
                    success: false,
                    message: 'Usage: /a2a <register|send|broadcast|status|channels> [args]'
                };
        }
    }

    async handleNetwork(args, context) {
        const action = args[0];
        
        switch (action) {
            case 'list':
                return this.listAgents();
            
            case 'connect':
                return await this.connectToAgent(args[1]);
            
            case 'disconnect':
                return await this.disconnectFromAgent(args[1]);
            
            case 'discover':
                return await this.discoverAgents();
            
            default:
                return {
                    success: false,
                    message: 'Usage: /agent-network <list|connect|disconnect|discover>'
                };
        }
    }

    async handleCollaborate(args, context) {
        const taskDescription = args.find(a => !a.startsWith('--'));
        const agentsArg = args.find(a => a.startsWith('--agents='));
        
        if (!taskDescription) {
            return {
                success: false,
                message: 'Usage: /collaborate "<task>" --agents=<agent1,agent2>'
            };
        }

        const agentIds = agentsArg 
            ? agentsArg.split('=')[1].split(',') 
            : this.selectBestAgents(taskDescription);

        console.log(chalk.blue(`\n🤝 Starting collaboration\n`));
        console.log(chalk.gray(`Task: ${taskDescription}`));
        console.log(chalk.gray(`Agents: ${agentIds.join(', ')}\n`));

        const collaboration = await this.startCollaboration(taskDescription, agentIds);
        
        return collaboration;
    }

    async handleDelegate(args, context) {
        const taskDescription = args.find(a => !a.startsWith('--'));
        const toArg = args.find(a => a.startsWith('--to='));
        
        if (!taskDescription || !toArg) {
            return {
                success: false,
                message: 'Usage: /delegate "<task>" --to=<agent-id>'
            };
        }

        const targetAgentId = toArg.split('=')[1];
        
        console.log(chalk.blue(`\n📤 Delegating task\n`));
        console.log(chalk.gray(`Task: ${taskDescription}`));
        console.log(chalk.gray(`To: ${targetAgentId}\n`));

        const delegation = await this.delegateTask(taskDescription, targetAgentId);
        
        return delegation;
    }

    // Agent Registration
    async registerAgent(args, context) {
        const agentId = args[0] || `agent-${Date.now()}`;
        const capabilities = args.slice(1);

        const agent = {
            id: agentId,
            capabilities: capabilities,
            status: 'active',
            registered: Date.now(),
            lastSeen: Date.now(),
            messageCount: 0,
            collaborations: []
        };

        this.agents.set(agentId, agent);
        this.agentCapabilities.set(agentId, new Set(capabilities));

        console.log(chalk.green(`\n✓ Agent registered: ${agentId}`));
        if (capabilities.length > 0) {
            console.log(chalk.dim(`  Capabilities: ${capabilities.join(', ')}`));
        }

        this.eventBus.emit('agent:connected', agent);

        return {
            success: true,
            agent,
            protocol: {
                version: this.version,
                messageFormat: 'json',
                heartbeatInterval: this.config.heartbeatInterval
            }
        };
    }

    // Messaging
    async sendMessage(args, context) {
        const toAgentId = args[0];
        const message = args.slice(1).join(' ');

        if (!toAgentId || !message) {
            return {
                success: false,
                message: 'Usage: /a2a send <agent-id> <message>'
            };
        }

        const targetAgent = this.agents.get(toAgentId);
        if (!targetAgent) {
            return {
                success: false,
                message: `Agent not found: ${toAgentId}`
            };
        }

        const msg = this.createMessage('direct', message, toAgentId);
        await this.deliverMessage(msg);

        console.log(chalk.blue(`\n📨 Message sent to ${toAgentId}`));
        console.log(chalk.dim(`  ${message}\n`));

        return {
            success: true,
            messageId: msg.id,
            to: toAgentId,
            timestamp: msg.timestamp
        };
    }

    async broadcast(args, context) {
        const message = args.join(' ');

        if (!message) {
            return {
                success: false,
                message: 'Usage: /a2a broadcast <message>'
            };
        }

        const msg = this.createMessage('broadcast', message);
        const deliveries = [];

        for (const [agentId, agent] of this.agents.entries()) {
            const delivery = await this.deliverMessage(msg, agentId);
            deliveries.push(delivery);
        }

        console.log(chalk.blue(`\n📢 Broadcast to ${this.agents.size} agents`));
        console.log(chalk.dim(`  ${message}\n`));

        return {
            success: true,
            messageId: msg.id,
            recipients: Array.from(this.agents.keys()),
            deliveries
        };
    }

    createMessage(type, content, to = null, metadata = {}) {
        return {
            id: this.generateMessageId(),
            type,
            content,
            to,
            from: 'system',  // Could be from another agent
            timestamp: Date.now(),
            metadata,
            status: 'pending'
        };
    }

    async deliverMessage(message, targetAgentId = null) {
        const target = targetAgentId || message.to;
        
        if (target) {
            const agent = this.agents.get(target);
            if (agent) {
                agent.messageCount++;
                agent.lastSeen = Date.now();
                message.status = 'delivered';
                
                this.eventBus.emit('message:received', {
                    agent: target,
                    message
                });
            } else {
                message.status = 'failed';
            }
        } else {
            // Broadcast
            message.status = 'delivered';
            this.eventBus.emit('message:received', { message });
        }

        this.messageQueue.push(message);
        this.eventBus.emit('message:sent', message);

        return {
            messageId: message.id,
            status: message.status,
            timestamp: Date.now()
        };
    }

    // Collaboration
    async startCollaboration(taskDescription, agentIds) {
        const collaborationId = this.generateCollaborationId();
        
        // Verify all agents exist
        const agents = agentIds.map(id => this.agents.get(id)).filter(Boolean);
        
        if (agents.length === 0) {
            return {
                success: false,
                message: 'No valid agents found'
            };
        }

        const collaboration = {
            id: collaborationId,
            task: taskDescription,
            agents: agents.map(a => a.id),
            status: 'active',
            started: Date.now(),
            messages: [],
            results: {},
            phases: this.planCollaboration(taskDescription, agents)
        };

        this.collaborations.set(collaborationId, collaboration);

        // Notify all agents
        for (const agent of agents) {
            const msg = this.createMessage('collaboration', {
                collaborationId,
                task: taskDescription,
                role: this.assignRole(agent, taskDescription),
                peers: agents.map(a => a.id).filter(id => id !== agent.id)
            }, agent.id);
            
            await this.deliverMessage(msg);
            agent.collaborations.push(collaborationId);
        }

        console.log(chalk.green(`\n✓ Collaboration started: ${collaborationId}`));
        this.displayCollaboration(collaboration);

        this.eventBus.emit('collaboration:started', collaboration);

        // Execute collaboration
        const result = await this.executeCollaboration(collaboration);

        return result;
    }

    planCollaboration(task, agents) {
        // Simple phase planning based on agent capabilities
        const phases = [
            {
                name: 'Planning',
                agents: agents.filter(a => 
                    this.agentCapabilities.get(a.id)?.has('planning')
                ).map(a => a.id),
                tasks: ['Define requirements', 'Create plan']
            },
            {
                name: 'Execution',
                agents: agents.filter(a => 
                    this.agentCapabilities.get(a.id)?.has('development') ||
                    this.agentCapabilities.get(a.id)?.has('implementation')
                ).map(a => a.id),
                tasks: ['Implement solution', 'Integrate components']
            },
            {
                name: 'Verification',
                agents: agents.filter(a => 
                    this.agentCapabilities.get(a.id)?.has('testing')
                ).map(a => a.id),
                tasks: ['Test implementation', 'Verify quality']
            }
        ];

        return phases.filter(p => p.agents.length > 0);
    }

    async executeCollaboration(collaboration) {
        console.log(chalk.yellow('\n🔄 Executing collaboration phases...\n'));

        const results = [];

        for (const phase of collaboration.phases) {
            console.log(chalk.cyan(`  Phase: ${phase.name}`));
            console.log(chalk.dim(`  Agents: ${phase.agents.join(', ')}`));
            
            // Simulate phase execution
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            results.push({
                phase: phase.name,
                status: 'completed',
                agents: phase.agents
            });
            
            console.log(chalk.green(`  ✓ ${phase.name} completed\n`));
        }

        collaboration.status = 'completed';
        collaboration.completed = Date.now();
        collaboration.results = results;

        console.log(chalk.bold.green('✅ Collaboration completed successfully'));

        this.eventBus.emit('collaboration:completed', collaboration);

        return {
            success: true,
            collaborationId: collaboration.id,
            duration: collaboration.completed - collaboration.started,
            phases: results
        };
    }

    assignRole(agent, task) {
        const capabilities = this.agentCapabilities.get(agent.id);
        
        if (capabilities?.has('planning')) return 'planner';
        if (capabilities?.has('development')) return 'developer';
        if (capabilities?.has('testing')) return 'tester';
        if (capabilities?.has('review')) return 'reviewer';
        
        return 'contributor';
    }

    // Task Delegation
    async delegateTask(taskDescription, targetAgentId) {
        const targetAgent = this.agents.get(targetAgentId);
        
        if (!targetAgent) {
            return {
                success: false,
                message: `Agent not found: ${targetAgentId}`
            };
        }

        const delegationId = this.generateDelegationId();
        
        const delegation = {
            id: delegationId,
            task: taskDescription,
            from: 'system',
            to: targetAgentId,
            status: 'pending',
            created: Date.now(),
            responses: []
        };

        this.delegations.set(delegationId, delegation);

        // Send delegation message
        const msg = this.createMessage('delegation', {
            delegationId,
            task: taskDescription,
            priority: 'normal',
            deadline: null
        }, targetAgentId);

        await this.deliverMessage(msg);

        console.log(chalk.yellow('  ⏳ Waiting for acceptance...\n'));

        // Simulate agent response
        await new Promise(resolve => setTimeout(resolve, 500));

        const accepted = Math.random() > 0.2; // 80% acceptance rate
        
        if (accepted) {
            delegation.status = 'accepted';
            delegation.acceptedAt = Date.now();
            
            console.log(chalk.green(`  ✓ Task accepted by ${targetAgentId}`));
            
            this.eventBus.emit('task:accepted', delegation);
            
            // Simulate execution
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            delegation.status = 'completed';
            delegation.completedAt = Date.now();
            delegation.result = { success: true };
            
            console.log(chalk.green(`  ✓ Task completed\n`));
        } else {
            delegation.status = 'rejected';
            delegation.rejectedAt = Date.now();
            delegation.reason = 'Agent busy with other tasks';
            
            console.log(chalk.red(`  ✗ Task rejected: ${delegation.reason}\n`));
            
            this.eventBus.emit('task:rejected', delegation);
        }

        return {
            success: delegation.status !== 'rejected',
            delegationId,
            status: delegation.status,
            agent: targetAgentId,
            result: delegation.result
        };
    }

    // Agent Discovery
    async discoverAgents() {
        console.log(chalk.blue('\n🔍 Discovering agents...\n'));

        // Simulate discovery
        await new Promise(resolve => setTimeout(resolve, 1000));

        const discovered = Array.from(this.agents.values()).map(agent => ({
            id: agent.id,
            capabilities: Array.from(this.agentCapabilities.get(agent.id) || []),
            status: agent.status,
            lastSeen: agent.lastSeen
        }));

        console.log(chalk.green(`✓ Found ${discovered.length} agents\n`));

        discovered.forEach(agent => {
            console.log(chalk.cyan(`  ${agent.id}`));
            console.log(chalk.dim(`    Status: ${agent.status}`));
            if (agent.capabilities.length > 0) {
                console.log(chalk.dim(`    Capabilities: ${agent.capabilities.join(', ')}`));
            }
        });

        return {
            success: true,
            agents: discovered
        };
    }

    selectBestAgents(task, count = 3) {
        // Simple capability matching
        const taskLower = task.toLowerCase();
        const scored = Array.from(this.agents.values()).map(agent => {
            const caps = this.agentCapabilities.get(agent.id) || new Set();
            let score = 0;
            
            if (taskLower.includes('plan') && caps.has('planning')) score += 3;
            if (taskLower.includes('develop') && caps.has('development')) score += 3;
            if (taskLower.includes('test') && caps.has('testing')) score += 3;
            if (taskLower.includes('review') && caps.has('review')) score += 2;
            
            return { agent, score };
        });

        return scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, count)
            .map(s => s.agent.id);
    }

    // Network Management
    async connectToAgent(agentId) {
        if (!agentId) {
            return { success: false, message: 'Agent ID required' };
        }

        const connection = {
            agentId,
            connected: Date.now(),
            status: 'active'
        };

        this.agentConnections.set(agentId, connection);

        console.log(chalk.green(`\n✓ Connected to agent: ${agentId}\n`));

        return { success: true, connection };
    }

    async disconnectFromAgent(agentId) {
        this.agentConnections.delete(agentId);
        console.log(chalk.yellow(`\n⏸️  Disconnected from agent: ${agentId}\n`));
        return { success: true };
    }

    disconnectAllAgents() {
        this.agentConnections.clear();
    }

    // Status & Display
    listAgents() {
        if (this.agents.size === 0) {
            console.log(chalk.dim('\nNo agents registered\n'));
            return { success: true, agents: [] };
        }

        console.log(chalk.bold('\n🤖 Registered Agents:\n'));

        const agents = Array.from(this.agents.values());
        agents.forEach(agent => {
            const caps = Array.from(this.agentCapabilities.get(agent.id) || []);
            const statusIcon = agent.status === 'active' ? '✓' : '⏸';
            
            console.log(chalk.cyan(`  ${statusIcon} ${agent.id}`));
            console.log(chalk.dim(`     Status: ${agent.status}`));
            console.log(chalk.dim(`     Messages: ${agent.messageCount}`));
            if (caps.length > 0) {
                console.log(chalk.dim(`     Capabilities: ${caps.join(', ')}`));
            }
            if (agent.collaborations.length > 0) {
                console.log(chalk.dim(`     Collaborations: ${agent.collaborations.length}`));
            }
            console.log();
        });

        return { success: true, agents };
    }

    getProtocolStatus() {
        console.log(chalk.bold('\n📊 A2A Protocol Status:\n'));
        console.log(chalk.white(`  Version: ${this.version}`));
        console.log(chalk.white(`  Agents: ${this.agents.size}`));
        console.log(chalk.white(`  Collaborations: ${this.collaborations.size}`));
        console.log(chalk.white(`  Delegations: ${this.delegations.size}`));
        console.log(chalk.white(`  Messages: ${this.messageQueue.length}`));
        console.log(chalk.white(`  Connections: ${this.agentConnections.size}\n`));

        return {
            success: true,
            status: {
                version: this.version,
                agents: this.agents.size,
                collaborations: this.collaborations.size,
                delegations: this.delegations.size,
                messages: this.messageQueue.length
            }
        };
    }

    listChannels() {
        console.log(chalk.bold('\n📡 Communication Channels:\n'));
        
        if (this.channels.size === 0) {
            console.log(chalk.dim('  No active channels\n'));
            return { success: true, channels: [] };
        }

        const channels = Array.from(this.channels.entries());
        channels.forEach(([name, channel]) => {
            console.log(chalk.cyan(`  # ${name}`));
            console.log(chalk.dim(`     Subscribers: ${channel.subscribers.size}`));
            console.log(chalk.dim(`     Messages: ${channel.messages.length}`));
        });

        return { success: true, channels };
    }

    displayCollaboration(collaboration) {
        console.log(chalk.dim(`  Collaboration ID: ${collaboration.id}`));
        console.log(chalk.dim(`  Agents: ${collaboration.agents.length}`));
        console.log(chalk.dim(`  Phases: ${collaboration.phases.length}\n`));

        collaboration.phases.forEach((phase, idx) => {
            console.log(chalk.white(`  Phase ${idx + 1}: ${phase.name}`));
            console.log(chalk.gray(`    Agents: ${phase.agents.join(', ')}`));
            console.log(chalk.gray(`    Tasks: ${phase.tasks.join(', ')}`));
        });
        console.log();
    }

    // Heartbeat
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            const now = Date.now();
            
            for (const [agentId, agent] of this.agents.entries()) {
                const timeSinceLastSeen = now - agent.lastSeen;
                
                if (timeSinceLastSeen > this.config.heartbeatInterval * 3) {
                    agent.status = 'inactive';
                    this.eventBus.emit('agent:disconnected', agent);
                }
            }
        }, this.config.heartbeatInterval);
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // Event Handlers
    handleIncomingMessage({ agent, message }) {
        // Process incoming message
    }

    handleOutgoingMessage(message) {
        // Track outgoing message
    }

    handleAgentConnected(agent) {
        console.log(chalk.dim(`  Agent connected: ${agent.id}`));
    }

    handleAgentDisconnected(agent) {
        console.log(chalk.dim(`  Agent disconnected: ${agent.id}`));
    }

    handleCollaborationStarted(collaboration) {
        // Track collaboration start
    }

    handleCollaborationCompleted(collaboration) {
        // Track collaboration completion
    }

    handleTaskDelegated(delegation) {
        // Track delegation
    }

    handleTaskAccepted(delegation) {
        // Track acceptance
    }

    handleTaskRejected(delegation) {
        // Handle rejection
    }

    // Utilities
    generateMessageId() {
        return `msg-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }

    generateCollaborationId() {
        return `collab-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }

    generateDelegationId() {
        return `del-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }
}

module.exports = A2AProtocolExtension;

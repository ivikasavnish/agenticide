# Agenticide: Forking Continue for Multi-Agent Coordination

## 🎯 Vision

Fork Continue (Apache 2.0) to create **Agenticide** - an AI coding assistant where:
- **Multiple AI agents** (LSP, linter, test, refactor, security) work together
- **Shared TODO list** coordinates all agent actions
- **Our Rust CLI tools** provide the backend (LSP manager, context manager)
- **Agents update TODO list** as they work

## 📊 Continue Architecture (What We're Forking)

Based on research:

```
┌─────────────────────────────────────────────────┐
│         Continue Extension (Apache 2.0)         │
├─────────────────────────────────────────────────┤
│  Frontend (GUI)                                 │
│  - React + Redux (state management)            │
│  - Vite build system                           │
│  - Webview embedded in VS Code                 │
│  - socket.io → Core                            │
├─────────────────────────────────────────────────┤
│  Backend (Core)                                 │
│  - TypeScript (main logic)                     │
│  - LLM provider abstraction                    │
│  - Agent workflows                             │
│  - Model Context Protocol (MCP)                │
│  - Supports local/cloud LLMs                   │
└─────────────────────────────────────────────────┘
```

### Key Components:
- **Core**: TypeScript backend, handles AI logic, model communication
- **GUI**: React frontend, chat UI, embedded webview
- **Communication**: socket.io for real-time streaming
- **Extensibility**: Plugin architecture for custom agents
- **License**: Apache 2.0 ✅ (commercial use allowed)

## 🔧 What We'll Change

### 1. **Shared TODO List as Coordination Layer**

**Current Continue**:
```typescript
// Single AI agent chat
user: "Fix this bug"
agent: *makes changes*
```

**Agenticide**:
```typescript
// Multi-agent with shared TODO list
user: "Fix this bug"
┌─────────────────────────────────┐
│ Shared TODO List (.context.json)│
│ ✓ Analyze bug (Detective Agent) │
│ □ Write fix (Coder Agent)       │
│ □ Write test (Test Agent)       │
│ □ Run tests (Validator Agent)   │
└─────────────────────────────────┘

// ALL agents read/write this list
```

### 2. **Replace LLM Backend with Rust CLI Tools**

**Continue**:
```typescript
// core/llm/providers/openai.ts
async chat(messages) {
  return await openai.chat(messages)
}
```

**Agenticide**:
```typescript
// core/agenticide/rustTools.ts
import { exec } from 'child_process'

async executeAgent(agentType: string, task: string) {
  // Call our Rust CLI tools
  const result = await exec(`~/.agenticide/context_manager tool ${agentType}`)
  
  // Update shared TODO list
  await updateTodoList(result)
  
  return result
}
```

### 3. **Add Multi-Agent Panel**

**New UI Components**:
```
┌───────────────────────────────┐
│ 🤖 Active Agents              │
│ ✅ LSP Agent (gopls running)  │
│ ⏳ Linter Agent (analyzing)   │
│ 💤 Test Agent (idle)          │
│ 💤 Security Agent (idle)      │
├───────────────────────────────┤
│ 📋 Shared TODO List           │
│ ✓ Start LSP servers           │
│ □ Fix type errors (3)         │
│ □ Add missing tests           │
│ □ Security scan               │
└───────────────────────────────┘
```

## 🚀 Implementation Plan

### Phase 1: Fork & Setup (Day 1)
```bash
# 1. Fork Continue on GitHub
# 2. Clone our fork
cd /Users/vikasavnish/agenticide
git clone https://github.com/YOUR_USERNAME/continue.git agenticide-extension

# 3. Rename package
cd agenticide-extension
# Edit package.json: "name": "agenticide"
# Edit package.json: "displayName": "Agenticide - Multi-Agent IDE"

# 4. Install dependencies
npm install
```

### Phase 2: Integrate Rust CLI Tools (Day 2-3)

**Create new module**: `core/agenticide/`

```typescript
// core/agenticide/rustTools.ts
export class RustToolsClient {
  async startLSP(projectPath: string): Promise<void> {
    return exec(`~/.agenticide/lsp_manager start --all "${projectPath}"`)
  }
  
  async getTodos(projectPath: string): Promise<Todo[]> {
    const output = await exec(`~/.agenticide/context_manager list-todos "${projectPath}"`)
    return JSON.parse(output)
  }
  
  async addTodo(projectPath: string, task: string, agent: string): Promise<void> {
    return exec(`~/.agenticide/context_manager add-todo "${task}" --agent "${agent}"`)
  }
  
  async completeTodo(projectPath: string, id: number, agent: string): Promise<void> {
    return exec(`~/.agenticide/context_manager complete-todo ${id} --agent "${agent}"`)
  }
}
```

### Phase 3: Multi-Agent System (Day 4-5)

**Create agent registry**:

```typescript
// core/agenticide/agents/AgentRegistry.ts
export enum AgentType {
  LSP = 'lsp',
  LINTER = 'linter',
  TEST = 'test',
  SECURITY = 'security',
  REFACTOR = 'refactor',
  DOCUMENTATION = 'documentation'
}

export class Agent {
  type: AgentType
  status: 'idle' | 'running' | 'error'
  currentTodo?: Todo
  
  async execute(todo: Todo): Promise<void> {
    this.status = 'running'
    this.currentTodo = todo
    
    // Execute using Rust tools
    await rustTools.executeTool(this.type, todo.description)
    
    // Mark complete
    await rustTools.completeTodo(todo.id, this.type)
    this.status = 'idle'
  }
}

export class AgentRegistry {
  agents: Map<AgentType, Agent> = new Map()
  
  async coordinateAgents(todos: Todo[]): Promise<void> {
    // Distribute todos to available agents
    for (const todo of todos) {
      const agent = this.getAvailableAgent(todo.agentType)
      if (agent) {
        await agent.execute(todo)
      }
    }
  }
}
```

### Phase 4: Shared TODO List UI (Day 6-7)

**Add new React components**:

```typescript
// gui/src/components/AgenticidePanel.tsx
export const AgenticidePanel = () => {
  const [agents, setAgents] = useState<Agent[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  
  useEffect(() => {
    // Subscribe to TODO list updates via socket.io
    socket.on('todo-updated', (newTodos) => {
      setTodos(newTodos)
    })
    
    socket.on('agent-status', (agentStatus) => {
      setAgents(agentStatus)
    })
  }, [])
  
  return (
    <div className="agenticide-panel">
      <AgentStatus agents={agents} />
      <SharedTodoList todos={todos} onComplete={handleComplete} />
    </div>
  )
}
```

### Phase 5: Agent Coordination Logic (Day 8-9)

**Smart task distribution**:

```typescript
// core/agenticide/coordinator.ts
export class AgentCoordinator {
  async analyzeTodoAndAssign(todo: Todo): Promise<void> {
    // Use AI to analyze what agents are needed
    const analysis = await this.analyzeTask(todo.description)
    
    if (analysis.needsLSP) {
      await this.assignToAgent('lsp', todo)
    }
    
    if (analysis.needsTests) {
      await this.assignToAgent('test', todo)
    }
    
    // Update TODO with agent assignments
    await rustTools.updateTodo(todo.id, {
      assignedAgents: analysis.agents
    })
  }
}
```

## 📝 New Context Manager Schema

Extend `.context.json` for multi-agent support:

```json
{
  "context": { ... },
  "todos": [
    {
      "id": 1,
      "description": "Fix type error in user.go",
      "status": "in_progress",
      "assigned_agents": ["lsp", "linter"],
      "created_by": "user",
      "created_at": "2026-02-11T17:00:00Z",
      "started_by": "lsp",
      "started_at": "2026-02-11T17:01:00Z",
      "agent_updates": [
        {
          "agent": "lsp",
          "timestamp": "2026-02-11T17:01:30Z",
          "action": "analyzed_file",
          "result": "Found 3 type errors"
        }
      ]
    }
  ],
  "agents": {
    "lsp": {
      "status": "running",
      "last_active": "2026-02-11T17:01:30Z",
      "tasks_completed": 5
    }
  }
}
```

## 🔄 Communication Flow

```
User types: "Add tests for user service"
     ↓
Extension creates TODO in shared list
     ↓
AgentCoordinator analyzes task
     ↓
Assigns to: [Test Agent, LSP Agent]
     ↓
Test Agent:
  - Calls: context_manager tool test
  - Updates TODO: "analyzing test coverage"
  - Generates test stubs
  - Updates TODO: "complete ✓"
     ↓
LSP Agent:
  - Provides type hints for tests
  - Updates TODO: "complete ✓"
     ↓
All updates streamed to UI via socket.io
```

## 🎨 UI Design

```
┌────────────────────────────────────────┐
│ 🤖 Agenticide                    [⚙️]  │
├────────────────────────────────────────┤
│ 💬 Chat                                │
│ ┌────────────────────────────────────┐ │
│ │ You: Add tests for user service    │ │
│ │                                    │ │
│ │ 🤖 Coordinator: Created 3 todos,  │ │
│ │    assigned to Test & LSP agents  │ │
│ │                                    │ │
│ │ 🧪 Test Agent: Analyzing coverage │ │
│ │    ✓ Found 5 untested functions   │ │
│ │                                    │ │
│ │ 🔧 LSP Agent: Providing types     │ │
│ │    ✓ Added type hints             │ │
│ └────────────────────────────────────┘ │
├────────────────────────────────────────┤
│ 📋 Shared TODO List (3)                │
│ ✓ Analyze test coverage                │
│ ✓ Generate test stubs                  │
│ ⏳ Run tests (in progress)             │
├────────────────────────────────────────┤
│ 🤖 Agents (2 active)                   │
│ ✅ LSP Agent - idle                    │
│ ⏳ Test Agent - running tests          │
│ 💤 Security Agent - idle               │
└────────────────────────────────────────┘
```

## 🔗 Integration Points

1. **Extension activates** → Check for `~/.agenticide/` installation
2. **User opens project** → Run `context_manager init` if needed
3. **User types command** → Create TODO, assign agents
4. **Agents work** → Update TODO list in real-time
5. **TODO complete** → Notify user, update UI

## 📦 What to Keep from Continue

✅ **Keep**:
- React + Redux frontend architecture
- socket.io communication layer
- Webview rendering system
- Configuration system (`.continuerc.json` → `.agenticiderc.json`)
- Tab autocomplete UI components
- Sidebar tree views

❌ **Replace**:
- LLM provider system → Our Rust tools
- Single agent chat → Multi-agent coordination
- Context gathering → Use `.context.json`
- Model selection UI → Agent selection UI

## 🧪 Testing Strategy

```bash
# 1. Unit tests for Rust CLI integration
npm test -- rust-tools.test.ts

# 2. Integration tests for multi-agent coordination
npm test -- agent-coordinator.test.ts

# 3. E2E tests in Extension Development Host
# F5 in VS Code, test on real projects

# 4. Test shared TODO list updates
# Multiple agents updating same list concurrently
```

## 📅 Timeline

| Phase | Days | Deliverable |
|-------|------|-------------|
| Fork & Setup | 1 | Forked repo, renamed |
| Rust Integration | 2 | CLI tools callable |
| Multi-Agent System | 2 | Agent registry working |
| TODO UI | 2 | Real-time updates |
| Coordination | 2 | Smart task assignment |
| Testing & Polish | 2 | Production ready |
| **Total** | **~11 days** | **Working extension** |

## 🚀 Next Steps

1. **Fork Continue on GitHub**
2. **Create Agenticide organization/repo**
3. **Clone and analyze Continue codebase**
4. **Update Rust CLI tools** to support agent metadata
5. **Build multi-agent coordinator**
6. **Test with real projects**

## 📚 Resources

- Continue Repo: https://github.com/continuedev/continue
- Continue Docs: https://docs.continue.dev/
- Apache 2.0 License: Compatible with commercial use
- Our tools: `~/.agenticide/lsp_manager`, `~/.agenticide/context_manager`

---

**Key Innovation**: The **TODO list is not just a task tracker** - it's the **shared memory system** that enables **multiple AI agents to coordinate** without stepping on each other's toes.

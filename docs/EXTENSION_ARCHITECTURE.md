# Agenticide Extension Architecture

## 🎯 Vision: Pluggable Everything

Every feature is an extension. Core is minimal. Extensions are composable.

```
┌────────────────────────────────────────────────────────┐
│                  Agenticide Core                       │
│  ┌──────────────────────────────────────────────┐     │
│  │ Extension Registry & Loader                  │     │
│  │ - Discovery                                  │     │
│  │ - Loading/Unloading                         │     │
│  │ - Dependency resolution                      │     │
│  │ - Version management                         │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │ Terminal UI (Lipgloss + Bubbletea)          │     │
│  │ - Beautiful rendering                        │     │
│  │ - Interactive components                     │     │
│  │ - Real-time updates                          │     │
│  └──────────────────────────────────────────────┘     │
│                                                        │
│  ┌──────────────────────────────────────────────┐     │
│  │ Event Bus                                    │     │
│  │ - Inter-extension communication             │     │
│  │ - Pub/Sub messaging                         │     │
│  └──────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Extension A  │  │  Extension B  │  │  Extension C  │
│  (Web Search) │  │  (Security)   │  │  (Deployment) │
└───────────────┘  └───────────────┘  └───────────────┘
```

## 📦 Extension Catalog

### 1. **Web Search Extension** (`ext-websearch`)
**Status:** Exists (needs Go port)  
**Purpose:** Search the web, extract content, analyze pages

**Capabilities:**
- Multi-engine search (Google, Bing, DuckDuckGo)
- Content extraction (Readability algorithm)
- Screenshot capture
- Console log capture
- Text-mode browsing (Lynx-style)

**Commands:**
```
/search <query>              - Search web
/extract <url>               - Extract clean content
/screenshot <url>            - Capture screenshot
/browse <url>                - Text-mode browsing
```

**Dependencies:** None  
**Go packages:** `chromedp`, `goquery`

---

### 2. **UI Design Extension** (`ext-ui-design`)
**Status:** Exists as lovable-design (needs refactor)  
**Purpose:** Design and preview UI components

**Capabilities:**
- Live preview server
- Component library
- Hot reload
- Design-to-code generation

**Commands:**
```
/design start                - Start design server
/design preview <file>       - Preview component
/design generate <prompt>    - Generate UI from description
```

**Dependencies:** None  
**Go packages:** `gin`, `websocket`

---

### 3. **DB & Analytics Extension** (`ext-db-analytics`)
**Status:** New  
**Purpose:** Database operations and data analytics

**Capabilities:**
- SQL query builder and executor
- Database migrations
- Data visualization (terminal charts)
- Query optimization suggestions
- Schema analysis

**Commands:**
```
/db connect <dsn>            - Connect to database
/db query <sql>              - Execute query
/db migrate                  - Run migrations
/db analyze <table>          - Analyze schema
/analytics trends <table>    - Show data trends
/analytics chart <data>      - Terminal charts
```

**Dependencies:** None  
**Go packages:** `sqlx`, `sqlite3`, `pgx`, `termui`

**Example:**
```go
// Terminal chart with lipgloss
┌─────────────────────────────────┐
│ User Signups (Last 7 Days)     │
├─────────────────────────────────┤
│ Mon  ████████░░ 80              │
│ Tue  ██████████ 100             │
│ Wed  ███████░░░ 70              │
│ Thu  █████████░ 90              │
│ Fri  ████████████ 120           │
│ Sat  ██████░░░░ 60              │
│ Sun  ███████████░ 110           │
└─────────────────────────────────┘
```

---

### 4. **LLM Agentic Recipes Extension** (`ext-llm-recipes`)
**Status:** New  
**Purpose:** Pre-built agent workflows and recipes

**Capabilities:**
- Recipe library (code review, bug fix, feature gen)
- Multi-agent orchestration patterns
- Prompt templates
- Chain-of-thought workflows
- Agent composition

**Commands:**
```
/recipe list                 - List all recipes
/recipe run <name>           - Execute recipe
/recipe create <name>        - Create custom recipe
/recipe export <name>        - Export recipe
```

**Built-in Recipes:**
- `code-review`: Comprehensive code review
- `bug-hunter`: Find and fix bugs
- `feature-complete`: Full feature implementation
- `test-generator`: Generate comprehensive tests
- `refactor-safe`: Safe refactoring with tests
- `docs-writer`: Generate documentation
- `security-audit`: Security vulnerability scan

**Example Recipe:**
```yaml
name: feature-complete
agents:
  - planner: Analyze requirements
  - architect: Design solution
  - coder: Implement code
  - tester: Generate tests
  - reviewer: Code review
  - documenter: Write docs
flow:
  - planner → architect
  - architect → coder
  - coder → [tester, reviewer]
  - [tester, reviewer] → documenter
```

**Dependencies:** ext-code-analyzer, ext-security  
**Go packages:** `yaml`, custom agent orchestration

---

### 5. **Security Agent Extension** (`ext-security`)
**Status:** New  
**Purpose:** Security scanning and vulnerability detection

**Capabilities:**
- Static analysis security testing (SAST)
- Dependency vulnerability scanning
- Secret detection (API keys, passwords)
- Code injection detection
- Security best practices checker
- License compliance
- OWASP Top 10 checks

**Commands:**
```
/security scan               - Full security scan
/security secrets            - Find leaked secrets
/security deps               - Check dependencies
/security fix <issue>        - Auto-fix security issue
/security report             - Generate security report
```

**Checks:**
- SQL injection vulnerabilities
- XSS vulnerabilities
- Hardcoded secrets
- Weak cryptography
- Insecure dependencies
- CORS misconfigurations
- Authentication issues

**Dependencies:** ext-code-analyzer  
**Go packages:** `gosec`, `trivy`, custom analyzers

---

### 6. **Project Runner Extension** (`ext-project-runner`)
**Status:** New  
**Purpose:** Run and manage projects in any language

**Capabilities:**
- Auto-detect project type (Node.js, Go, Python, Rust, etc.)
- Install dependencies
- Run dev server with hot reload
- Execute tests
- Build for production
- Task runner (npm scripts, Makefile, etc.)

**Commands:**
```
/run dev                     - Start dev server
/run test                    - Run tests
/run build                   - Build project
/run <script>                - Run custom script
/run install                 - Install dependencies
/run doctor                  - Check project health
```

**Supported Projects:**
- Node.js (npm, yarn, pnpm, bun)
- Go (go mod, go run)
- Python (pip, poetry, pipenv)
- Rust (cargo)
- Ruby (bundler)
- Java (maven, gradle)
- .NET (dotnet)
- PHP (composer)

**Dependencies:** None  
**Go packages:** `exec`, project detection logic

---

### 7. **Code Analyzer Extension** (`ext-code-analyzer`)
**Status:** New (partial exists)  
**Purpose:** Static analysis and code quality

**Capabilities:**
- Syntax parsing (AST analysis)
- Complexity metrics (cyclomatic, cognitive)
- Dead code detection
- Code smell detection
- Style checking
- Type inference
- Control flow analysis
- Data flow analysis

**Commands:**
```
/analyze <file>              - Analyze single file
/analyze project             - Analyze entire project
/analyze complexity          - Show complexity metrics
/analyze unused              - Find dead code
/analyze duplicates          - Find duplicate code
```

**Metrics:**
- Lines of code (LOC)
- Cyclomatic complexity
- Cognitive complexity
- Maintainability index
- Test coverage
- Technical debt score

**Dependencies:** None  
**Go packages:** `go/ast`, `go/parser`, `tree-sitter`

---

### 8. **Deployment Agent Extension** (`ext-deployment`)
**Status:** New  
**Purpose:** Deploy to various platforms

**Capabilities:**
- Platform detection and configuration
- Build pipeline execution
- Environment management
- Rollback support
- Health checks post-deployment
- Multi-region deployment

**Commands:**
```
/deploy to <platform>        - Deploy to platform
/deploy status               - Check deployment status
/deploy rollback             - Rollback last deployment
/deploy config <platform>    - Configure platform
/deploy logs                 - View deployment logs
```

**Supported Platforms:**
- AWS (EC2, ECS, Lambda, Elastic Beanstalk)
- Google Cloud (Cloud Run, App Engine, GKE)
- Azure (App Service, Container Instances)
- Vercel
- Netlify
- Heroku
- Digital Ocean
- Docker (Docker Hub, private registries)
- Kubernetes

**Dependencies:** ext-project-runner, ext-security  
**Go packages:** Cloud provider SDKs

---

### 9. **Cost Controller Extension** (`ext-cost-controller`)
**Status:** New  
**Purpose:** Monitor and optimize costs

**Capabilities:**
- Track API usage costs (Claude, Copilot)
- Server resource monitoring
- Cost forecasting
- Budget alerts
- Resource optimization suggestions
- Cost attribution by feature/user

**Commands:**
```
/cost today                  - Today's costs
/cost forecast               - 30-day forecast
/cost breakdown              - Cost by service
/cost optimize               - Optimization suggestions
/cost budget <amount>        - Set budget alert
```

**Tracks:**
- LLM API costs (per request, per token)
- Cloud infrastructure costs
- Database costs
- Bandwidth costs
- Third-party service costs

**Features:**
- Real-time cost tracking
- Budget alerts (email, Slack)
- Cost anomaly detection
- Optimization recommendations
- Cost allocation tags

**Dependencies:** ext-monitoring  
**Go packages:** Cloud provider APIs, custom cost tracking

---

### 10. **Proactive Monitoring Extension** (`ext-monitoring`)
**Status:** New  
**Purpose:** Health checks and alerting

**Capabilities:**
- Application health monitoring
- Performance metrics
- Error tracking
- Uptime monitoring
- Log aggregation
- Custom alerts

**Commands:**
```
/monitor status              - System status
/monitor metrics             - Show metrics
/monitor alerts              - View alerts
/monitor logs <service>      - View logs
/monitor trace <request>     - Trace request
```

**Monitors:**
- Application uptime
- Response times
- Error rates
- CPU/Memory usage
- Database performance
- API rate limits
- Queue depths

**Alerts:**
- Email
- Slack
- PagerDuty
- Custom webhooks

**Dependencies:** None  
**Go packages:** `prometheus`, `opentelemetry`, custom monitoring

---

## 🎨 Terminal UI with Lipgloss + Bubbletea

All extensions use beautiful terminal UI:

### Extension List View
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                  Agenticide Extensions                     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  ✓ Web Search              v1.0.0    [enabled]
    Search the web and extract content
    
  ✓ Security Agent          v1.0.0    [enabled]
    Scan for vulnerabilities and security issues
    
  ○ DB & Analytics          v1.0.0    [disabled]
    Database operations and analytics
    
  ✓ Deployment Agent        v1.0.0    [enabled]
    Deploy to various platforms
    
  ✓ Cost Controller         v1.0.0    [enabled]
    Monitor and optimize costs

┌─────────────────────────────────────────────────────────────┐
│ j/k: navigate • space: toggle • enter: configure • q: quit │
└─────────────────────────────────────────────────────────────┘
```

### Security Scan Progress
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                    Security Scan                           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  Scanning files...           ████████████████████ 100%

  ✓ Secret detection          0 issues found
  ✓ Dependency scan           2 vulnerabilities (1 high, 1 medium)
  ⚠ SQL injection check       1 issue found
  ✓ XSS vulnerabilities       0 issues found
  ⏳ Code injection check     scanning...

┌─────────────────────────────────────────────────────────────┐
│ Critical: 0 • High: 1 • Medium: 1 • Low: 0                 │
└─────────────────────────────────────────────────────────────┘
```

### Cost Dashboard
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                    Cost Dashboard                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  Today's Costs               $45.32         Budget: $500/day

  LLM APIs                    $32.50    ████████████░░░░ 65%
  Infrastructure              $8.20     ████░░░░░░░░░░░░ 16%
  Database                    $3.12     ██░░░░░░░░░░░░░░  6%
  Bandwidth                   $1.50     █░░░░░░░░░░░░░░░  3%

  Forecast (30 days)          $1,359    ⚠️  Over budget by $359

┌─────────────────────────────────────────────────────────────┐
│ ↑/↓: scroll • r: refresh • o: optimize • q: quit           │
└─────────────────────────────────────────────────────────────┘
```

## 🔌 Extension Interface (Go)

```go
// extension/interface.go
package extension

import "context"

// Extension interface - all extensions implement this
type Extension interface {
    // Metadata
    Name() string
    Version() string
    Description() string
    Author() string
    Dependencies() []string
    
    // Lifecycle
    Enable(ctx context.Context) error
    Disable(ctx context.Context) error
    IsEnabled() bool
    
    // Command handling
    Commands() []Command
    HandleCommand(ctx context.Context, cmd string, args []string) (*Result, error)
    
    // Event handling
    OnEvent(ctx context.Context, event Event) error
    
    // UI components
    UI() UI
}

type Command struct {
    Name        string
    Description string
    Usage       string
    Aliases     []string
    Flags       []Flag
    Handler     CommandHandler
}

type CommandHandler func(ctx context.Context, args []string) (*Result, error)

type Result struct {
    Success bool
    Data    interface{}
    Error   error
    UI      UIComponent  // Lipgloss rendered output
}

type Event struct {
    Type      string
    Source    string
    Timestamp int64
    Data      interface{}
}

type UI interface {
    Render() string              // Lipgloss rendering
    Update(msg interface{}) UI   // Bubbletea update
}

// Context provides access to core services
type Context struct {
    Registry   *Registry
    EventBus   *EventBus
    Storage    Storage
    Config     Config
    Logger     Logger
    Ultraloop  bool
    Ultrathink bool
}
```

## 🏗️ Extension Development Example

### Security Extension Implementation

```go
// extensions/security/security.go
package security

import (
    "context"
    "fmt"
    
    "github.com/charmbracelet/lipgloss"
    "github.com/ivikasavnish/agenticide/extension"
)

type SecurityExtension struct {
    enabled bool
    ctx     *extension.Context
    scanner *Scanner
}

func New() *SecurityExtension {
    return &SecurityExtension{
        scanner: NewScanner(),
    }
}

func (e *SecurityExtension) Name() string { return "security" }
func (e *SecurityExtension) Version() string { return "1.0.0" }
func (e *SecurityExtension) Description() string {
    return "Security scanning and vulnerability detection"
}
func (e *SecurityExtension) Dependencies() []string { return []string{"code-analyzer"} }

func (e *SecurityExtension) Commands() []extension.Command {
    return []extension.Command{
        {
            Name:        "scan",
            Description: "Scan for security vulnerabilities",
            Usage:       "/security scan [path]",
            Handler:     e.handleScan,
        },
        {
            Name:        "secrets",
            Description: "Find leaked secrets",
            Usage:       "/security secrets",
            Handler:     e.handleSecrets,
        },
    }
}

func (e *SecurityExtension) handleScan(ctx context.Context, args []string) (*extension.Result, error) {
    path := "."
    if len(args) > 0 {
        path = args[0]
    }
    
    // Run scan
    issues, err := e.scanner.Scan(path)
    if err != nil {
        return nil, err
    }
    
    // Render with lipgloss
    ui := e.renderScanResults(issues)
    
    return &extension.Result{
        Success: true,
        Data:    issues,
        UI:      ui,
    }, nil
}

func (e *SecurityExtension) renderScanResults(issues []Issue) string {
    var style = lipgloss.NewStyle().
        Bold(true).
        Foreground(lipgloss.Color("#FAFAFA")).
        Background(lipgloss.Color("#7D56F4")).
        PaddingTop(1).
        PaddingLeft(4).
        Width(60)
    
    header := style.Render("Security Scan Results")
    
    // Count by severity
    critical := 0
    high := 0
    medium := 0
    low := 0
    
    for _, issue := range issues {
        switch issue.Severity {
        case "critical":
            critical++
        case "high":
            high++
        case "medium":
            medium++
        case "low":
            low++
        }
    }
    
    summary := fmt.Sprintf("\n  Critical: %d  High: %d  Medium: %d  Low: %d\n\n", 
        critical, high, medium, low)
    
    // Render each issue
    var issuesText string
    for _, issue := range issues {
        color := getSeverityColor(issue.Severity)
        issueStyle := lipgloss.NewStyle().Foreground(color)
        issuesText += issueStyle.Render(fmt.Sprintf("  %s: %s\n    %s:%d\n\n",
            issue.Severity, issue.Message, issue.File, issue.Line))
    }
    
    return header + summary + issuesText
}

func getSeverityColor(severity string) lipgloss.Color {
    switch severity {
    case "critical":
        return lipgloss.Color("#FF0000")
    case "high":
        return lipgloss.Color("#FF6600")
    case "medium":
        return lipgloss.Color("#FFAA00")
    case "low":
        return lipgloss.Color("#FFFF00")
    default:
        return lipgloss.Color("#FFFFFF")
    }
}
```

## 📋 Extension Priority & Timeline

### Phase 1 (Week 1-2): Foundation
1. ✅ Extension registry system
2. ✅ Lipgloss/Bubbletea UI framework
3. ✅ Event bus

### Phase 2 (Week 3-4): Core Extensions
1. Web Search (port from JS)
2. Code Analyzer
3. Project Runner
4. Security Agent

### Phase 3 (Week 5-6): Advanced Extensions
1. DB & Analytics
2. LLM Agentic Recipes
3. Deployment Agent

### Phase 4 (Week 7-8): Operations Extensions
1. Cost Controller
2. Proactive Monitoring
3. UI Design (refactor)

## 🎯 Extension Marketplace (Future)

Users can:
- Browse extensions
- Install/uninstall
- Rate and review
- Create custom extensions
- Share with community
- Monetize premium extensions

## 🔐 Extension Security

- Extensions run in isolated contexts
- Permission system (file access, network, etc.)
- Code signing for verified extensions
- Sandboxing for untrusted extensions
- Audit logs for extension actions

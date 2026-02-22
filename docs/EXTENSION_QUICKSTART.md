# Extension Development Quickstart

Create your own Agenticide extension in 15 minutes!

## Step 1: Create Extension Structure

```bash
mkdir -p extensions/myext
cd extensions/myext
```

## Step 2: Create Main Extension File

Create `myext.go`:

```go
package myext

import (
    "context"
    "fmt"
    
    "github.com/charmbracelet/lipgloss"
    "github.com/ivikasavnish/agenticide/extension"
)

type MyExtension struct {
    enabled bool
    ctx     *extension.Context
}

func New() *MyExtension {
    return &MyExtension{}
}

// Metadata
func (e *MyExtension) Name() string        { return "myext" }
func (e *MyExtension) Version() string     { return "1.0.0" }
func (e *MyExtension) Description() string { return "My awesome extension" }
func (e *MyExtension) Author() string      { return "Your Name" }
func (e *MyExtension) Dependencies() []string { return []string{} }

// Lifecycle
func (e *MyExtension) Enable(ctx context.Context) error {
    e.enabled = true
    e.ctx = extension.GetContext(ctx)
    fmt.Println("✓ MyExt enabled")
    return nil
}

func (e *MyExtension) Disable(ctx context.Context) error {
    e.enabled = false
    return nil
}

func (e *MyExtension) IsEnabled() bool {
    return e.enabled
}

// Commands
func (e *MyExtension) Commands() []extension.Command {
    return []extension.Command{
        {
            Name:        "hello",
            Description: "Say hello",
            Usage:       "/myext hello [name]",
            Handler:     e.handleHello,
        },
        {
            Name:        "analyze",
            Description: "Analyze something",
            Usage:       "/myext analyze <path>",
            Handler:     e.handleAnalyze,
        },
    }
}

func (e *MyExtension) HandleCommand(ctx context.Context, cmd string, args []string) (*extension.Result, error) {
    for _, command := range e.Commands() {
        if command.Name == cmd {
            return command.Handler(ctx, args)
        }
    }
    return &extension.Result{
        Success: false,
        Error:   fmt.Errorf("unknown command: %s", cmd),
    }, nil
}

// Command Handlers
func (e *MyExtension) handleHello(ctx context.Context, args []string) (*extension.Result, error) {
    name := "World"
    if len(args) > 0 {
        name = args[0]
    }
    
    // Beautiful output with lipgloss
    style := lipgloss.NewStyle().
        Bold(true).
        Foreground(lipgloss.Color("#7D56F4")).
        Border(lipgloss.RoundedBorder()).
        Padding(1, 2)
    
    output := style.Render(fmt.Sprintf("Hello, %s! 👋", name))
    
    return &extension.Result{
        Success: true,
        Data:    map[string]string{"greeting": fmt.Sprintf("Hello, %s", name)},
        UI:      output,
    }, nil
}

func (e *MyExtension) handleAnalyze(ctx context.Context, args []string) (*extension.Result, error) {
    if len(args) == 0 {
        return &extension.Result{
            Success: false,
            Error:   fmt.Errorf("path required"),
        }, nil
    }
    
    path := args[0]
    
    // Do some analysis...
    results := map[string]interface{}{
        "path": path,
        "files": 42,
        "size": "1.2MB",
    }
    
    // Render with lipgloss
    titleStyle := lipgloss.NewStyle().
        Bold(true).
        Foreground(lipgloss.Color("#FAFAFA")).
        Background(lipgloss.Color("#7D56F4")).
        Padding(0, 1)
    
    title := titleStyle.Render("Analysis Results")
    
    body := fmt.Sprintf("\n  Path: %s\n  Files: %d\n  Size: %s\n",
        results["path"], results["files"], results["size"])
    
    return &extension.Result{
        Success: true,
        Data:    results,
        UI:      title + body,
    }, nil
}

// Event Handling
func (e *MyExtension) OnEvent(ctx context.Context, event extension.Event) error {
    // Handle events from other extensions
    switch event.Type {
    case "file.changed":
        fmt.Printf("File changed: %v\n", event.Data)
    case "task.completed":
        fmt.Printf("Task completed: %v\n", event.Data)
    }
    return nil
}

// UI Component
func (e *MyExtension) UI() extension.UI {
    return &MyUI{}
}

type MyUI struct{}

func (ui *MyUI) Render() string {
    return "My Extension UI"
}

func (ui *MyUI) Update(msg interface{}) extension.UI {
    return ui
}
```

## Step 3: Register Extension

In `main.go`:

```go
package main

import (
    "github.com/ivikasavnish/agenticide/extension"
    "github.com/ivikasavnish/agenticide/extensions/myext"
)

func main() {
    // Create registry
    registry := extension.NewRegistry()
    
    // Register extension
    ext := myext.New()
    registry.Register(ext)
    
    // Enable extension
    ext.Enable(context.Background())
    
    // Use extension
    result, _ := ext.HandleCommand(context.Background(), "hello", []string{"Agenticide"})
    fmt.Println(result.UI)
}
```

## Step 4: Build and Test

```bash
go build
./agenticide

# Test commands
/myext hello
/myext hello Vikas
/myext analyze ./src
```

## Advanced Features

### 1. Access Core Services

```go
func (e *MyExtension) handleAdvanced(ctx context.Context, args []string) (*extension.Result, error) {
    // Access event bus
    e.ctx.EventBus.Publish(extension.Event{
        Type: "myext.action",
        Data: "something happened",
    })
    
    // Access storage
    e.ctx.Storage.Set("key", "value")
    value := e.ctx.Storage.Get("key")
    
    // Access config
    apiKey := e.ctx.Config.Get("myext.api_key")
    
    // Log
    e.ctx.Logger.Info("Action completed")
    
    return &extension.Result{Success: true}, nil
}
```

### 2. Depend on Other Extensions

```go
func (e *MyExtension) Dependencies() []string {
    return []string{"security", "code-analyzer"}
}

func (e *MyExtension) handleWithDeps(ctx context.Context, args []string) (*extension.Result, error) {
    // Get other extension
    secExt, _ := e.ctx.Registry.Get("security")
    
    // Call its command
    result, _ := secExt.HandleCommand(ctx, "scan", []string{"."})
    
    // Use result
    return result, nil
}
```

### 3. Subscribe to Events

```go
func (e *MyExtension) Enable(ctx context.Context) error {
    e.enabled = true
    e.ctx = extension.GetContext(ctx)
    
    // Subscribe to events
    e.ctx.EventBus.Subscribe("file.changed", e.onFileChanged)
    e.ctx.EventBus.Subscribe("task.completed", e.onTaskCompleted)
    
    return nil
}

func (e *MyExtension) onFileChanged(event extension.Event) {
    file := event.Data.(string)
    fmt.Printf("File changed: %s\n", file)
}

func (e *MyExtension) onTaskCompleted(event extension.Event) {
    task := event.Data.(map[string]interface{})
    fmt.Printf("Task %s completed\n", task["name"])
}
```

### 4. Beautiful Terminal UI

```go
func (e *MyExtension) renderTable(data [][]string) string {
    var rows []string
    
    headerStyle := lipgloss.NewStyle().
        Bold(true).
        Foreground(lipgloss.Color("#FAFAFA")).
        Background(lipgloss.Color("#7D56F4")).
        Padding(0, 1)
    
    cellStyle := lipgloss.NewStyle().
        Padding(0, 1)
    
    // Header
    header := make([]string, len(data[0]))
    for i, cell := range data[0] {
        header[i] = headerStyle.Render(cell)
    }
    rows = append(rows, strings.Join(header, ""))
    
    // Data rows
    for _, row := range data[1:] {
        cells := make([]string, len(row))
        for i, cell := range row {
            cells[i] = cellStyle.Render(cell)
        }
        rows = append(rows, strings.Join(cells, ""))
    }
    
    return strings.Join(rows, "\n")
}
```

### 5. Progress Bars

```go
func (e *MyExtension) handleProgress(ctx context.Context, args []string) (*extension.Result, error) {
    for i := 0; i <= 100; i += 10 {
        bar := progressBar(i)
        fmt.Printf("\r  Processing... %s %d%%", bar, i)
        time.Sleep(500 * time.Millisecond)
    }
    fmt.Println()
    
    return &extension.Result{Success: true}, nil
}

func progressBar(percent int) string {
    filled := percent / 5
    empty := 20 - filled
    
    style := lipgloss.NewStyle().Foreground(lipgloss.Color("#7D56F4"))
    return style.Render(strings.Repeat("█", filled) + strings.Repeat("░", empty))
}
```

## Testing Extensions

Create `myext_test.go`:

```go
package myext

import (
    "context"
    "testing"
)

func TestHello(t *testing.T) {
    ext := New()
    ext.Enable(context.Background())
    
    result, err := ext.handleHello(context.Background(), []string{"Test"})
    if err != nil {
        t.Fatal(err)
    }
    
    if !result.Success {
        t.Error("Expected success")
    }
    
    data := result.Data.(map[string]string)
    if data["greeting"] != "Hello, Test" {
        t.Errorf("Expected 'Hello, Test', got '%s'", data["greeting"])
    }
}
```

Run tests:
```bash
go test ./extensions/myext/...
```

## Publishing Extension

### 1. Add manifest

Create `extension.yaml`:

```yaml
name: myext
version: 1.0.0
description: My awesome extension
author: Your Name
homepage: https://github.com/yourusername/agenticide-myext
license: MIT

dependencies:
  - security@^1.0.0
  - code-analyzer@^1.0.0

permissions:
  - filesystem:read
  - network:http
  - storage:read-write

commands:
  - name: hello
    description: Say hello
  - name: analyze
    description: Analyze something
```

### 2. Package

```bash
tar -czf myext-1.0.0.tar.gz extension.yaml myext.go
```

### 3. Publish

```bash
agenticide ext publish myext-1.0.0.tar.gz
```

## Extension Examples

See:
- `extensions/security/` - Security scanning
- `extensions/analytics/` - DB and analytics  
- `extensions/deploy/` - Deployment automation
- `extensions/cost/` - Cost monitoring

## Next Steps

1. Read full extension docs: `docs/EXTENSION_ARCHITECTURE.md`
2. Check lipgloss examples: `examples/lipgloss-ui-examples.go`
3. Join extension developer community
4. Submit your extension to marketplace!

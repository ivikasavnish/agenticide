# Process Management Extension

## Overview

The process management extension allows you to start, monitor, and control background processes from within Agenticide chat. This is particularly useful for running servers, daemons, and long-running tasks that you want to manage without leaving your coding assistant.

## Installation

The process extension is auto-loaded and enabled by default when you start Agenticide chat.

## Commands

### Start a Process

```bash
/process start <command>
```

Start a background process. Examples:
- `/process start node server.js` - Start a Node.js server
- `/process start python app.py` - Start a Python application  
- `/process start npm run dev` - Start development server
- `/process start cargo run` - Run a Rust application

The command returns a process ID and PID that you can use to manage the process.

### List Processes

```bash
/process list
# or
/process ps
```

List all running and exited processes with:
- Process ID (internal tracking)
- System PID
- Status (running/exited)
- Uptime
- Command

### View Process Logs

```bash
/process logs <id>
# or
/process output <id>
```

View the output (stdout and stderr) from a process. Shows the last 50 lines by default.

Example: `/process logs 1`

### Check Process Status

```bash
/process status <id>
```

Get detailed status information about a specific process:
- Process ID
- System PID
- Command
- Status
- Start time
- Uptime
- Exit code (if exited)
- Number of output lines captured

### Stop a Process

```bash
/process stop <id>
```

Stop a running process by its ID. Sends SIGTERM to gracefully shut down the process.

Example: `/process stop 1`

### Stop All Processes

```bash
/process stopall
```

Stop all running processes managed by Agenticide. Useful for cleanup before exiting.

## Usage Examples

### Running a WebSocket Server

```bash
# Start the server
/process start node websocket-server.js
# Process started: node websocket-server.js
# Process ID: 1, PID: 12345

# Check if it's running
/process list

# View logs
/process logs 1

# Stop when done
/process stop 1
```

### Multiple Processes

```bash
# Start frontend
/process start npm run dev
# Process ID: 1

# Start backend
/process start cargo run
# Process ID: 2

# Start database
/process start docker run -p 5432:5432 postgres
# Process ID: 3

# List all
/process list

# Stop specific one
/process stop 2
```

### Debugging a Long-Running Task

```bash
# Start the task
/process start python train_model.py

# Periodically check output
/process logs 1

# Check status
/process status 1
```

## Technical Details

### Process Tracking

- Each process is assigned a unique ID (auto-incrementing)
- Output is captured (both stdout and stderr) and stored
- Up to 1000 lines of output are kept per process
- Process status is tracked automatically

### Process Lifecycle

1. **Starting**: Process spawned with `spawn()` in shell mode
2. **Running**: Active process with PID assigned
3. **Exited**: Process completed with exit code
4. **Stopped**: Process stopped via `/process stop`
5. **Error**: Process failed to start or crashed

### Limitations

- Process output is buffered (last 1000 lines only)
- Processes are not persisted across Agenticide restarts
- No support for interactive processes (stdin)
- Processes are NOT fully detached (they're child processes)

## Integration with Other Features

### With Stub Generation

```bash
# Generate a server stub
/stub websocket javascript

# Implement the server
# ... (use /implement commands)

# Test it
/process start node websocket.js
/process logs 1
```

### With Chat

You can ask the AI to help debug process issues:

```
User: My server isn't starting
Assistant: Let me check the logs
[Uses /process logs 1]
Assistant: I see the issue - port 3000 is already in use...
```

### With Shell Commands

The process manager complements shell commands:
- Use `!<command>` for quick one-time commands
- Use `/process start` for long-running servers/daemons

## Best Practices

1. **Always list processes before exiting**: Use `/process list` to see what's running
2. **Stop unused processes**: Clean up with `/process stopall` or individual stops
3. **Check logs regularly**: Use `/process logs` to monitor output
4. **Use meaningful names in commands**: Makes `/process list` easier to read

## Troubleshooting

### Process Won't Start

```bash
/process logs <id>
```
Check the error output for details.

### Can't See Output

- Output is only captured AFTER the process starts
- Use `/process logs <id>` to see buffered output
- Only last 1000 lines are kept

### Process Already Exited

```bash
/process status <id>
```
Check the exit code and status for details.

## Future Enhancements

Planned features:
- Process persistence across sessions
- Interactive process input (stdin)
- Process groups/tags
- Auto-restart on crash
- Resource monitoring (CPU/memory)
- Log file streaming

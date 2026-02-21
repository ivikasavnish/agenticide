# Lovable Design Extension 🎨

AI-powered browser-based UI design server for Agenticide. Create and edit beautiful user interfaces with AI assistance, live preview, and real-time debugging.

## Features

### 🚀 Core Capabilities
- **Live Preview** - See changes instantly in browser
- **AI Generation** - Ask AI to create/modify UI components
- **Hot Reload** - Automatic refresh on file changes
- **Console Monitoring** - Track browser errors and logs
- **WebSocket Updates** - Real-time bidirectional communication
- **Export Designs** - Save your work to files

### 🎯 Use Cases
- Rapid UI prototyping
- Component library creation
- Landing page design
- Interactive demos
- Design system exploration
- Learning HTML/CSS/JS

## Installation

The extension is automatically available in Agenticide. No additional installation needed.

## Quick Start

```bash
# Start the design server
/design start

# Browser opens automatically at http://localhost:3456
# Click "Ask AI" button
# Describe what you want: "Create a modern pricing table"
# Watch AI generate the UI instantly!
```

## Commands

### `/design start [options]`
Start the design server

**Options:**
- `--port <number>` - Port number (default: 3456)
- `--dir <path>` - Work directory (default: .lovable)
- `--no-open` - Don't auto-open browser

**Examples:**
```bash
/design start
/design start --port 8080
/design start --dir ./my-designs --no-open
```

### `/design stop`
Stop the running server

### `/design status`
Show server status and info

### `/design open`
Open design in browser (if server running)

### `/design help`
Show help information

## Usage Guide

### 1. Starting a Session

```bash
You: /design start

🚀 Starting Lovable Design server...
✓ Browser connected
🎨 Lovable Design Server started!
   URL: http://localhost:3456
   Work dir: /Users/you/project/.lovable
```

### 2. Creating UI with AI

In the browser:
1. Click **"Ask AI"** button
2. Enter your request:
   - "Create a hero section with gradient background"
   - "Add a card grid with 3 items"
   - "Make a responsive navigation bar"
3. AI generates HTML/CSS/JS
4. Preview updates instantly

### 3. Debugging

- Open **Console** to see logs and errors
- Errors are highlighted in red
- AI can analyze and fix errors automatically

### 4. Exporting

Click **"Export"** to download your design as a text file containing:
- HTML code
- CSS styles
- JavaScript code

## File Structure

When you start the server, it creates:

```
.lovable/
├── index.html    # Main HTML structure
├── styles.css    # CSS styles
└── script.js     # JavaScript code
```

Files are automatically created with a beautiful starter template.

## AI Prompting Tips

### Good Prompts ✅
- "Create a modern card with image, title, description, and button"
- "Add smooth scroll animation to the page"
- "Make the layout responsive for mobile"
- "Change the color scheme to dark mode"

### Better Prompts ✨
- "Create a pricing table with 3 tiers: Basic ($9), Pro ($29), Enterprise ($99). Use gradient backgrounds and hover effects"
- "Add a testimonial carousel with auto-play every 3 seconds"
- "Create a dashboard with sidebar navigation and stats cards"

### Be Specific
The more specific you are, the better results you'll get.

## Features in Detail

### Live Preview
- Changes appear instantly (no manual refresh)
- Uses iframe sandbox for security
- Full JavaScript support
- WebSocket for real-time updates

### Console Monitoring
- Captures all console.log, console.error, console.warn
- Displays in bottom panel
- Click "Console" button to toggle
- Errors highlighted in red

### Hot Reload
- Watches .lovable/ directory for changes
- Automatic reload on file save
- Edit files externally (VS Code, etc.)
- Changes sync to all connected browsers

### AI Integration
- Uses your active AI agent (Copilot, Claude, etc.)
- Understands context from current design
- Generates semantic HTML
- Creates responsive CSS
- Adds interactive JavaScript

## Architecture

```
Browser                    Server                     AI
  |                         |                          |
  |-- WebSocket ----------->|                          |
  |                         |                          |
  |<-- Live Updates --------|                          |
  |                         |                          |
  |-- Ask AI Request ------>|-- Generate UI --------->|
  |                         |                          |
  |                         |<-- HTML/CSS/JS ----------|
  |                         |                          |
  |<-- Updated Design ------|                          |
  |                         |                          |
  |-- Console Logs -------->|                          |
  |                         |                          |
  |-- File Changes -------->|-- Hot Reload ----------->|
```

## Advanced Usage

### Custom Port

```bash
/design start --port 8080
```

### Custom Work Directory

```bash
/design start --dir ./designs/landing-page
```

### Background Mode

```bash
/design start --no-open
# Server runs, browser doesn't open
# Visit http://localhost:3456 manually
```

### Multiple Projects

Run on different ports for multiple projects:

```bash
# Terminal 1
/design start --port 3456 --dir ./project-a

# Terminal 2  
/design start --port 3457 --dir ./project-b
```

## Troubleshooting

### Port Already in Use

```bash
Error: Port 3456 already in use

Solution:
/design start --port 3457
```

### Browser Doesn't Open

```bash
Solution 1: Open manually
Visit http://localhost:3456

Solution 2: Use /design open
/design open
```

### Changes Not Appearing

```bash
Solution 1: Check server status
/design status

Solution 2: Check console for errors
Click "Console" button in browser

Solution 3: Restart server
/design stop
/design start
```

### AI Not Generating Code

```bash
Solution 1: Check AI agent is active
/status

Solution 2: Try simpler prompt
Instead of: "Make it look amazing"
Try: "Add a blue button with white text"
```

## Examples

### Example 1: Landing Page

```bash
You: /design start

[In browser, click "Ask AI"]
Prompt: "Create a landing page with hero section, features grid (4 items), and footer. Use purple and pink gradient"

[AI generates complete landing page]
```

### Example 2: Dashboard

```bash
[Click "Ask AI"]
Prompt: "Create a dashboard with sidebar navigation (Home, Analytics, Users, Settings), header with search bar, and 4 metric cards showing numbers and icons"

[AI generates dashboard layout]
```

### Example 3: Component Library

```bash
[Click "Ask AI"]
Prompt: "Create a set of button components: primary (blue), secondary (gray), success (green), danger (red), all with hover effects and rounded corners"

[AI generates button set]
```

## Integration with Agenticide

The extension integrates with:
- **AI Agent Manager** - Uses active agent for generation
- **Task Cancellation** - ESC to cancel AI requests
- **Context System** - Understands project context
- **Extension Manager** - Auto-loads on startup

## Performance

- **Server startup**: <1 second
- **Hot reload**: <100ms
- **AI generation**: 2-5 seconds (depends on AI provider)
- **WebSocket latency**: <50ms

## Security

- Iframe sandbox for preview
- No external code execution
- Local server only (localhost)
- Files stored in project directory
- No data sent to external services (except AI provider)

## Roadmap

### Phase 1 (Current) ✅
- [x] Basic server
- [x] Live preview
- [x] AI generation
- [x] Console monitoring
- [x] Hot reload

### Phase 2 (Planned)
- [ ] Component library
- [ ] Templates gallery
- [ ] Design history/undo
- [ ] Multi-page support
- [ ] Asset management

### Phase 3 (Future)
- [ ] Collaborative editing
- [ ] Design system export
- [ ] Figma integration
- [ ] React/Vue component export
- [ ] Tailwind CSS support

## Contributing

Extension location: `agenticide-cli/extensions/lovable-design/`

To modify:
1. Edit files in extension directory
2. Reload Agenticide
3. Test with `/design start`

## Support

- GitHub Issues: https://github.com/your-repo/agenticide/issues
- Documentation: See main Agenticide docs
- Community: Discord/Slack

## License

Same as Agenticide - MIT License

---

**Built with ❤️ for the Agenticide community**

*Create beautiful UIs with AI assistance - no design skills required!*

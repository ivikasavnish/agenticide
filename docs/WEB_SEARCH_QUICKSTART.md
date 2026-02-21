# Web Search Extension - Quick Start

## Installation

```bash
cd agenticide-cli
npm install playwright
```

## Commands

### Search the Web
```bash
/search <query>              # Multi-engine search (Google + DuckDuckGo)
/find <query>                # Alias for search
/lookup <query>              # Alias for search
```

### Browse URLs  
```bash
/browse <url>                # Clean content (Readability-style)
/browse <url> --text         # Text-only mode (lynx-style)
/browse <url> --console      # Capture JavaScript console logs
/browse <url> --raw          # Raw HTML
```

### Extract Content
```bash
/extract --text              # Extract clean text
/extract --links             # Extract all links
/extract --images            # Extract all images
/extract --data              # Extract structured data (meta, JSON-LD)
```

## Examples

**Research a topic:**
```bash
/search "React hooks tutorial"
/browse https://react.dev/hooks --clean
/extract --links
```

**Quick content scan:**
```bash
/browse https://news-site.com/article --text
```

**Debug a website:**
```bash
/browse https://my-site.com --console
/extract --data
```

## Features

✓ Multi-engine search with deduplication  
✓ Readability-style content cleaning  
✓ Lynx-style text-only browsing  
✓ Console log & error capture  
✓ Link/image/data extraction  
✓ HTML cleaning (removes ads, scripts)  
✓ Structured data extraction (meta, JSON-LD)

## Full Documentation

See [WEB_SEARCH_EXTENSION.md](./WEB_SEARCH_EXTENSION.md) for complete guide.

# Web Search Extension

Advanced web search extension with content extraction, console capture, and text-mode browsing.

## Features

### 🔍 Multi-Engine Search
- **Google Search**: Fast and accurate results
- **DuckDuckGo Search**: Privacy-focused search
- **Result Deduplication**: Automatically removes duplicate URLs
- **Parallel Search**: Queries multiple engines simultaneously

### 🧹 Content Cleaning (Readability-Style)
- Removes ads, navigation, footers, sidebars
- Extracts main content only
- Identifies headings and paragraphs
- Calculates word count and reading time
- Clean, distraction-free output

### 📝 Text-Only Mode (Lynx-Style)
- Terminal-friendly text extraction
- Removes all scripts, styles, and hidden elements
- Preserves document structure with line breaks
- Perfect for quick content scanning

### 🖥️ Console Capture
- Captures all `console.log`, `console.warn`, `console.error`
- Tracks JavaScript errors with stack traces
- Real-time monitoring of page behavior
- Helps debug and understand page issues

### 🔗 Content Extraction
- **Links**: Extract all URLs with text and titles
- **Images**: Get image sources, alt text, dimensions
- **Structured Data**: Extract meta tags, JSON-LD, microdata
- **Text**: Clean text content without HTML

## Installation

```bash
# Install Playwright (required)
cd agenticide-cli
npm install playwright

# Extension is auto-loaded from extensions/web-search.js
```

## Usage

### Search Command

```bash
# Basic search
/search Node.js best practices

# Aliases
/find JavaScript tutorials
/lookup Python frameworks
```

**Output:**
- Numbered list of results
- Title, URL, and snippet for each result
- Source indicator (Google/DuckDuckGo)
- Deduplicated and ranked

### Browse Command

```bash
# Clean content (default)
/browse https://example.com
/browse https://example.com --clean

# Text-only mode (lynx-style)
/browse https://example.com --text

# Raw HTML
/browse https://example.com --raw

# With console logs
/browse https://example.com --console
/browse https://example.com --clean --console
```

**Clean Mode Output:**
- Page title
- Table of contents (headings)
- Main content paragraphs
- Word count

**Text Mode Output:**
- Terminal-friendly plain text
- Preserves structure with line breaks
- No HTML tags or styling

**Console Mode Output:**
- All console messages
- JavaScript errors with stack traces
- Warnings and info messages

### Extract Command

```bash
# Extract text (default)
/extract
/extract --text

# Extract links
/extract --links

# Extract images
/extract --images

# Extract structured data (meta, JSON-LD)
/extract --data

# Combine multiple
/extract --links --images
```

**Requirements:**
- Must browse a page first with `/browse <url>`
- Operates on the last visited page

## Technical Details

### Content Cleaning Algorithm

Based on Mozilla's Readability algorithm:

1. **Remove Unwanted Elements**
   - Scripts, styles, iframes
   - Navigation, headers, footers
   - Ads, social sharing, comments
   - Sidebars and menus

2. **Identify Main Content**
   - Look for `<main>`, `<article>`, `[role="main"]`
   - Fall back to body if not found

3. **Extract Meaningful Paragraphs**
   - Minimum length threshold (40 characters)
   - Good text density
   - Includes headings (h1-h6) and lists

4. **Calculate Metrics**
   - Word count
   - Paragraph count
   - Reading time estimation

### Text Extraction

Lynx-style text browser approach:

1. **Remove Non-Content**
   - Scripts, styles, noscript
   - Hidden elements (`display: none`)
   - Iframes and embeds

2. **Walk DOM Tree**
   - Text nodes become content
   - Block elements add line breaks
   - Headings add extra spacing

3. **Clean Whitespace**
   - Trim excessive newlines
   - Remove leading/trailing spaces
   - Normalize to readable format

### Console Capture

Real-time JavaScript monitoring:

```javascript
page.on('console', msg => {
    // Captures: log, info, warn, error
    consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
    });
});

page.on('pageerror', error => {
    // Captures unhandled errors
    consoleLogs.push({
        type: 'error',
        text: error.message,
        stack: error.stack
    });
});
```

### Structured Data Extraction

Extracts machine-readable metadata:

- **Meta Tags**: OpenGraph, Twitter Cards, standard meta
- **JSON-LD**: Structured data for search engines
- **Microdata**: Embedded semantic markup

## Examples

### Example 1: Research a Topic

```bash
# Search for articles
/search "React Server Components tutorial"

# Browse top result with clean content
/browse https://example.com/react-tutorial --clean

# Extract all links for further reading
/extract --links

# Check for any JavaScript errors
/browse https://example.com/react-tutorial --console
```

### Example 2: Quick Content Scan

```bash
# Get text-only view for fast reading
/browse https://news-site.com/article --text

# Extract main points
/extract --text
```

### Example 3: Debug a Website

```bash
# Browse with console monitoring
/browse https://my-site.com --console

# Check structured data
/extract --data

# Verify all images load
/extract --images
```

### Example 4: Content Aggregation

```bash
# Search multiple sources
/search "Web development trends 2024"

# Browse each result
/browse <url1> --clean
/browse <url2> --clean
/browse <url3> --clean

# Extract and compare
```

## Architecture

### Class Structure

```
WebSearchExtension
  ├── Browser Management
  │   ├── initBrowser()
  │   ├── closeBrowser()
  │   └── setupConsoleCapture()
  │
  ├── Search Commands
  │   ├── handleSearch()
  │   ├── searchGoogle()
  │   └── searchDuckDuckGo()
  │
  ├── Browse Commands
  │   ├── handleBrowse()
  │   ├── extractTextContent()
  │   └── extractCleanContent()
  │
  ├── Extract Commands
  │   ├── handleExtract()
  │   ├── extractLinks()
  │   ├── extractImages()
  │   └── extractStructuredData()
  │
  └── Display Helpers
      ├── displaySearchResults()
      ├── displayTextMode()
      ├── displayCleanContent()
      └── displayConsoleLogs()
```

### Browser Configuration

```javascript
{
    headless: true,  // No visible browser window
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
    ],
    userAgent: 'Mozilla/5.0...',  // Realistic user agent
    viewport: { width: 1280, height: 720 }
}
```

### Page Management

- Multiple pages supported via `Map<url, page>`
- Each page has console capture enabled
- Automatic cleanup on disable
- Isolated contexts for security

## Performance

- **Parallel Search**: 2+ engines simultaneously
- **Headless Browser**: Fast page loading
- **Timeout Protection**: 10-15s limits
- **Memory Management**: Automatic page cleanup
- **Caching**: Browser context reuse

## Security

- **Sandboxed Browser**: Isolated from system
- **No Same-Origin**: Cross-origin restrictions apply
- **User Agent Spoofing**: Prevents bot detection
- **HTTPS Preferred**: Auto-upgrade HTTP to HTTPS

## Future Enhancements

- [ ] More search engines (Bing, Yahoo, Brave)
- [ ] Search result caching
- [ ] PDF content extraction
- [ ] Screenshot capture
- [ ] Interactive form filling
- [ ] Element clicking/interaction
- [ ] Cookie management
- [ ] Proxy support
- [ ] Custom user agents
- [ ] Rate limiting
- [ ] Result ranking/scoring
- [ ] Content summarization (AI)

## Troubleshooting

### "Playwright not installed"

```bash
cd agenticide-cli
npm install playwright
```

### "Failed to launch browser"

- Check system dependencies
- On Linux: `sudo apt-get install libnss3 libatk1.0-0`
- On Mac: Ensure Xcode tools installed
- Try manual install: `npx playwright install chromium`

### "Timeout waiting for page"

- Increase timeout in code
- Check internet connection
- Some sites may block automation

### "No results found"

- Search engines may detect automation
- Try different query phrasing
- Some sites require JavaScript disabled

## Related Extensions

- **browser.js**: Low-level Playwright automation
- **mcp.js**: Model Context Protocol integration
- **api.js**: REST API testing

## Contributing

To add new search engines:

1. Add `searchEngine()` method
2. Parse result HTML structure
3. Add to `handleSearch()` Promise.allSettled array
4. Update documentation

To improve content cleaning:

1. Modify `extractCleanContent()`
2. Add new unwanted selectors
3. Adjust text density thresholds
4. Test with various websites

## License

MIT - Part of Agenticide project

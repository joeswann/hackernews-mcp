# Hacker News MCP Server

A read-only MCP (Model Context Protocol) server for Hacker News. Enables Claude Desktop, Claude Code, and other MCP clients to browse stories, read comments, search posts, and view user profiles. No authentication required.

## Features

- **Story Listings**: Browse top, new, best, ask, show, and job stories
- **Comments**: View full comment threads with nesting
- **Search**: Full-text search via Algolia
- **User Profiles**: View user info and submission history

## Installation

### From Source

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HN_USERNAME` | No | — | Optional HN username for context |
| `HN_API_BASE_URL` | No | `https://hacker-news.firebaseio.com/v0` | Firebase API endpoint |
| `HN_ALGOLIA_BASE_URL` | No | `https://hn.algolia.com/api/v1` | Algolia search endpoint |

No credentials needed. All data is publicly accessible.

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hackernews": {
      "command": "node",
      "args": ["/path/to/hn-mcp/build/index.js"]
    }
  }
}
```

## Usage with Claude Code

```bash
claude mcp add hackernews -- node /path/to/hn-mcp/build/index.js
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_stories` | List stories by type (top, new, best, ask, show, job) |
| `get_item` | Get a specific item (story, comment, job) |
| `get_comments` | Get full comment thread with nesting |
| `search` | Full-text search via Algolia |
| `get_user` | View a user's profile |
| `get_user_submissions` | List a user's posts |

## Development

- `npm run dev` — Watch mode with TypeScript compilation
- `npm run build` — Build the project
- `npm start` — Start the built server

## License

MIT

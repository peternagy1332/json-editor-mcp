# JSON Editor MCP

A Model Context Protocol (MCP) server for editing JSON files with read, write, and deep merge capabilities. Perfect for managing multilingual Next.js projects and other JSON-based configurations.

## Features

- **Read JSON values** at any path using dot notation
- **Write JSON values** with automatic path creation
- **Deep merge duplicate keys** with recursive object merging
- **TypeScript support** with full type definitions
- **MCP compliant** for use with AI assistants and development tools

## Installation

```bash
npm install json-editor-mcp
# or
yarn add json-editor-mcp
# or
bun add json-editor-mcp
```

## Usage

### As an MCP Server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "json-editor": {
      "command": "npx",
      "args": ["json-editor-mcp"]
    }
  }
}
```

### Available Tools

#### 1. `read_json_value`
Read a value from a JSON file at a specified path.

**Parameters:**
- `filePath` (string): Path to the JSON file
- `path` (string): Dot notation path (e.g., "common.welcome")

**Example:**
```javascript
// Read from messages/en.json at path "common.welcome"
read_json_value("messages/en.json", "common.welcome")
```

#### 2. `write_json_value`
Write a value to a JSON file at a specified path. Creates missing paths automatically.

**Parameters:**
- `filePath` (string): Path to the JSON file
- `path` (string): Dot notation path (e.g., "common.welcome")
- `value` (any): Value to write (any JSON-serializable type)

**Example:**
```javascript
// Write to messages/en.json at path "common.greeting"
write_json_value("messages/en.json", "common.greeting", "Hello World")
```

#### 3. `merge_duplicate_keys`
Deep merge duplicate keys in a JSON file. Last value wins for primitives, objects merge recursively.

**Parameters:**
- `filePath` (string): Path to the JSON file

**Example:**
```javascript
// Merge duplicate keys in messages/en.json
merge_duplicate_keys("messages/en.json")
```

## Next.js i18n Example

Perfect for managing multilingual Next.js projects with `next-intl` or similar libraries.

### Project Structure
```
messages/
├── en.json
├── es.json
├── fr.json
└── de.json
```

### Example JSON Files

**messages/en.json:**
```json
{
  "common": {
    "welcome": "Welcome",
    "goodbye": "Goodbye"
  },
  "pages": {
    "home": {
      "title": "Home Page",
      "description": "Welcome to our website"
    }
  }
}
```

### Usage Examples

```javascript
// Read a translation
read_json_value("messages/en.json", "common.welcome")
// Returns: "Welcome"

// Add a new translation
write_json_value("messages/en.json", "common.hello", "Hello")
// Creates: { "common": { "welcome": "Welcome", "goodbye": "Goodbye", "hello": "Hello" } }

// Add nested translation
write_json_value("messages/en.json", "pages.about.title", "About Us")
// Creates nested structure automatically

// Merge duplicate keys (useful after manual editing)
merge_duplicate_keys("messages/en.json")
```

## Development

### Building from Source

```bash
git clone https://github.com/yourusername/json-editor-mcp.git
cd json-editor-mcp
npm install
npm run build
```

### Running in Development

```bash
npm run dev
```

## API Reference

### Path Notation

All tools use dot notation for paths:
- `"common.welcome"` → `obj.common.welcome`
- `"pages.home.title"` → `obj.pages.home.title`
- `"deeply.nested.value"` → `obj.deeply.nested.value`

### Error Handling

- **File not found**: Creates empty object `{}` for read operations
- **Invalid JSON**: Returns error message
- **Path not found**: Throws error for read, creates path for write
- **Permission errors**: Returns descriptive error message

### Deep Merge Behavior

When merging duplicate keys:
- **Primitives**: Last value wins
- **Objects**: Recursively merged
- **Arrays**: Last value wins (not merged)
- **Mixed types**: Last value wins

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please file an issue on [GitHub](https://github.com/peternagy1332/json-editor-mcp/issues).

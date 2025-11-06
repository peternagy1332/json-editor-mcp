# JSON Editor MCP

A Model Context Protocol (MCP) server for editing JSON files with read, write, and deep merge capabilities. Perfect for managing multilingual Next.js projects and other JSON-based configurations.

> **Note:** This is an actively developed tool. Feature requests and bug reports are welcome! File issues on [GitHub](https://github.com/peternagy1332/json-editor-mcp/issues).

## Problems This Solves

- 💰 **Significant token savings**: Edit specific JSON paths instead of reading/writing entire files
- ⚡ **Efficient operations**: ~100 tokens per edit vs 4,000+ tokens for full file operations
- 📦 **Handles large files**: Large translation files may not fit into context windows; targeted operations work regardless of file size
- 🚀 **Faster edits**: Avoids slow network round-trips from reading/writing entire files
- 🔑 **Prevents duplicate keys**: AI can't see full translation JSON and creates duplicates; targeted operations avoid this issue
- 🔍 **Targeted reads**: Read only the values you need using dot notation paths
- ✏️ **Targeted writes**: Update only specific paths, automatically creates missing nested structures
- 🗑️ **Targeted deletes**: Remove specific paths from JSON files
- 🔀 **Deep merge support**: Merge duplicate keys with recursive object merging
- 📚 **Multi-file operations**: Read, write, or delete the same path from multiple JSON files efficiently
- 📘 **TypeScript support**: Full type definitions included
- 🤖 **MCP compliant**: Works with AI assistants (Cursor, Claude, ChatGPT) and development tools

## Installation

```bash
bun add json-editor-mcp
```

## Usage

### MCP Server Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "json-editor": {
      "command": "bunx",
      "args": ["json-editor-mcp"]
    }
  }
}
```

### Cursor Rules Integration

Copy the rule file to your project to ensure AI assistants use MCP tools:

```bash
cp .cursor/rules/json-editor-mcp.mdc /path/to/your/project/.cursor/rules/
```

## Tools

### `read_multiple_json_values`

Reads the same dot notation path from one or more JSON files in a single operation. Returns a map with file paths as keys and the extracted values as values. Useful for comparing translations across language files or reading from a single file.

**Note:** For single file operations, pass an array with one file path: `["messages/en.json"]`

**Input JSON files:**

**messages/en.json:**
```json
{
  "common": {
    "welcome": "Welcome"
  }
}
```

**messages/es.json:**
```json
{
  "common": {
    "welcome": "Bienvenido"
  }
}
```

**Tool call:**
```
read_multiple_json_values(["messages/en.json", "messages/es.json"], "common.welcome")
```

**Output:**
```json
{
  "messages/en.json": "Welcome",
  "messages/es.json": "Bienvenido"
}
```

**Single file example:**
```
read_multiple_json_values(["messages/en.json"], "common.welcome")
```

**Output:**
```json
{
  "messages/en.json": "Welcome"
}
```

### `write_multiple_json_values`

Writes a value to one or more JSON files at a specified dot notation path. Automatically creates missing nested paths and preserves existing structure. Returns a map with file paths as keys and operation results as values.

**Note:** For single file operations, pass an array with one file path: `["messages/en.json"]`

**Input JSON (messages/en.json):**
```json
{
  "common": {
    "welcome": "Welcome"
  }
}
```

**Tool call (single file):**
```
write_multiple_json_values(["messages/en.json"], "pages.about.title", "About Us")
```

**Output JSON (messages/en.json):**
```json
{
  "common": {
    "welcome": "Welcome"
  },
  "pages": {
    "about": {
      "title": "About Us"
    }
  }
}
```

**Tool call (multiple files):**
```
write_multiple_json_values(["messages/en.json", "messages/es.json"], "common.hello", "Hello")
```

**Output:**
```json
{
  "messages/en.json": "Successfully wrote",
  "messages/es.json": "Successfully wrote"
}
```

### `delete_multiple_json_values`

Deletes a value at a specified dot notation path from one or more JSON files. Returns a map with file paths as keys and deletion results as values.

**Note:** For single file operations, pass an array with one file path: `["messages/en.json"]`

**Input JSON files:**

**messages/en.json:**
```json
{
  "common": {
    "welcome": "Welcome",
    "goodbye": "Goodbye"
  }
}
```

**messages/es.json:**
```json
{
  "common": {
    "welcome": "Bienvenido",
    "goodbye": "Adiós"
  }
}
```

**Tool call:**
```
delete_multiple_json_values(["messages/en.json", "messages/es.json"], "common.goodbye")
```

**Output:**
```json
{
  "messages/en.json": "Successfully deleted",
  "messages/es.json": "Successfully deleted"
}
```

**Output JSON files:**

**messages/en.json:**
```json
{
  "common": {
    "welcome": "Welcome"
  }
}
```

**messages/es.json:**
```json
{
  "common": {
    "welcome": "Bienvenido"
  }
}
```

### `merge_duplicate_keys`

Performs a deep merge of duplicate keys in a JSON file. Primitives use last-value-wins, objects merge recursively, and arrays use last-value-wins. Useful when AI assistants create duplicate keys because they can't see the full file structure.

**Input JSON (messages/en.json):**
```json
{
  "common": {
    "welcome": "Welcome"
  },
  "common": {
    "goodbye": "Goodbye"
  }
}
```

**Tool call:**
```
merge_duplicate_keys("messages/en.json")
```

**Output JSON (messages/en.json):**
```json
{
  "common": {
    "welcome": "Welcome",
    "goodbye": "Goodbye"
  }
}
```

## API Reference

**Path Notation:** Dot notation for nested paths (e.g., `"common.welcome"`, `"pages.home.title"`)

**Error Handling:**
- File not found: Creates empty object `{}` for reads
- Invalid JSON: Returns error message
- Path not found: Error for reads, auto-creates for writes

**Deep Merge:** Primitives last-value-wins, objects merge recursively, arrays last-value-wins

## Development

```bash
git clone https://github.com/peternagy1332/json-editor-mcp.git
cd json-editor-mcp
bun install
bun run build
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

File issues on [GitHub](https://github.com/peternagy1332/json-editor-mcp/issues).

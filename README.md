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

### Cursor Rules Integration

For the best experience with Cursor, copy the rule file to your project:

```bash
# Copy the rule file to your project
cp .cursor/rules/json-editor-mcp.mdc /path/to/your/project/.cursor/rules/
```

Or manually create `.cursor/rules/json-editor-mcp.mdc` in your project with this content:

```markdown
# JSON File Editing with MCP Tools

When editing JSON files (especially translation files like messages/*.json, i18n files, or any JSON configuration), ALWAYS use the JSON Editor MCP tools instead of directly editing the files:

## Available Tools:
- `read_json_value` - Read values from JSON files using dot notation paths
- `write_json_value` - Write values to JSON files with automatic path creation
- `merge_duplicate_keys` - Deep merge duplicate keys in JSON files
- `read_multiple_json_values` - Read values from multiple JSON files at a specified path, returns a map

## Usage Guidelines:

### For Reading JSON Values:
- Use `read_json_value` to read specific values from JSON files
- Example: `read_json_value("messages/en.json", "common.welcome")`
- Always specify the full file path and dot notation path

### For Writing JSON Values:
- Use `write_json_value` to add or update values in JSON files
- Example: `write_json_value("messages/en.json", "common.greeting", "Hello World")`
- The tool automatically creates missing paths
- Supports nested objects: `write_json_value("config.json", "database.host", "localhost")`

### For Merging Duplicate Keys:
- Use `merge_duplicate_keys` when JSON files have duplicate keys
- Example: `merge_duplicate_keys("messages/en.json")`
- This performs deep merge with last value wins for primitives

### For Reading Multiple Files:
- Use `read_multiple_json_values` to read the same path from multiple JSON files
- Example: `read_multiple_json_values(["en.json", "es.json"], "common.welcome")`
- Returns a map with file paths as keys and extracted values as values
- Handles errors gracefully - if one file fails, others are still processed

## When to Use These Tools:
- ✅ Editing translation files (messages/*.json)
- ✅ Updating configuration files
- ✅ Managing i18n/locale files
- ✅ Any JSON file manipulation
- ❌ Don't use for non-JSON files
- ❌ Don't manually edit JSON files when these tools are available

## Examples for Common Scenarios:

### Adding a new translation:
```javascript
write_json_value("messages/en.json", "pages.about.title", "About Us")
```

### Reading existing translation:
```javascript
read_json_value("messages/es.json", "common.welcome")
```

### Updating nested configuration:
```javascript
write_json_value("config.json", "api.endpoints.users", "/api/v1/users")
```

### Merging duplicate keys after manual editing:
```javascript
merge_duplicate_keys("messages/en.json")
```

## Important Notes:
- Always use absolute or relative paths from the project root
- Dot notation paths work for nested objects (e.g., "a.b.c")
- The tools preserve JSON formatting and structure
- Missing paths are created automatically when writing
- Deep merge preserves object structure while merging duplicates

This ensures consistent, reliable JSON file editing across the project.
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

#### 4. `read_multiple_json_values`
Read values from multiple JSON files at a specified path using dot notation. Returns a map of file paths to values.

**Parameters:**
- `filePaths` (array): Array of paths to JSON files
- `path` (string): Dot notation path (e.g., "common.welcome")

**Example:**
```javascript
// Read "common.welcome" from multiple language files
read_multiple_json_values(
  ["messages/en.json", "messages/es.json", "messages/fr.json"], 
  "common.welcome"
)
// Returns: {
//   "messages/en.json": "Welcome to our website",
//   "messages/es.json": "Bienvenido a nuestro sitio web", 
//   "messages/fr.json": "Bienvenue sur notre site web"
// }
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

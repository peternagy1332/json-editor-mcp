# Next.js i18n Example

This example shows how to use the JSON Editor MCP with a Next.js internationalization project.

## Project Structure

```
examples/nextjs-i18n/
├── messages/
│   ├── en.json
│   └── es.json
└── README.md
```

## Usage Examples

### Reading Translations

```javascript
// Read a specific translation
read_json_value("messages/en.json", "common.welcome")
// Returns: "Welcome to our website"

read_json_value("messages/es.json", "pages.home.title")
// Returns: "Bienvenido a Nuestra Plataforma"
```

### Adding New Translations

```javascript
// Add a new translation key
write_json_value("messages/en.json", "common.hello", "Hello there!")

// Add nested translation
write_json_value("messages/en.json", "errors.validation.required", "This field is required")
```

### Merging Duplicate Keys

If you accidentally have duplicate keys in your JSON files:

```javascript
// This will merge any duplicate keys found
merge_duplicate_keys("messages/en.json")
```

## Integration with next-intl

This MCP server works perfectly with `next-intl` or similar i18n libraries:

```typescript
// In your Next.js app
import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations('pages.home');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
    </div>
  );
}
```

## MCP Client Configuration

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

Then you can use the tools to manage your translation files directly from your AI assistant!

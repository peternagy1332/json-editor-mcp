// Direct test of the merge logic
const fs = require('fs');

// Read the compiled source
const sourceCode = fs.readFileSync('dist/index.js', 'utf-8');

// Extract the deepMergeDuplicates and deepMerge methods
const deepMergeDuplicatesMatch = sourceCode.match(/deepMergeDuplicates\([^}]+\{[^}]+\}[^}]+\)/s);
const deepMergeMatch = sourceCode.match(/deepMerge\([^}]+\{[^}]+\}[^}]+\)/s);

if (!deepMergeDuplicatesMatch || !deepMergeMatch) {
  console.log('Could not extract methods from compiled code');
  process.exit(1);
}

// Create a test object with duplicate keys
const testData = {
  "common": {
    "someKey1": "someValue1",
    "subKey1": {
      "subKey11": "subValue11",
      "subKey12": "subValue12"
    }
  },
  "common": {
    "someKey1": "someValue2",
    "someKey2": "someValue3",
    "subKey1": {
      "subKey11": "subValue11",
      "subKey12": "subValue12",
      "subKey13": "subValue13"
    }
  }
};

console.log('Input data:');
console.log(JSON.stringify(testData, null, 2));

// Test the merge by using the MCP server directly
const { spawn } = require('child_process');

// Write test data
fs.writeFileSync('test-input.json', JSON.stringify(testData, null, 2));

// Start server and test
const server = spawn('node', ['dist/index.js'], { stdio: ['pipe', 'pipe', 'pipe'] });

const request = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "merge_duplicate_keys",
    arguments: {
      filePath: "test-input.json"
    }
  }
};

server.stdin.write(JSON.stringify(request) + '\n');

let response = '';
server.stdout.on('data', (data) => {
  response += data.toString();
  if (response.includes('"result"')) {
    try {
      const parsed = JSON.parse(response.trim());
      console.log('\nMCP Response:');
      console.log(JSON.stringify(parsed, null, 2));
      
      // Read the merged file
      const merged = JSON.parse(fs.readFileSync('test-input.json', 'utf-8'));
      console.log('\nMerged result:');
      console.log(JSON.stringify(merged, null, 2));
      
      server.kill();
    } catch (e) {
      console.log('Error parsing response:', e.message);
    }
  }
});

server.stderr.on('data', (data) => {
  console.log('Server stderr:', data.toString());
});

setTimeout(() => {
  server.kill();
  console.log('Test timeout');
}, 5000);

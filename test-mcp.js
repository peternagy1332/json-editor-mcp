#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Start the MCP server
const server = spawn('node', [path.join(__dirname, 'dist', 'index.js')], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Test data with duplicate keys
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

// Write test data to file
const fs = require('fs');
fs.writeFileSync('test-input.json', JSON.stringify(testData, null, 2));

console.log('Input data:');
console.log(JSON.stringify(testData, null, 2));

// Send merge request
const mergeRequest = {
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

server.stdin.write(JSON.stringify(mergeRequest) + '\n');

// Read response
let output = '';
server.stdout.on('data', (data) => {
  output += data.toString();
  try {
    const response = JSON.parse(output.trim());
    console.log('\nMCP Response:');
    console.log(JSON.stringify(response, null, 2));
    
    // Read the merged file
    const mergedData = JSON.parse(fs.readFileSync('test-input.json', 'utf-8'));
    console.log('\nMerged result:');
    console.log(JSON.stringify(mergedData, null, 2));
    
    server.kill();
  } catch (e) {
    // Not complete JSON yet, continue reading
  }
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

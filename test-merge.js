const { JsonEditorMCPServer } = require('./dist/index.js');

// Create a test instance
const server = new JsonEditorMCPServer();

// Test data
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

// Test the deepMergeDuplicates method
const result = server.deepMergeDuplicates(testData);

console.log('\nMerged result:');
console.log(JSON.stringify(result, null, 2));

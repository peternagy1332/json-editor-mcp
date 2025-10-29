// Test setup file
import { promises as fs } from 'fs';
import path from 'path';

// Create a temporary directory for test files
const testDir = path.join(__dirname, 'temp');

beforeAll(async () => {
  try {
    await fs.mkdir(testDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
});

afterAll(async () => {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    // Ignore cleanup errors
  }
});

// Helper function to create test files
export const createTestFile = async (filename: string, content: any): Promise<string> => {
  const filePath = path.join(testDir, filename);
  // Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(content, null, 2));
  return filePath;
};

// Helper function to read test files
export const readTestFile = async (filePath: string): Promise<any> => {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
};

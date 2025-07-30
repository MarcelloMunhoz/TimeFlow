// Script to restart the server with proper error handling
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔄 Restarting TimeFlow server...');

// Kill any existing processes on port 5000
console.log('🛑 Checking for existing processes on port 5000...');

const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
});

serverProcess.on('exit', (code) => {
  console.log(`🔚 Server process exited with code ${code}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

console.log('✅ Server restart initiated. Check the output above for any errors.');

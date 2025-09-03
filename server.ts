#!/usr/bin/env tsx

// Main server entry point that starts both the SvelteKit app and WebSocket server

import { spawn } from 'child_process';
import { GameWSServer } from './src/lib/server/ws-server.ts';

let wsServer: GameWSServer | null = null;

// Start the WebSocket server
const wsPort = parseInt(process.env.WS_PORT || '8080', 10);
try {
  wsServer = new GameWSServer(wsPort);
  console.log(`🚀 WebSocket server started on port ${wsPort}`);
} catch (error) {
  console.error(`Failed to start WebSocket server on port ${wsPort}:`, error);
  console.log('WebSocket server may already be running or port is in use');
}

// Start the SvelteKit app
const svelteKitPort = parseInt(process.env.PORT || '3000', 10);
const svelteKit = spawn('npm', ['run', 'preview', '--', '--port', svelteKitPort.toString()], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: svelteKitPort.toString()
  }
});

console.log(`🎮 SvelteKit app starting on port ${svelteKitPort}`);

// Handle shutdown
process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  if (wsServer) {
    wsServer.shutdown();
  }
  svelteKit.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down servers...');
  if (wsServer) {
    wsServer.shutdown();
  }
  svelteKit.kill();
  process.exit(0);
});
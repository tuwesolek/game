#!/usr/bin/env tsx

// Simple WebSocket client test

import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('Connected to WebSocket server');
  
  // Send a pixel update message
  ws.send(JSON.stringify({
    type: 'pixel_update',
    tile_id: '10_15',
    color: '#ff0000',
    opacity: 1.0,
    owner_id: 'test-player'
  }));
  
  console.log('Sent pixel update message');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', message);
  
  if (message.type === 'pixel_update') {
    console.log('Pixel update confirmed:', message.data);
  }
});

ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

ws.on('close', () => {
  console.log('Connection closed');
});

// Close after 5 seconds
setTimeout(() => {
  ws.close();
}, 5000);
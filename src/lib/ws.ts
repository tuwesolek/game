// WebSocket client for game communication

import { browser } from '$app/environment';
import { writable, get } from 'svelte/store';
import { worldState, gameActions, player } from './store';
import type { Tile, Building, PixelUpdateMessage, BuildingPlacementMessage } from './types';

const WS_URL = import.meta.env.VITE_WEBSOCKET_URL || (typeof window !== 'undefined' ? `ws://${window.location.hostname}:8080` : 'ws://localhost:8080');

class WebSocketClient {
  private ws: WebSocket | null = null;
  public connectionState = writable<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  private pixelUpdateCallbacks: Set<(update: PixelUpdateMessage) => void> = new Set();
  private buildingPlacedCallbacks: Set<(building: Building) => void> = new Set();

  constructor() {
    if (browser) {
      this.connect();
    }
  }

  private connect() {
    this.connectionState.set('connecting');
    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connectionState.set('connected');
      this.send({ type: 'player_join', payload: { playerId: get(player)?.id || 'anonymous' } });
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.connectionState.set('disconnected');
      // Attempt to reconnect after a delay
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.connectionState.set('error');
      this.ws?.close(); // Close to trigger onclose and reconnect
    };
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'world_state':
        console.log('Initial world state received:', message.payload);
        worldState.set(message.payload);
        break;
      case 'pixel_update':
        const pixelUpdate: PixelUpdateMessage = message.payload;
        gameActions.updateTile(pixelUpdate.tile_id, {
          color: pixelUpdate.color,
          opacity: pixelUpdate.opacity,
        } as Partial<Tile>);
        this.pixelUpdateCallbacks.forEach(callback => callback(pixelUpdate));
        break;
      case 'building_placed':
        const building: Building = message.payload;
        gameActions.addBuilding(building.owner_id, building);
        this.buildingPlacedCallbacks.forEach(callback => callback(building));
        break;
      case 'player_update':
        gameActions.updateResources(message.payload.playerId, message.payload.resources);
        break;
      case 'error':
        console.error('Server error:', message.payload);
        break;
      default:
        console.warn('Unknown message type:', message.type, message.payload);
    }
  }

  public send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not open. Message not sent:', message);
    }
  }

  public sendPixelUpdate(tile_id: string, color: string, opacity: number) {
    this.send({
      type: 'pixel_update',
      payload: { tile_id, color, opacity },
    });
  }

  public sendBuildingPlacement(data: { building_type: Building['type']; position: { lat_idx: number; lon_idx: number } }) {
    this.send({
      type: 'building_placement',
      payload: data,
    });
  }

  public onPixelUpdate(callback: (update: PixelUpdateMessage) => void) {
    this.pixelUpdateCallbacks.add(callback);
    return () => this.pixelUpdateCallbacks.delete(callback);
  }

  public onBuildingPlaced(callback: (building: Building) => void) {
    this.buildingPlacedCallbacks.add(callback);
    return () => this.buildingPlacedCallbacks.delete(callback);
  }
}

const wsClient = new WebSocketClient();

export function getWebSocket() {
  return wsClient;
}

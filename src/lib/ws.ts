// WebSocket client with reconnection logic and tile-sharded subscriptions

import type { WSMessage, PixelUpdate, TileId } from './types.js';
import { GAME_CONFIG } from './game/constants.js';
import { writable, type Writable } from 'svelte/store';

export interface WSConnectionState {
	connected: boolean;
	reconnecting: boolean;
	attempts: number;
	lastError?: string;
}

export class GameWebSocket {
	private ws: WebSocket | null = null;
	private reconnectTimeout: any = null;
	private subscriptedShards = new Set<string>();
	
	// Connection state store
	public connectionState: Writable<WSConnectionState> = writable({
		connected: false,
		reconnecting: false,
		attempts: 0
	});

	// Message handlers
	private messageHandlers = new Map<string, ((data: any) => void)[]>();

	constructor(private url: string) {
		this.connect();
	}

	private connect(): void {
		try {
			this.updateConnectionState({ reconnecting: true });
			
			this.ws = new WebSocket(this.url);
			
			this.ws.onopen = () => {
				console.log('WebSocket connected');
				this.updateConnectionState({ 
					connected: true, 
					reconnecting: false, 
					attempts: 0 
				});
				
				// Resubscribe to shards after reconnection
				this.resubscribeShards();
			};
			
			this.ws.onclose = (event) => {
				console.log('WebSocket closed:', event.code, event.reason);
				this.updateConnectionState({ connected: false });
				this.scheduleReconnect();
			};
			
			this.ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				this.updateConnectionState({ 
					connected: false,
					lastError: 'Connection failed' 
				});
			};
			
			this.ws.onmessage = (event) => {
				try {
					const message: WSMessage = JSON.parse(event.data);
					this.handleMessage(message);
				} catch (error) {
					console.error('Failed to parse WebSocket message:', error);
				}
			};
		} catch (error) {
			console.error('Failed to create WebSocket connection:', error);
			this.scheduleReconnect();
		}
	}

	private updateConnectionState(updates: Partial<WSConnectionState>): void {
		this.connectionState.update(state => ({ ...state, ...updates }));
	}

	private scheduleReconnect(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
		}

		this.connectionState.update(state => {
			const newAttempts = state.attempts + 1;
			
			if (newAttempts > GAME_CONFIG.WS_MAX_RECONNECT_ATTEMPTS) {
				return {
					...state,
					reconnecting: false,
					lastError: 'Max reconnection attempts reached'
				};
			}

			const delay = GAME_CONFIG.WS_RECONNECT_DELAY_MS * 
				Math.pow(GAME_CONFIG.WS_BACKOFF_MULTIPLIER, newAttempts - 1);

			this.reconnectTimeout = setTimeout(() => {
				this.connect();
			}, delay);

			return {
				...state,
				attempts: newAttempts,
				reconnecting: true
			};
		});
	}

	private resubscribeShards(): void {
		for (const shardId of this.subscriptedShards) {
			this.send({
				type: 'subscribe_shard',
				shard_id: shardId
			});
		}
	}

	private handleMessage(message: WSMessage): void {
		// Call registered handlers for this message type
		const handlers = this.messageHandlers.get(message.type) || [];
		for (const handler of handlers) {
			try {
				handler(message.data);
			} catch (error) {
				console.error(`Error in message handler for ${message.type}:`, error);
			}
		}
	}

	// Public API
	public send(data: any): boolean {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(data));
			return true;
		}
		return false;
	}

	public subscribeTiles(shardIds: Set<string>): void {
		// Subscribe to new shards
		for (const shardId of shardIds) {
			if (!this.subscriptedShards.has(shardId)) {
				this.subscriptedShards.add(shardId);
				this.send({
					type: 'subscribe_shard',
					shard_id: shardId
				});
			}
		}

		// Unsubscribe from old shards
		for (const shardId of this.subscriptedShards) {
			if (!shardIds.has(shardId)) {
				this.subscriptedShards.delete(shardId);
				this.send({
					type: 'unsubscribe_shard',
					shard_id: shardId
				});
			}
		}
	}

	public onMessage<T = any>(type: string, handler: (data: T) => void): () => void {
		if (!this.messageHandlers.has(type)) {
			this.messageHandlers.set(type, []);
		}
		
		this.messageHandlers.get(type)!.push(handler);

		// Return unsubscribe function
		return () => {
			const handlers = this.messageHandlers.get(type);
			if (handlers) {
				const index = handlers.indexOf(handler);
				if (index > -1) {
					handlers.splice(index, 1);
				}
			}
		};
	}

	public disconnect(): void {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.updateConnectionState({ 
			connected: false, 
			reconnecting: false 
		});
	}

	// Convenience methods for common message types
	public onPixelUpdate(handler: (update: PixelUpdate) => void): () => void {
		return this.onMessage('pixel_update', handler);
	}

	public onPlayerUpdate(handler: (data: any) => void): () => void {
		return this.onMessage('player_update', handler);
	}

	public onBuildingPlaced(handler: (data: any) => void): () => void {
		return this.onMessage('building_placed', handler);
	}

	public onTickUpdate(handler: (data: any) => void): () => void {
		return this.onMessage('tick_update', handler);
	}

	// Send common game actions
	public sendPixelUpdate(tileId: TileId, color: string, opacity: number): void {
		this.send({
			type: 'pixel_update',
			tile_id: tileId,
			color,
			opacity,
			timestamp: Date.now()
		});
	}

	public sendBuildingPlacement(buildingData: any): void {
		this.send({
			type: 'place_building',
			...buildingData,
			timestamp: Date.now()
		});
	}

	public sendResourceConversion(conversionData: any): void {
		this.send({
			type: 'convert_resources',
			...conversionData,
			timestamp: Date.now()
		});
	}
}

// Singleton instance for app-wide use
let wsInstance: GameWebSocket | null = null;

export function getWebSocket(): GameWebSocket {
	if (!wsInstance) {
		const wsUrl = import.meta.env.PUBLIC_WS_URL || 'ws://localhost:5173/ws';
		wsInstance = new GameWebSocket(wsUrl);
	}
	return wsInstance;
}

export function disconnectWebSocket(): void {
	if (wsInstance) {
		wsInstance.disconnect();
		wsInstance = null;
	}
}
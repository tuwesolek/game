// WebSocket server for game communication

import { WebSocketServer } from 'ws';
import type { WSMessage, PixelUpdate } from './types.js';

interface ConnectedClient {
	ws: WebSocket;
	subscribedShards: Set<string>;
	playerId?: string;
}

export class GameWSServer {
	private wss: WebSocketServer | null = null;
	private clients = new Map<WebSocket, ConnectedClient>();
	private shardSubscriptions = new Map<string, Set<WebSocket>>();
	
	// Mock world state for development
	private mockTiles = new Map<string, PixelUpdate>();
	private tickInterval: NodeJS.Timeout | null = null;

	constructor(private port: number = 8080) {
		this.startServer();
		this.startGameTick();
	}

	private startServer(): void {
		this.wss = new WebSocketServer({ port: this.port });
		
		this.wss.on('connection', (ws) => {
			console.log('Client connected');
			
			const client: ConnectedClient = {
				ws,
				subscribedShards: new Set()
			};
			this.clients.set(ws, client);

			ws.on('message', (data) => {
				try {
					const message = JSON.parse(data.toString());
					this.handleMessage(ws, message);
				} catch (error) {
					console.error('Failed to parse client message:', error);
				}
			});

			ws.on('close', () => {
				console.log('Client disconnected');
				this.handleDisconnect(ws);
			});

			ws.on('error', (error) => {
				console.error('WebSocket error:', error);
				this.handleDisconnect(ws);
			});

			// Send initial connection confirmation
			this.sendToClient(ws, {
				type: 'system_message',
				data: { message: 'Connected to Pixel Dominion server' },
				timestamp: Date.now()
			});
		});

		console.log(`WebSocket server started on port ${this.port}`);
	}

	private handleMessage(ws: WebSocket, message: any): void {
		const client = this.clients.get(ws);
		if (!client) return;

		switch (message.type) {
			case 'subscribe_shard':
				this.handleShardSubscription(ws, message.shard_id, true);
				break;
				
			case 'unsubscribe_shard':
				this.handleShardSubscription(ws, message.shard_id, false);
				break;
				
			case 'pixel_update':
				this.handlePixelUpdate(ws, message);
				break;
				
			case 'place_building':
				this.handleBuildingPlacement(ws, message);
				break;
				
			case 'convert_resources':
				this.handleResourceConversion(ws, message);
				break;
				
			default:
				console.log('Unknown message type:', message.type);
		}
	}

	private handleShardSubscription(ws: WebSocket, shardId: string, subscribe: boolean): void {
		const client = this.clients.get(ws);
		if (!client) return;

		if (subscribe) {
			// Add client to shard
			client.subscribedShards.add(shardId);
			
			if (!this.shardSubscriptions.has(shardId)) {
				this.shardSubscriptions.set(shardId, new Set());
			}
			this.shardSubscriptions.get(shardId)!.add(ws);
			
			// Send existing tiles in this shard
			this.sendShardState(ws, shardId);
		} else {
			// Remove client from shard
			client.subscribedShards.delete(shardId);
			this.shardSubscriptions.get(shardId)?.delete(ws);
		}
	}

	private sendShardState(ws: WebSocket, shardId: string): void {
		const shardTiles = Array.from(this.mockTiles.entries())
			.filter(([tileId, _]) => this.getTileShardId(tileId) === shardId)
			.map(([_, update]) => update);

		if (shardTiles.length > 0) {
			this.sendToClient(ws, {
				type: 'shard_state',
				data: {
					shard_id: shardId,
					tiles: shardTiles
				},
				timestamp: Date.now()
			});
		}
	}

	private handlePixelUpdate(ws: WebSocket, message: any): void {
		// Validate pixel placement with game rules
		const update: PixelUpdate = {
			tile_id: message.tile_id,
			color: message.color,
			opacity: message.opacity,
			owner_id: message.owner_id || 'dev-player'
		};

		// In production, this would validate with actual game rules:
		/*
		import { gameRules } from '../../lib/game/rules.js';
		import { getPlayerFromDatabase } from '../../lib/game/player-db.js';
		
		const player = await getPlayerFromDatabase(update.owner_id);
		if (!player) {
			// Send error back to client
			this.sendToClient(ws, {
				type: 'error',
				data: { message: 'Invalid player' },
				timestamp: Date.now()
			});
			return;
		}
		
		// Validate placement using game rules
		const validationResult = gameRules.validateTerritoryDraw(
			[parseTileId(update.tile_id)],
			update.color,
			player,
			getOccupiedTiles()
		);
		
		if (!validationResult.valid) {
			// Send error back to client
			this.sendToClient(ws, {
				type: 'error',
				data: { message: validationResult.error || 'Invalid placement' },
				timestamp: Date.now()
			});
			return;
		}
		
		// Apply cost to player
		player.resources.px -= validationResult.cost!;
		await updatePlayerInDatabase(player);
		*/

		// Store in mock world state
		this.mockTiles.set(update.tile_id, update);

		// Broadcast to all clients subscribed to this shard
		const shardId = this.getTileShardId(update.tile_id);
		this.broadcastToShard(shardId, {
			type: 'pixel_update',
			data: update,
			timestamp: Date.now()
		});
	}

	private handleBuildingPlacement(ws: WebSocket, message: any): void {
		// Validate building placement rules
		console.log('Building placement:', message);
		
		// In production, this would validate with actual game rules:
		/*
		import { gameRules } from '../../lib/game/rules.js';
		import { getBuildingTemplate } from '../../lib/game/buildings.js';
		import { getPlayerFromDatabase } from '../../lib/game/player-db.js';
		
		const player = await getPlayerFromDatabase(message.owner_id || 'dev-player');
		if (!player) {
			// Send error back to client
			this.sendToClient(ws, {
				type: 'error',
				data: { message: 'Invalid player' },
				timestamp: Date.now()
			});
			return;
		}
		
		// Validate building placement using game rules
		const validationResult = gameRules.validateBuildingPlacement(
			message.building_type,
			message.position,
			player,
			getOccupiedTiles()
		);
		
		if (!validationResult.valid) {
			// Send error back to client
			this.sendToClient(ws, {
				type: 'error',
				data: { message: validationResult.error || 'Invalid building placement' },
				timestamp: Date.now()
			});
			return;
		}
		
		// Apply cost to player
		player.resources.px -= validationResult.cost!;
		await updatePlayerInDatabase(player);
		
		// Create building in database
		const building = await prisma.building.create({
			data: {
				type: message.building_type,
				latIdx: message.position.lat_idx,
				lonIdx: message.position.lon_idx,
				ownerId: player.id,
				placedAt: new Date()
			}
		});
		*/

		// Mock building placement - broadcast to relevant shards
		const buildingData = {
			...message,
			id: `building_${Date.now()}`,
			owner_id: 'dev-player'
		};

		// Determine affected shards based on building footprint
		// For now, just use the center tile's shard
		const shardId = this.getTileShardId(`${message.position.lat_idx}_${message.position.lon_idx}`);
		
		this.broadcastToShard(shardId, {
			type: 'building_placed',
			data: buildingData,
			timestamp: Date.now()
		});
	}

	private handleResourceConversion(ws: WebSocket, message: any): void {
		// Validate conversion with player state
		console.log('Resource conversion:', message);
		
		// In production, this would validate with actual player state:
		/*
		import { gameRules } from '../../lib/game/rules.js';
		import { getPlayerFromDatabase } from '../../lib/game/player-db.js';
		
		const player = await getPlayerFromDatabase(message.owner_id || 'dev-player');
		if (!player) {
			// Send error back to client
			this.sendToClient(ws, {
				type: 'error',
				data: { message: 'Invalid player' },
				timestamp: Date.now()
			});
			return;
		}
		
		// Validate conversion using game rules
		const validationResult = gameRules.validateResourceConversion(
			message.conversion_type,
			message.amount,
			player
		);
		
		if (!validationResult.valid) {
			// Send error back to client
			this.sendToClient(ws, {
				type: 'error',
				data: { message: validationResult.error || 'Invalid conversion' },
				timestamp: Date.now()
			});
			return;
		}
		
		// Apply conversion to player resources
		// This would depend on the specific conversion type
		switch (message.conversion_type) {
			case 'px_to_exp':
				player.resources.px -= validationResult.cost!;
				player.resources.exp += message.amount;
				break;
			case 'exp_to_px':
				player.resources.exp -= validationResult.cost!;
				player.resources.px += message.amount;
				break;
		}
		
		// Update player in database
		await updatePlayerInDatabase(player);
		*/

		// Mock conversion response
		this.sendToClient(ws, {
			type: 'conversion_result',
			data: {
				success: true,
				from: message.from,
				to: message.to,
				amount: message.amount
			},
			timestamp: Date.now()
		});
	}

	private handleDisconnect(ws: WebSocket): void {
		const client = this.clients.get(ws);
		if (client) {
			// Remove from all shard subscriptions
			for (const shardId of client.subscribedShards) {
				this.shardSubscriptions.get(shardId)?.delete(ws);
			}
		}
		this.clients.delete(ws);
	}

	private broadcastToShard(shardId: string, message: WSMessage): void {
		const subscribers = this.shardSubscriptions.get(shardId);
		if (subscribers) {
			const messageStr = JSON.stringify(message);
			for (const ws of subscribers) {
				if (ws.readyState === ws.OPEN) {
					ws.send(messageStr);
				}
			}
		}
	}

	private sendToClient(ws: WebSocket, message: WSMessage): void {
		if (ws.readyState === ws.OPEN) {
			ws.send(JSON.stringify(message));
		}
	}

	private getTileShardId(tileId: string): string {
		const [latStr, lonStr] = tileId.split('_');
		const lat = parseInt(latStr, 10);
		const lon = parseInt(lonStr, 10);
		
		const SHARD_SIZE = 64; // Match constant from grid.ts
		const shardLat = Math.floor(lat / SHARD_SIZE);
		const shardLon = Math.floor(lon / SHARD_SIZE);
		
		return `shard_${shardLat}_${shardLon}`;
	}

	private startGameTick(): void {
		// Simulate game tick every 30 seconds
		this.tickInterval = setInterval(() => {
			this.broadcastToAllClients({
				type: 'tick_update',
				data: {
					tick: Date.now(),
					message: 'Resources generated'
				},
				timestamp: Date.now()
			});
		}, 30_000);
	}

	private broadcastToAllClients(message: WSMessage): void {
		const messageStr = JSON.stringify(message);
		for (const [ws, client] of this.clients) {
			if (ws.readyState === ws.OPEN) {
				ws.send(messageStr);
			}
		}
	}

	public shutdown(): void {
		if (this.tickInterval) {
			clearInterval(this.tickInterval);
		}
		
		if (this.wss) {
			this.wss.close();
		}
	}
}
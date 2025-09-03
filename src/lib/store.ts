// Svelte stores for game state management

import { writable, derived, type Writable, type Readable } from 'svelte/store';
import type { Player, WorldState, UIState, Tile, Building, TileId, Resources, ColorHex } from './types.js';
import { GAME_CONFIG, COLORS } from './game/constants.js';

// Player state
export const player: Writable<Player | null> = writable(null);

// World state (tiles, buildings, etc.)
export const worldState: Writable<WorldState> = writable({
	players: new Map(),
	tiles: new Map(),
	alliances: new Map(),
	buildings: new Map(),
	victory_threshold: GAME_CONFIG.DOMINANCE_THRESHOLD,
	last_update: Date.now()
});

// UI state for interface controls
export const uiState: Writable<UIState> = writable({
	selected_tool: 'territory',
	selected_color: COLORS.TERRITORY_GRAY,
	zoom_level: 8,
	cooldowns: new Map(),
	show_grid: true, // Enable grid by default for pixel art editing
	show_alliances: true
});

// WebSocket connection state (imported from ws.ts)
import { getWebSocket } from './ws.js';
export const wsConnection = getWebSocket().connectionState;

// Derived stores for computed values
export const playerResources: Readable<Resources> = derived(
	player,
	($player) => $player?.resources ?? { px: 0, exp: 0, apx: 0 }
);

export const playerTerritoryCount: Readable<number> = derived(
	player,
	($player) => $player?.owned_territories.size ?? 0
);

export const playerBuildingCount: Readable<number> = derived(
	player,
	($player) => $player?.buildings.length ?? 0
);

export const availableColors: Readable<ColorHex[]> = derived(
	player,
	($player) => Array.from($player?.palette.colors ?? [])
);

export const canPlaceBuildings: Readable<boolean> = derived(
	[player, uiState],
	([$player, $ui]) => {
		if (!$player || $ui.selected_tool !== 'building') return false;
		
		// Check if player has enough resources for cheapest building (9px)
		return $player.resources.px >= 9;
	}
);

// Actions for updating game state
export const gameActions = {
	// Initialize a new player
	initializePlayer(playerId: string, factionId: string = 'default'): void {
		const newPlayer: Player = {
			id: playerId,
			faction_id: factionId,
			resources: {
				px: GAME_CONFIG.STARTING_PX,
				exp: 0,
				apx: 0
			},
			palette: {
				colors: new Set([
					COLORS.TERRITORY_GRAY,
					'#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
					'#8b5cf6', '#06b6d4', '#f97316'
				])
			},
			owned_territories: new Set(),
			buildings: [],
			tech_level: 1,
			alliances: new Set(),
			generation_rate: GAME_CONFIG.BASE_GENERATION_RATE,
			storage_capacity: 100,
			last_tick: Date.now()
		};
		
		player.set(newPlayer);
		
		// Add to world state
		worldState.update(world => ({
			...world,
			players: new Map(world.players).set(playerId, newPlayer)
		}));
	},

	// Update player resources
	updateResources(playerId: string, resources: Partial<Resources>): void {
		player.update(current => {
			if (!current || current.id !== playerId) return current;
			
			return {
				...current,
				resources: { ...current.resources, ...resources }
			};
		});
		
		worldState.update(world => {
			const players = new Map(world.players);
			const playerData = players.get(playerId);
			if (playerData) {
				players.set(playerId, { ...playerData, resources: { ...playerData.resources, ...resources }});
			}
			return { ...world, players };
		});
	},

	// Add territory to player
	addTerritory(playerId: string, tileId: TileId): void {
		player.update(current => {
			if (!current || current.id !== playerId) return current;
			
			const newTerritories = new Set(current.owned_territories);
			newTerritories.add(tileId);
			
			return { ...current, owned_territories: newTerritories };
		});
	},

	// Update tile state
	updateTile(tileId: TileId, updates: Partial<Tile>): void {
		worldState.update(world => {
			const tiles = new Map(world.tiles);
			const existingTile = tiles.get(tileId);
			
			tiles.set(tileId, { ...existingTile, ...updates } as Tile);
			
			return { ...world, tiles };
		});
	},

	// Add building to player
	addBuilding(playerId: string, building: Building): void {
		player.update(current => {
			if (!current || current.id !== playerId) return current;
			
			return {
				...current,
				buildings: [...current.buildings, building]
			};
		});
		
		worldState.update(world => ({
			...world,
			buildings: new Map(world.buildings).set(building.id, building)
		}));
	},

	// Update UI state
	setSelectedTool(tool: UIState['selected_tool']): void {
		uiState.update(ui => ({ ...ui, selected_tool: tool }));
	},

	setSelectedColor(color: ColorHex): void {
		uiState.update(ui => ({ ...ui, selected_color: color }));
	},

	setSelectedBuilding(buildingType: UIState['selected_building']): void {
		uiState.update(ui => ({
			...ui, 
			selected_building: buildingType,
			selected_tool: 'building'
		}));
	},

	setZoomLevel(zoom: number): void {
		uiState.update(ui => ({ ...ui, zoom_level: zoom }));
	},

	setCooldown(key: string, endTime: number): void {
		uiState.update(ui => ({
			...ui,
			cooldowns: new Map(ui.cooldowns).set(key, endTime)
		}));
	},

	removeCooldown(key: string): void {
		uiState.update(ui => {
			const cooldowns = new Map(ui.cooldowns);
			cooldowns.delete(key);
			return { ...ui, cooldowns };
		});
	},

	toggleGrid(): void {
		uiState.update(ui => ({ ...ui, show_grid: !ui.show_grid }));
	},

	toggleAlliances(): void {
		uiState.update(ui => ({ ...ui, show_alliances: !ui.show_alliances }));
	}
};

// Game loop management
export const gameLoop = {
	// Apply resource generation tick
	applyTick(playerId: string): void {
		player.update(current => {
			if (!current || current.id !== playerId) return current;
			
			const timeSinceLastTick = Date.now() - current.last_tick;
			const ticksElapsed = Math.floor(timeSinceLastTick / GAME_CONFIG.GENERATION_INTERVAL_MS);
			
			if (ticksElapsed === 0) return current;
			
			// Calculate resource generation
			const pxGenerated = ticksElapsed * current.generation_rate;
			const newPx = Math.min(current.resources.px + pxGenerated, current.storage_capacity);
			
			return {
				...current,
				resources: { ...current.resources, px: newPx },
				last_tick: current.last_tick + (ticksElapsed * GAME_CONFIG.GENERATION_INTERVAL_MS)
			};
		});
	},

	// Start automatic game loop  
	start(): any {
		return setInterval(() => {
			const currentPlayer = getCurrentPlayer();
			if (currentPlayer) {
				gameLoop.applyTick(currentPlayer.id);
			}
		}, 5000); // Check every 5 seconds for tick updates
	}
};

// Utility functions
export function getCurrentPlayer(): Player | null {
	let currentPlayer: Player | null = null;
	player.subscribe(p => currentPlayer = p)();
	return currentPlayer;
}

export function getCurrentWorldState(): WorldState {
	let current: WorldState;
	worldState.subscribe(w => current = w)();
	return current!;
}

export function getCurrentUIState(): UIState {
	let current: UIState;
	uiState.subscribe(ui => current = ui)();
	return current!;
}

// Initialize player on store creation (dev mode)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
	// Auto-initialize a dev player
	gameActions.initializePlayer('dev-player', 'development');
}

// Log state changes in dev mode
if (typeof window !== 'undefined' && import.meta.env.DEV) {
	player.subscribe(p => console.log('Player state updated:', p));
	worldState.subscribe(w => console.log('World state updated:', w));
	uiState.subscribe(ui => console.log('UI state updated:', ui));
}

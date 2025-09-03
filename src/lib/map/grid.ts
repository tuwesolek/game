// Grid system for tile-based coordinates and snapping logic

import type { TileCoord, TileId } from '../types.js';
import { GAME_CONFIG } from '../game/constants.js';

// Generate unique tile identifier
export function tileId(coord: TileCoord): TileId {
	return `${coord.lat_idx}_${coord.lon_idx}`;
}

// Parse tile ID back to coordinates
export function parseTileId(id: TileId): TileCoord {
	const [lat_str, lon_str] = id.split('_');
	return {
		lat_idx: parseInt(lat_str, 10),
			lon_idx: parseInt(lon_str, 10)
	};
}

// Calculate distance between two tiles in grid units
export function tileDistance(a: TileCoord, b: TileCoord): number {
	const dx = Math.abs(a.lon_idx - b.lon_idx);
	const dy = Math.abs(a.lat_idx - b.lat_idx);
	return Math.sqrt(dx * dx + dy * dy);
}

// Get adjacent tiles (8-directional)
export function getAdjacentTiles(coord: TileCoord): TileCoord[] {
	const adjacent: TileCoord[] = [];

	for (let dy = -1; dy <= 1; dy++) {
		for (let dx = -1; dx <= 1; dx++) {
			if (dx === 0 && dy === 0) continue; // Skip center tile

			adjacent.push({
				lat_idx: coord.lat_idx + dy,
				lon_idx: coord.lon_idx + dx
			});
		}
	}

	return adjacent;
}

// Get tiles in a rectangular area
export function getTileArea(center: TileCoord, width: number, height: number): TileCoord[] {
	const tiles: TileCoord[] = [];
	const halfWidth = Math.floor(width / 2);
	const halfHeight = Math.floor(height / 2);

	for (let dy = -halfHeight; dy < height - halfHeight; dy++) {
		for (let dx = -halfWidth; dx < width - halfWidth; dx++) {
			tiles.push({
				lat_idx: center.lat_idx + dy,
				lon_idx: center.lon_idx + dx
			});
		}
	}

	return tiles;
}

// Shard system for efficient tile updates
export function getShardId(coord: TileCoord): string {
	const shardLat = Math.floor(coord.lat_idx / GAME_CONFIG.SHARD_SIZE);
	const shardLon = Math.floor(coord.lon_idx / GAME_CONFIG.SHARD_SIZE);
	return `shard_${shardLat}_${shardLon}`;
}

// Utility for building placement validation - check if area is clear
export function isAreaClear(
	center: TileCoord, 
	width: number, 
	height: number, 
	occupiedTiles: Set<TileId>
): boolean {
	const tiles = getTileArea(center, width, height);

	for (const tile of tiles) {
		if (occupiedTiles.has(tileId(tile))) {
			return false;
		}
	}

	return true;
}

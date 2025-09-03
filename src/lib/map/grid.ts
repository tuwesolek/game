// Grid system for tile-based coordinates and snapping logic

import type { TileCoord, TileId, GeoCoord } from '../types.js';
import { GAME_CONFIG } from '../game/constants.js';

// Convert geographic coordinates to tile-based grid coordinates
// Uses Web Mercator projection math aligned to zoom levels
export function geoToTile(lat: number, lng: number, zoom: number): TileCoord {
	// Standard Web Mercator tile calculation
	const tileSize = Math.pow(2, zoom);
	const latRad = (lat * Math.PI) / 180;
	
	const lat_idx = Math.floor(
		((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * tileSize
	);
	const lon_idx = Math.floor(((lng + 180) / 360) * tileSize);
	
	return { lat_idx, lon_idx };
}

// Convert tile coordinates back to geographic center point
export function tileToGeo(tileCoord: TileCoord, zoom: number): GeoCoord {
	const tileSize = Math.pow(2, zoom);
	
	const lng = (tileCoord.lon_idx / tileSize) * 360 - 180;
	const n = Math.PI - (2 * Math.PI * tileCoord.lat_idx) / tileSize;
	const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
	
	return { lat, lng };
}

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

// Snap geographic point to nearest grid tile center
export function snapToGrid(lat: number, lng: number, zoom: number): GeoCoord {
	const tileCoord = geoToTile(lat, lng, zoom);
	return tileToGeo(tileCoord, zoom);
}

// Get tile bounds for rendering and collision detection
export interface TileBounds {
	north: number;
	south: number;
	east: number;
	west: number;
}

export function getTileBounds(coord: TileCoord, zoom: number): TileBounds {
	const center = tileToGeo(coord, zoom);
	const tileSize = Math.pow(2, zoom);
	
	// Calculate half-tile offset in degrees
	const latOffset = 180 / tileSize / 2;
	const lngOffset = 360 / tileSize / 2;
	
	return {
		north: center.lat + latOffset,
		south: center.lat - latOffset,
		east: center.lng + lngOffset,
		west: center.lng - lngOffset
	};
}

// Get all tiles within a geographic bounding box
export function getTilesInBounds(bounds: TileBounds, zoom: number): TileCoord[] {
	const topLeft = geoToTile(bounds.north, bounds.west, zoom);
	const bottomRight = geoToTile(bounds.south, bounds.east, zoom);
	
	const tiles: TileCoord[] = [];
	
	// Handle longitude wrap-around
	const minLon = Math.min(topLeft.lon_idx, bottomRight.lon_idx);
	const maxLon = Math.max(topLeft.lon_idx, bottomRight.lon_idx);
	const minLat = Math.min(topLeft.lat_idx, bottomRight.lat_idx);
	const maxLat = Math.max(topLeft.lat_idx, bottomRight.lat_idx);
	
	for (let lat_idx = minLat; lat_idx <= maxLat; lat_idx++) {
		for (let lon_idx = minLon; lon_idx <= maxLon; lon_idx++) {
			tiles.push({ lat_idx, lon_idx });
		}
	}
	
	return tiles;
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

// Get all shards that overlap with a bounding box
export function getShardsInBounds(bounds: TileBounds, zoom: number): Set<string> {
	const tiles = getTilesInBounds(bounds, zoom);
	const shards = new Set<string>();
	
	for (const tile of tiles) {
		shards.add(getShardId(tile));
	}
	
	return shards;
}

// Quadkey system for hierarchical tile organization (used for efficient storage)
export function tileToQuadkey(coord: TileCoord, zoom: number): string {
	let quadkey = '';
	
	for (let i = zoom; i > 0; i--) {
		let digit = 0;
		const mask = 1 << (i - 1);
		
		if ((coord.lon_idx & mask) !== 0) digit += 1;
		if ((coord.lat_idx & mask) !== 0) digit += 2;
		
		quadkey += digit.toString();
	}
	
	return quadkey;
}

// Convert quadkey back to tile coordinates
export function quadkeyToTile(quadkey: string): { coord: TileCoord; zoom: number } {
	let lat_idx = 0;
	let lon_idx = 0;
	const zoom = quadkey.length;
	
	for (let i = zoom; i > 0; i--) {
		const mask = 1 << (i - 1);
		const digit = parseInt(quadkey.charAt(zoom - i), 10);
		
		if (digit & 1) lon_idx |= mask;
		if (digit & 2) lat_idx |= mask;
	}
	
	return { coord: { lat_idx, lon_idx }, zoom };
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

// Calculate optimal zoom level for given viewport and screen size
export function calculateOptimalZoom(
	bounds: TileBounds,
	screenWidth: number,
	screenHeight: number
): number {
	const latRange = bounds.north - bounds.south;
	const lngRange = bounds.east - bounds.west;
	
	// Rough calculation - may need fine-tuning based on actual tile sizes
	const latZoom = Math.log2(180 / latRange);
	const lngZoom = Math.log2(360 / lngRange);
	
	// Use the more restrictive zoom level and add margin
	const optimalZoom = Math.min(latZoom, lngZoom) - 1;
	
	// Clamp to reasonable gameplay range
	return Math.max(8, Math.min(18, Math.round(optimalZoom)));
}
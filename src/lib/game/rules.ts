// Game rules, validation, and anti-griefing systems

import type { Player, TileCoord, TileId, BuildingType, ApxShape, ColorHex } from '../types.js';
import { GAME_CONFIG, TECH_TIER_REQUIREMENTS, APX_SHAPES } from './constants.js';
import { getBuildingTemplate, canBuildBuilding } from './buildings.js';
import { tileDistance, getTileArea, tileId } from '../map/grid.js';

// Rate limiting structures
interface RateLimit {
	count: number;
	resetTime: number;
}

class RateLimiter {
	private limits = new Map<string, RateLimit>();

	check(key: string, limit: number, windowMs: number): boolean {
		const now = Date.now();
		const existing = this.limits.get(key);

		if (!existing || now > existing.resetTime) {
			this.limits.set(key, { count: 1, resetTime: now + windowMs });
			return true;
		}

		if (existing.count >= limit) {
			return false; // Rate limit exceeded
		}

		existing.count++;
		return true;
	}

	getRemainingCount(key: string, limit: number): number {
		const existing = this.limits.get(key);
		if (!existing || Date.now() > existing.resetTime) {
			return limit;
		}
		return Math.max(0, limit - existing.count);
	}
}

// Global rate limiters
const territoryLimiter = new RateLimiter();
const buildingLimiter = new RateLimiter();
const apxLimiter = new RateLimiter();

// Validation result interface
export interface ValidationResult {
	valid: boolean;
	error?: string;
	cost?: number;
	affected_tiles?: TileId[];
}

// Drawing validation
export function validateTerritoryDraw(
	tiles: TileCoord[], 
	color: ColorHex, 
	player: Player, 
	occupiedTiles: Set<TileId>
): ValidationResult {
	// Check if color is grayscale for territory
	if (!isGrayscale(color)) {
		return { 
			valid: false, 
			error: 'Territory must be grayscale colors only' 
		};
	}

	// Check rate limiting
	const regionKey = `${player.id}_territory_${getRegionKey(tiles[0])}`;
	if (!territoryLimiter.check(regionKey, GAME_CONFIG.RATE_LIMITS.TERRITORY_PER_REGION_PER_MINUTE, 60_000)) {
		return {
			valid: false,
			error: 'Territory drawing rate limit exceeded for this region'
		};
	}

	// Validate each tile
	const tileIds = tiles.map(coord => tileId(coord));
	const cost = tiles.length;

	// Check resource cost
	if (player.resources.px < cost) {
		return {
			valid: false,
			error: `Insufficient PX: need ${cost}, have ${player.resources.px}`
		};
	}

	// Check for conflicts with occupied tiles
	for (const id of tileIds) {
		if (occupiedTiles.has(id)) {
			return {
				valid: false,
				error: 'Cannot draw on occupied tiles'
			};
		}
	}

	return {
		valid: true,
		cost,
		affected_tiles: tileIds
	};
}

export function validateBuildingPlacement(
	buildingType: BuildingType,
	position: TileCoord,
	player: Player,
	occupiedTiles: Set<TileId>
): ValidationResult {
	const template = getBuildingTemplate(buildingType);

	// Check if player can build this building
	if (!canBuildBuilding(buildingType, player)) {
		return {
			valid: false,
			error: 'Building requirements not met (resources, tech, or dependencies)'
		};
	}

	// Check rate limiting
	const regionKey = `${player.id}_building_${getRegionKey(position)}`;
	if (!buildingLimiter.check(regionKey, GAME_CONFIG.RATE_LIMITS.BUILDING_PER_REGION_PER_MINUTE, 60_000)) {
		return {
			valid: false,
			error: 'Building placement rate limit exceeded for this region'
		};
	}

	// Check building footprint for conflicts
	const buildingTiles = getTileArea(position, template.size.width, template.size.height);
	const buildingTileIds = buildingTiles.map(coord => tileId(coord));

	for (const id of buildingTileIds) {
		if (occupiedTiles.has(id)) {
			return {
				valid: false,
				error: 'Building footprint conflicts with existing structures'
			};
		}
	}

	// Special validation for Base buildings - minimum distance requirement
	if (buildingType === 'Base') {
		const nearestBase = findNearestBase(position, player);
		if (nearestBase && tileDistance(position, nearestBase) < GAME_CONFIG.BASE_MIN_DISTANCE) {
			return {
				valid: false,
				error: `Bases must be at least ${GAME_CONFIG.BASE_MIN_DISTANCE} tiles apart`
			};
		}
	}

	return {
		valid: true,
		cost: template.cost_px,
		affected_tiles: buildingTileIds
	};
}

// APX attack validation
export function validateApxAttack(
	shape: ApxShape,
	position: TileCoord,
	targetRegion: string,
	player: Player
): ValidationResult {
	const apxConfig = APX_SHAPES[shape.toUpperCase() as keyof typeof APX_SHAPES];
	if (!apxConfig) {
		return {
			valid: false,
			error: 'Invalid APX attack shape'
		};
	}

	// Check APX resources
	if (player.resources.apx < apxConfig.cost) {
		return {
			valid: false,
			error: `Insufficient APX: need ${apxConfig.cost}, have ${player.resources.apx}`
		};
	}

	// Check cooldown
	const cooldownKey = `${player.id}_apx_${shape}_${targetRegion}`;
	if (isOnCooldown(cooldownKey, apxConfig.cooldown * 1000)) {
		return {
			valid: false,
			error: `APX attack on cooldown for ${shape} in ${targetRegion}`
		};
	}

	// Check rate limiting
	const rateLimitKey = `${player.id}_apx_${targetRegion}`;
	if (!apxLimiter.check(rateLimitKey, GAME_CONFIG.RATE_LIMITS.APX_PER_REGION_PER_HOUR, 3600_000)) {
		return {
			valid: false,
			error: 'APX attack rate limit exceeded for this region'
		};
	}

	// Calculate affected tiles based on shape and position
	const affectedTiles = calculateApxAffectedTiles(shape, position);
	
	return {
		valid: true,
		cost: apxConfig.cost,
		affected_tiles: affectedTiles
	};
}

// Resource conversion validation
export function validateResourceConversion(
	from: keyof typeof GAME_CONFIG.CONVERSIONS | 'exp_to_px',
	amount: number,
	player: Player
): ValidationResult {
	if (amount <= 0) {
		return {
			valid: false,
			error: 'Conversion amount must be positive'
		};
	}

	if (from === 'PX_TO_EXP') {
		const conversion = GAME_CONFIG.CONVERSIONS.PX_TO_EXP;
		const cost = Math.floor(amount / conversion.yield) * conversion.cost;
		
		if (player.resources.px < cost) {
			return {
				valid: false,
				error: `Insufficient PX for conversion: need ${cost}, have ${player.resources.px}`
			};
		}

		return { valid: true, cost };
	}

	if (from === 'exp_to_px') {
		const conversion = GAME_CONFIG.CONVERSIONS.EXP_TO_PX;
		const cost = Math.floor(amount / conversion.yield) * conversion.cost;
		
		if (player.resources.exp < cost) {
			return {
				valid: false,
				error: `Insufficient EXP for conversion: need ${cost}, have ${player.resources.exp}`
			};
		}

		const resultingPx = player.resources.px + amount;
		if (resultingPx > player.storage_capacity) {
			return {
				valid: false,
				error: 'Conversion would exceed PX storage capacity'
			};
		}

		return { valid: true, cost };
	}

	return {
		valid: false,
		error: 'Invalid conversion type'
	};
}

// Alliance validation
export function validateAllianceAction(
	action: 'create' | 'join' | 'leave' | 'invite',
	player: Player,
	targetId?: string
): ValidationResult {
	switch (action) {
		case 'create':
			if (player.alliances.size > 0) {
				return {
					valid: false,
					error: 'Player is already in an alliance'
				};
			}
			break;

		case 'join':
		case 'leave':
			if (!targetId) {
				return {
					valid: false,
					error: 'Alliance ID required'
				};
			}
			break;

		case 'invite':
			if (player.alliances.size === 0) {
				return {
					valid: false,
					error: 'Player must be in an alliance to invite others'
				};
			}
			break;
	}

	return { valid: true };
}

// Utility functions
function isGrayscale(color: ColorHex): boolean {
	const hex = color.slice(1); // Remove #
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	
	// Grayscale means R = G = B
	return r === g && g === b;
}

function getRegionKey(coord: TileCoord): string {
	// Group tiles into regions for rate limiting
	const regionSize = 100; // tiles per region
	const regionLat = Math.floor(coord.lat_idx / regionSize);
	const regionLon = Math.floor(coord.lon_idx / regionSize);
	return `${regionLat}_${regionLon}`;
}

function findNearestBase(position: TileCoord, player: Player): TileCoord | null {
	let nearest: TileCoord | null = null;
	let minDistance = Infinity;

	for (const building of player.buildings) {
		if (building.template.kind === 'Base') {
			const distance = tileDistance(position, building.position);
			if (distance < minDistance) {
				minDistance = distance;
				nearest = building.position;
			}
		}
	}

	return nearest;
}

// Cooldown management
const cooldowns = new Map<string, number>();

function isOnCooldown(key: string, durationMs: number): boolean {
	const endTime = cooldowns.get(key);
	if (!endTime) return false;
	
	if (Date.now() > endTime) {
		cooldowns.delete(key);
		return false;
	}
	
	return true;
}

export function setCooldown(key: string, durationMs: number): void {
	cooldowns.set(key, Date.now() + durationMs);
}

export function getCooldownRemaining(key: string): number {
	const endTime = cooldowns.get(key);
	if (!endTime) return 0;
	
	const remaining = endTime - Date.now();
	return Math.max(0, remaining);
}

// Calculate affected tiles for APX attacks based on shape and position
function calculateApxAffectedTiles(shape: ApxShape, position: TileCoord): TileId[] {
	const affectedTiles: TileId[] = [];
	const { lat_idx, lon_idx } = position;
	
	switch (shape.toLowerCase()) {
		case 'point':
			// Single tile attack
			affectedTiles.push(`${lat_idx}_${lon_idx}`);
			break;
			
		case 'line':
			// 5-tile line extending horizontally
			for (let i = 0; i < 5; i++) {
				affectedTiles.push(`${lat_idx}_${lon_idx + i - 2}`);
			}
			break;
			
		case 'area':
			// 3x3 square area
			for (let latOffset = -1; latOffset <= 1; latOffset++) {
				for (let lonOffset = -1; lonOffset <= 1; lonOffset++) {
					affectedTiles.push(`${lat_idx + latOffset}_${lon_idx + lonOffset}`);
				}
			}
			break;
			
		case 'building':
			// 5x5 square area for building attacks
			for (let latOffset = -2; latOffset <= 2; latOffset++) {
				for (let lonOffset = -2; lonOffset <= 2; lonOffset++) {
					affectedTiles.push(`${lat_idx + latOffset}_${lon_idx + lonOffset}`);
				}
			}
			break;
			
		default:
			// Default to single tile if shape is unknown
			affectedTiles.push(`${lat_idx}_${lon_idx}`);
	}
	
	return affectedTiles;
}

// Anti-griefing measures
export function detectGriefingBehavior(player: Player, recentActions: any[]): {
	isGriefing: boolean;
	reason?: string;
	severity: 'low' | 'medium' | 'high';
} {
	const now = Date.now();
	const oneHourAgo = now - 3600_000;
	
	const recentTerritoryActions = recentActions.filter(a => 
		a.type === 'draw_territory' && a.timestamp > oneHourAgo
	);
	
	const recentApxActions = recentActions.filter(a => 
		a.type === 'apx_attack' && a.timestamp > oneHourAgo
	);

	// Excessive territory spam
	if (recentTerritoryActions.length > 500) {
		return {
			isGriefing: true,
			reason: 'Excessive territory drawing activity',
			severity: 'high'
		};
	}

	// APX spam against single target
	const apxTargets = new Set(recentApxActions.map(a => a.target));
	if (apxTargets.size === 1 && recentApxActions.length > 10) {
		return {
			isGriefing: true,
			reason: 'Targeted harassment with APX attacks',
			severity: 'high'
		};
	}

	// Rapid-fire small drawings (pixel spam)
	const smallDrawings = recentTerritoryActions.filter(a => a.tiles.length === 1);
	if (smallDrawings.length > 100) {
		return {
			isGriefing: true,
			reason: 'Pixel spam detected',
			severity: 'medium'
		};
	}

	return {
		isGriefing: false,
		severity: 'low'
	};
}

// Export validation interface
export const gameRules = {
	validateTerritoryDraw,
	validateBuildingPlacement,
	validateApxAttack,
	validateResourceConversion,
	validateAllianceAction,
	setCooldown,
	getCooldownRemaining,
	detectGriefingBehavior
};
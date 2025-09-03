// Economy system - resource generation, conversions, and game balance

import type { Player, Resources, Building } from '../types.js';
import { GAME_CONFIG } from './constants.js';
import { applyBuildingTick } from './buildings.js';

// Core resource generation logic
export function calculateResourceGeneration(player: Player, deltaTimeMs: number): Resources {
	const ticksElapsed = Math.floor(deltaTimeMs / GAME_CONFIG.GENERATION_INTERVAL_MS);
	
	if (ticksElapsed === 0) {
		return { px: 0, exp: 0, apx: 0 };
	}

	// Base generation from game config
	let pxRate = GAME_CONFIG.BASE_GENERATION_RATE;
	let expRate = 0;
	let apxRate = 0;

	// Add building contributions
	for (const building of player.buildings) {
		if (building.template.effects.on_tick) {
			const effects = building.template.effects.on_tick;
			if (effects.px_rate) pxRate += effects.px_rate;
			if (effects.exp_rate) expRate += effects.exp_rate;
			if (effects.apx_rate) apxRate += effects.apx_rate;
		}
	}

	return {
		px: ticksElapsed * pxRate,
		exp: ticksElapsed * expRate,
		apx: ticksElapsed * apxRate
	};
}

// Apply resource generation to player, respecting storage caps
export function applyResourceGeneration(player: Player): Player {
	const currentTime = Date.now();
	const deltaTime = currentTime - player.last_tick;
	
	if (deltaTime < GAME_CONFIG.GENERATION_INTERVAL_MS) {
		return player; // Not enough time passed for a tick
	}

	const generated = calculateResourceGeneration(player, deltaTime);
	
	// Apply storage capacity limits
	const newPx = Math.min(player.resources.px + generated.px, player.storage_capacity);
	const newExp = player.resources.exp + generated.exp; // EXP has no storage limit
	const newApx = player.resources.apx + generated.apx; // APX has no storage limit

	return {
		...player,
		resources: {
			px: newPx,
			exp: newExp,
			apx: newApx
		},
		generation_rate: calculatePixelGenerationRate(player),
		last_tick: currentTime
	};
}

// Calculate current pixel generation rate per tick
export function calculatePixelGenerationRate(player: Player): number {
	let rate = GAME_CONFIG.BASE_GENERATION_RATE;
	
	for (const building of player.buildings) {
		if (building.template.effects.on_tick?.px_rate) {
			rate += building.template.effects.on_tick.px_rate;
		}
	}
	
	return rate;
}

// Resource conversion functions
export interface ConversionResult {
	success: boolean;
	cost: number;
	yield: number;
	error?: string;
}

export function convertPxToExp(player: Player, pxAmount: number): ConversionResult {
	const conversion = GAME_CONFIG.CONVERSIONS.PX_TO_EXP;
	const maxConversions = Math.floor(pxAmount / conversion.cost);
	
	if (maxConversions === 0) {
		return {
			success: false,
			cost: 0,
			yield: 0,
			error: `Need at least ${conversion.cost} PX to convert`
		};
	}
	
	if (player.resources.px < pxAmount) {
		return {
			success: false,
			cost: 0,
			yield: 0,
			error: 'Insufficient PX resources'
		};
	}
	
	const actualConversions = Math.floor(pxAmount / conversion.cost);
	const totalCost = actualConversions * conversion.cost;
	const totalYield = actualConversions * conversion.yield;
	
	return {
		success: true,
		cost: totalCost,
		yield: totalYield
	};
}

export function convertExpToPx(player: Player, expAmount: number): ConversionResult {
	const conversion = GAME_CONFIG.CONVERSIONS.EXP_TO_PX;
	const maxConversions = Math.floor(expAmount / conversion.cost);
	
	if (maxConversions === 0) {
		return {
			success: false,
			cost: 0,
			yield: 0,
			error: `Need at least ${conversion.cost} EXP to convert`
		};
	}
	
	if (player.resources.exp < expAmount) {
		return {
			success: false,
			cost: 0,
			yield: 0,
			error: 'Insufficient EXP resources'
		};
	}
	
	const actualConversions = Math.floor(expAmount / conversion.cost);
	const totalCost = actualConversions * conversion.cost;
	const totalYield = actualConversions * conversion.yield;
	
	// Check if yield would exceed storage capacity
	const finalPx = Math.min(player.resources.px + totalYield, player.storage_capacity);
	const actualYield = finalPx - player.resources.px;
	
	if (actualYield < totalYield) {
		return {
			success: false,
			cost: 0,
			yield: 0,
			error: 'Not enough storage capacity for conversion result'
		};
	}
	
	return {
		success: true,
		cost: totalCost,
		yield: totalYield
	};
}

// Economic balance calculations
export function calculateDominanceScore(player: Player, totalWorldTiles: number): number {
	if (totalWorldTiles === 0) return 0;
	return player.owned_territories.size / totalWorldTiles;
}

export function calculateTechAdvancement(player: Player): number {
	// Tech advancement based on building diversity and tier
	const buildingTypes = new Set(player.buildings.map(b => b.template.kind));
	const avgTier = player.buildings.reduce((sum, b) => sum + b.template.prerequisites.tech_tier, 0) / player.buildings.length || 1;
	
	return buildingTypes.size * avgTier * 0.1; // Normalize to 0-1 range
}

export function calculateMilitaryStrength(player: Player): number {
	// Military strength based on APX generation and defensive buildings
	let strength = player.resources.apx * 0.1;
	
	const militaryBuildings = player.buildings.filter(b => 
		['AntiPxGen', 'AntiPxLab', 'ChaosTower', 'TotalAntiPxGen', 'AntimatterGen'].includes(b.template.kind)
	);
	
	strength += militaryBuildings.length * 5;
	return Math.min(strength, 100); // Cap at 100
}

// Economic pressure and balance systems
export interface EconomicPressure {
	territory_expansion: number; // Cost multiplier for new territory
	building_demand: number;     // Cost multiplier for buildings
	resource_scarcity: number;   // Generation rate multiplier
}

export function calculateEconomicPressure(player: Player, worldPlayers: Player[]): EconomicPressure {
	// Territory expansion pressure - increases with owned territory
	const territoryRatio = player.owned_territories.size / 1000; // Normalize to reasonable range
	const expansionPressure = Math.min(1 + territoryRatio * 0.5, 2.0);
	
	// Building demand - increases with building count
	const buildingRatio = player.buildings.length / 50; // Normalize
	const buildingPressure = Math.min(1 + buildingRatio * 0.3, 1.8);
	
	// Resource scarcity based on total world production
	const totalWorldProduction = worldPlayers.reduce((sum, p) => sum + calculatePixelGenerationRate(p), 0);
	const playerProductionRatio = calculatePixelGenerationRate(player) / Math.max(totalWorldProduction, 1);
	const scarcityPressure = Math.max(0.5, 1 - playerProductionRatio * 0.5);
	
	return {
		territory_expansion: expansionPressure,
		building_demand: buildingPressure,
		resource_scarcity: scarcityPressure
	};
}

// Victory condition checks
export function checkVictoryConditions(player: Player, worldState: { totalTiles: number, activePlayers: number }): {
	hasWon: boolean;
	reason?: string;
} {
	// Dominance victory
	const dominanceScore = calculateDominanceScore(player, worldState.totalTiles);
	if (dominanceScore >= GAME_CONFIG.DOMINANCE_THRESHOLD) {
		return {
			hasWon: true,
			reason: `Territorial dominance: ${(dominanceScore * 100).toFixed(1)}% of world controlled`
		};
	}
	
	// Elimination victory
	if (worldState.activePlayers <= 1) {
		return {
			hasWon: true,
			reason: 'All opponents eliminated'
		};
	}
	
	return { hasWon: false };
}

export function checkDefeatConditions(player: Player): {
	isDefeated: boolean;
	reason?: string;
} {
	// No bases left
	const bases = player.buildings.filter(b => b.template.kind === 'Base');
	if (bases.length === 0) {
		return {
			isDefeated: true,
			reason: 'All bases destroyed'
		};
	}
	
	// No resource generation for extended period
	const generationRate = calculatePixelGenerationRate(player);
	const timeSinceLastGeneration = Date.now() - player.last_tick;
	
	if (generationRate === 0 && timeSinceLastGeneration > GAME_CONFIG.GRACE_PERIOD_MS) {
		return {
			isDefeated: true,
			reason: 'No resource generation for extended period'
		};
	}
	
	return { isDefeated: false };
}

// Advanced economic features for late-game balance
export function calculateInflation(worldEconomySize: number): number {
	// Inflation increases as world economy grows to maintain balance
	const baseInflation = Math.log(worldEconomySize / 1000) * 0.1;
	return Math.max(1.0, Math.min(baseInflation, 2.0));
}

export function calculateTaxRate(player: Player, totalWorldWealth: number): number {
	// Progressive taxation based on player's share of world wealth
	const playerWealth = player.resources.px + player.resources.exp * 8;
	const wealthRatio = playerWealth / Math.max(totalWorldWealth, 1);
	
	if (wealthRatio < 0.05) return 0.0;      // No tax for small players
	if (wealthRatio < 0.15) return 0.05;     // 5% tax for medium players
	if (wealthRatio < 0.30) return 0.10;     // 10% tax for large players
	return 0.15;                             // 15% tax for dominant players
}

// Export main economy interface
export const economySystem = {
	applyResourceGeneration,
	calculateResourceGeneration,
	calculatePixelGenerationRate,
	convertPxToExp,
	convertExpToPx,
	calculateDominanceScore,
	calculateTechAdvancement,
	calculateMilitaryStrength,
	calculateEconomicPressure,
	checkVictoryConditions,
	checkDefeatConditions,
	calculateInflation,
	calculateTaxRate
};
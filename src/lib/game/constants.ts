// Core game constants - single source of truth for all game parameters

export const GAME_CONFIG = {
	// Starting resources and limits
	STARTING_PX: 30,
	STARTING_PALETTE_COLORS: 8,
	MAX_PALETTE_COLORS: 512,
	BASE_GENERATION_RATE: 1, // px per 30 seconds
	GENERATION_INTERVAL_MS: 30_000,

	// Grid and map settings
	TILE_SIZE_METERS: 100, // Each tile represents 100m x 100m
	SHARD_SIZE: 64, // tiles per shard for efficient updates
	BASE_MIN_DISTANCE: 50, // minimum tiles between bases

	// Rate limiting (anti-grief)
	RATE_LIMITS: {
		TERRITORY_PER_REGION_PER_MINUTE: 100,
		BUILDING_PER_REGION_PER_MINUTE: 25,
		APX_PER_REGION_PER_HOUR: 10
	},

	// Resource conversion rates
	CONVERSIONS: {
		PX_TO_EXP: { cost: 10, yield: 1 }, // 10px -> 1exp
		EXP_TO_PX: { cost: 1, yield: 8 }   // 1exp -> 8px
	},

	// Victory conditions
	DOMINANCE_THRESHOLD: 0.25, // 25% of map control for victory
	GRACE_PERIOD_MS: 300_000, // 5 minutes before defeat from no generation

	// UI and UX
	COOLDOWN_SECONDS: 30,
	TOUCH_TARGET_SIZE: 44, // minimum touch target size in pixels
	CANVAS_FPS_TARGET: 60,
	BATCH_UPDATE_INTERVAL_MS: 16, // ~60 FPS for batched updates

	// WebSocket settings
	WS_RECONNECT_DELAY_MS: 1000,
	WS_MAX_RECONNECT_ATTEMPTS: 5,
	WS_BACKOFF_MULTIPLIER: 1.5
} as const;

// Color constants for game elements
export const COLORS = {
	NEUTRAL_TILE: '#374151',
	TERRITORY_GRAY: '#6b7280',
	SELECTION_HIGHLIGHT: '#3b82f6',
	
	// Resource colors
	PX_COLOR: '#fbbf24',
	EXP_COLOR: '#10b981', 
	APX_COLOR: '#ef4444',
	
	// Building type colors (for previews)
	BASE_COLOR: '#8b5cf6',
	GENERATOR_COLOR: '#f59e0b',
	STORAGE_COLOR: '#06b6d4',
	FACTORY_COLOR: '#10b981'
} as const;

// Tech tier color requirements
export const TECH_TIER_REQUIREMENTS = {
	1: 8,   // Tier 1: 8 colors minimum
	2: 16,  // Tier 2: 16 colors minimum  
	3: 32,  // Tier 3: 32 colors minimum
	4: 64,  // Tier 4: 64 colors minimum
	5: 128  // Tier 5: 128 colors minimum
} as const;

// APX attack shapes and costs
export const APX_SHAPES = {
	POINT: { size: 1, cost: 1, cooldown: 10 },
	LINE: { size: 5, cost: 3, cooldown: 20 },
	AREA: { size: 9, cost: 8, cooldown: 45 },
	BUILDING: { size: 25, cost: 15, cooldown: 90 }
} as const;
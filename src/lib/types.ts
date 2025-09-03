// Core domain types for Pixel Dominion game

export type TileId = string; // Format: "lat_idx_lon_idx"
export type PlayerId = string;
export type AllianceId = string;
export type ColorHex = string; // Format: "#RRGGBB"

export interface TileCoord {
	lat_idx: number;
	lon_idx: number;
}

export interface GeoCoord {
	lat: number;
	lng: number;
}

export type TileType = 'neutral' | 'territory_gray' | 'building_color';

export interface Tile {
	lat_idx: number;
	lon_idx: number;
	type: TileType;
	owner_id?: PlayerId;
	color: ColorHex;
	opacity: number; // [0..1]
}

export interface Resources {
	px: number;  // Primary currency/material
	exp: number; // Experience points for tech
	apx: number; // Anti-pixel (eraser) resource
}

export interface PlayerPalette {
	colors: Set<ColorHex>;
}

export interface Player {
	id: PlayerId;
	faction_id: string;
	resources: Resources;
	palette: PlayerPalette;
	owned_territories: Set<TileId>;
	buildings: Building[];
	tech_level: number; // [1..5]
	alliances: Set<AllianceId>;
	generation_rate: number; // px per tick
	storage_capacity: number;
	last_tick: number;
}

export type BuildingType = 
	// Tier 1
	| 'Base' | 'GenPx' | 'Storage' | 'ColorFactory' | 'Science' 
	| 'EXP_Mine' | 'PX2EXP' | 'EXP2PX' | 'AntiPxGen' | 'Board'
	// Tier 2+
	| 'AdvGenPx' | 'MegaStorage' | 'PigmentFactory' | 'Academy'
	| 'CentralDepot' | 'AlchemyLab' | 'GlobalInstitute'
	| 'CrystalExpMine' | 'AntiPxLab' | 'QuantumPxFactory'
	| 'ColossalColorLab' | 'AbsoluteArchive' | 'ChaosTower'
	| 'WorldFortress' | 'CentralAI' | 'TotalAntiPxGen'
	| 'AntimatterGen';

export interface BuildingSize {
	width: number;
	height: number;
}

export interface TickEffect {
	px_rate?: number;
	exp_rate?: number;
	apx_rate?: number;
}

export interface PlaceEffect {
	palette_colors?: number;
}

export interface PassiveEffect {
	px_cap?: number;
	enables_research?: boolean;
	research_speed?: number;
}

export interface ActiveEffect {
	convert?: string; // "10px->1exp" format
	post_message?: boolean;
}

export interface BuildingEffects {
	on_tick?: TickEffect;
	on_place?: PlaceEffect;
	passive?: PassiveEffect;
	active?: ActiveEffect;
}

export interface BuildingPrerequisites {
	tech_tier: number;
	deps: BuildingType[];
}

export interface BuildingTemplate {
	kind: BuildingType;
	size: BuildingSize;
	cost_px: number;
	min_colors_required: number;
	effects: BuildingEffects;
	prerequisites: BuildingPrerequisites;
}

export interface Building {
	id: string;
	template: BuildingTemplate;
	position: TileCoord;
	owner_id: PlayerId;
	placed_at: number;
}

export interface AlliancePolicies {
	share_px: boolean;
	defend: boolean;
	trade_rates: Map<keyof Resources, number>;
}

export interface Alliance {
	id: AllianceId;
	members: Set<PlayerId>;
	policies: AlliancePolicies;
	created_at: number;
}

export type ApxShape = 'point' | 'line' | 'area' | 'building';

export interface ApxAttack {
	shape: ApxShape;
	position: TileCoord;
	size: number;
	cost: number;
	attacker_id: PlayerId;
	timestamp: number;
}

export interface GameAction {
	type: 'draw_territory' | 'place_building' | 'convert_resources' 
		| 'apx_attack' | 'alliance_action' | 'research' | 'trade' | 'post_message';
	player_id: PlayerId;
	data: any;
	timestamp: number;
}

export interface WorldState {
	players: Map<PlayerId, Player>;
	tiles: Map<TileId, Tile>;
	alliances: Map<AllianceId, Alliance>;
	buildings: Map<string, Building>;
	victory_threshold: number;
	last_update: number;
}

// WebSocket message types
export interface WSMessage {
	type: 'pixel_update' | 'player_update' | 'building_placed' 
		| 'alliance_update' | 'tick_update' | 'system_message';
	data: any;
	timestamp: number;
}

export interface PixelUpdate {
	tile_id: TileId;
	color: ColorHex;
	opacity: number;
	owner_id?: PlayerId;
}

// UI State types
export interface UIState {
	selected_tool: 'territory' | 'building' | 'apx' | 'inspect';
	selected_building?: BuildingType;
	selected_color: ColorHex;
	zoom_level: number;
	viewport_bounds: {
		north: number;
		south: number;
		east: number;
		west: number;
	};
	cooldowns: Map<string, number>;
	show_grid: boolean;
	show_alliances: boolean;
}

export interface LeaderboardEntry {
	player_id: PlayerId;
	faction_name: string;
	dominance_score: number;
	territories_count: number;
	buildings_count: number;
	tech_level: number;
}

// API Response types
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	timestamp: number;
}

export interface PlaceActionRequest {
	action: 'draw_territory' | 'place_building';
	tiles: TileCoord[];
	color?: ColorHex;
	building_type?: BuildingType;
}

export interface ConvertResourcesRequest {
	from: keyof Resources;
	to: keyof Resources;
	amount: number;
}

// Validation schemas (to be used with zod)
export interface ValidationError {
	field: string;
	message: string;
}

export interface RateLimitStatus {
	remaining: number;
	reset_at: number;
	limit: number;
}

// Performance tracking
export interface PerformanceMetrics {
	fps: number;
	render_time_ms: number;
	update_count: number;
	ws_latency_ms: number;
	tiles_rendered: number;
}
// Type definitions for the game

export type PlayerId = string;
export type FactionId = string;
export type TileId = string; // Format: "lat_idx_lon_idx"
export type BuildingId = string;
export type ColorHex = string; // e.g., "#RRGGBB"

export interface Player {
  id: PlayerId;
  faction_id: FactionId;
  resources: Resources;
  palette: {
    colors: Set<ColorHex>;
  };
  owned_territories: Set<TileId>;
  buildings: Building[];
  tech_level: number;
  alliances: Set<FactionId>;
  generation_rate: number;
  storage_capacity: number;
  last_tick: number;
}

export interface Resources {
  px: number; // Pixels
  exp: number; // Experience
  apx: number; // Attack Pixels
}

export interface WorldState {
  players: Map<PlayerId, Player>;
  tiles: Map<TileId, Tile>;
  alliances: Map<FactionId, Alliance>;
  buildings: Map<BuildingId, Building>;
  victory_threshold: number;
  last_update: number;
}

export interface Tile {
  lat_idx: number;
  lon_idx: number;
  type: 'empty' | 'territory' | 'building';
  owner_id?: PlayerId;
  color?: ColorHex;
  opacity: number;
  building_id?: BuildingId;
}

export interface TileCoord {
  lat_idx: number;
  lon_idx: number;
}

export interface GeoCoord {
  lat: number;
  lng: number;
}

export interface Alliance {
  id: FactionId;
  name: string;
  members: PlayerId[];
  territory_count: number;
}

export interface Building {
  id: BuildingId;
  type: 'factory' | 'turret' | 'wall' | 'mine' | 'color_factory';
  owner_id: PlayerId;
  tile_id: TileId;
  health: number;
  max_health: number;
  level: number;
  production_rate?: number; // For factories/mines
  attack_power?: number; // For turrets
  defense?: number; // For walls
}

export interface UIState {
  selected_tool: 'territory' | 'building' | 'apx' | 'inspect';
  selected_color: ColorHex;
  selected_building?: Building['type'];
  zoom_level: number;
  cooldowns: Map<string, number>; // Key: action type, Value: timestamp when cooldown ends
  show_grid: boolean;
  show_alliances: boolean;
}

export interface GameConfig {
  SHARD_SIZE: number;
  STARTING_PX: number;
  BASE_GENERATION_RATE: number;
  GENERATION_INTERVAL_MS: number;
  DOMINANCE_THRESHOLD: number;
}

export interface Colors {
  TERRITORY_GRAY: ColorHex;
  [key: string]: ColorHex; // Allow dynamic access to other colors
}

export interface WebSocketMessage {
  type: string;
  payload: any;
}

export interface PixelUpdateMessage {
  tile_id: TileId;
  color: ColorHex;
  opacity: number;
}

export interface BuildingPlacementMessage {
  building_type: Building['type'];
  position: TileCoord;
}

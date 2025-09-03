# Pixel Dominion — High-Reasoning Context (Pseudocode Only)

This document contains the core game logic and mechanics for Pixel Dominion, a pixel-based real-time strategy game inspired by r/place mechanics.

## Core Domain Models

### Player State
```
Player {
  id: string
  faction_id: string
  resources: {
    px: number     // Primary currency/material
    exp: number    // Experience points for tech
    apx: number    // Anti-pixel (eraser) resource
  }
  palette: {
    colors: Set<ColorHex>  // Available colors [8..512]
  }
  owned_territories: Set<TileId>
  buildings: Building[]
  tech_level: number [1..5]
  alliances: Set<AllianceId>
  generation_rate: number  // px per tick
  storage_capacity: number
}
```

### Tile System
```
Tile {
  lat_idx: number
  lon_idx: number
  type: 'neutral' | 'territory_gray' | 'building_color'
  owner_id?: string
  color: ColorHex
  opacity: number [0..1]
}

TileId = `${lat_idx}_${lon_idx}`
```

### Building Templates
```
Building {
  kind: BuildingType
  size: { width: number, height: number }
  cost_px: number
  min_colors_required: number
  effects: {
    on_tick?: TickEffect
    on_place?: PlaceEffect
    passive?: PassiveEffect
  }
  prerequisites: {
    tech_tier: number
    deps: BuildingType[]
  }
}
```

### Alliance System
```
Alliance {
  id: string
  members: Set<PlayerId>
  policies: {
    share_px: boolean
    defend: boolean
    trade_rates: Map<Resource, number>
  }
}
```

## Game Economy & Tick System

### Resource Generation
```
function gameTickUpdate(player: Player): void {
  base_generation = floor(tick_time / 30_seconds)
  multiplier = sum(building.effects.on_tick.px_rate for building in player.buildings)
  
  px_generated = base_generation * max(1, multiplier)
  player.px = min(player.px + px_generated, player.storage_capacity)
  
  // Apply other building effects
  for building in player.buildings:
    if building.effects.on_tick:
      apply_building_effect(player, building.effects.on_tick)
}
```

### Resource Conversions
```
PX2EXP: 10px -> 1exp
EXP2PX: 1exp -> 8px
```

## Building Catalog

### Tier 1 Buildings (Fully Implemented)
```
Base(6x6): {
  cost: 36,
  min_colors: 2,
  unlocks: [GenPx, Storage, ColorFactory, Science, Board, EXP_Mine, PX2EXP, EXP2PX, AntiPxGen]
}

GenPx(3x3): {
  cost: 9,
  effects: { on_tick: { px_rate: +1 } }
}

Storage(3x3): {
  cost: 9,
  effects: { passive: { px_cap: +100 } }
}

ColorFactory(3x3): {
  cost: 9,
  effects: { on_build: { palette_colors: +1 } }
}

Science(5x5): {
  cost: 25,
  effects: { passive: { enables_research: true } }
}

EXP_Mine(4x4): {
  cost: 16,
  effects: { on_tick: { exp_rate: +1 } }
}

PX2EXP(3x3): {
  cost: 9,
  effects: { active: { convert: "10px->1exp" } }
}

EXP2PX(3x3): {
  cost: 9,
  effects: { active: { convert: "1exp->8px" } }
}

AntiPxGen(4x4): {
  cost: 16,
  effects: { on_tick: { apx_rate: +1 } }
}

Board(3x3): {
  cost: 9,
  effects: { active: { post_message: true } }
}
```

### Tier 2-5 Buildings (Data Stubs)
```
// T2: min_colors_required = 16
AdvGenPx(4x4): { cost: 25, px_rate: +3 }
MegaStorage(5x5): { cost: 36, px_cap: +500 }
PigmentFactory(4x4): { cost: 20, palette_colors: +3 }
Academy(6x6): { cost: 49, research_speed: 2x }

// T3: min_colors_required = 32
...
```

## Tech Tree Prerequisites
```
Base -> {
  GenPx -> Storage -> MegaStorage -> CentralDepot -> QuantumPxFactory -> WorldFortress,
  ColorFactory -> PigmentFactory -> AlchemyLab -> ColossalColorLab,
  Science -> Academy -> GlobalInstitute -> AbsoluteArchive -> CentralAI,
  EXP_Mine <-> PX2EXP <-> EXP2PX -> CrystalExpMine,
  AntiPxGen -> AntiPxLab -> ChaosTower -> TotalAntiPxGen -> AntimatterGen,
  Board (independent)
}
```

## Game Actions

### Drawing Rules
```
function validateDraw(pixels: Pixel[], player: Player): boolean {
  for pixel in pixels:
    if pixel.type == 'territory':
      assert(pixel.color.isGrayscale())
    else if pixel.type == 'building':
      assert(pixel.color in player.palette.colors)
      assert(!pixel.color.isGrayscale())
    
    if tile.owner != null && tile.owner != player.id:
      return false  // Cannot draw on enemy territory
  
  cost = pixels.length
  return player.px >= cost
}

function executeDraw(pixels: Pixel[], player: Player): void {
  player.px -= pixels.length
  for pixel in pixels:
    set_tile_owner(pixel.tile_id, player.id)
    update_tile_visual(pixel.tile_id, pixel.color, pixel.opacity)
}
```

### APX (Anti-Pixel) Attacks
```
function executeApxAttack(mask: PixelMask, region: Region, player: Player): void {
  apx_cost = calculate_apx_cost(mask, region)
  if player.apx < apx_cost:
    return false
  
  resistance = calculate_enemy_defenses(region)
  success_rate = apx_cost / (apx_cost + resistance)
  
  if random() < success_rate:
    erase_pixels(mask, region)
    player.apx -= apx_cost
    apply_cooldown(player, mask.type, region)
}
```

## Anti-Grief Systems

### Rate Limiting
```
rate_limits = {
  territory_per_region_per_minute: 100,
  building_per_region_per_minute: 25,
  apx_per_region_per_hour: 10,
  base_min_distance: 50_tiles
}
```

### Validation Rules
```
function validate_building_placement(building: Building, position: TileCoord, player: Player): boolean {
  if building.kind == 'Base':
    nearest_base = find_nearest_base(position)
    if distance(position, nearest_base) < BASE_MIN_DISTANCE:
      return false
  
  required_colors = building.min_colors_required
  if player.palette.colors.length < required_colors:
    return false
  
  tech_req = building.prerequisites.tech_tier
  if player.tech_level < tech_req:
    return false
  
  return check_tile_ownership(position, player)
}
```

## Victory Conditions

### Win Conditions
```
function check_victory(player: Player, world: WorldState): boolean {
  dominance_score = calculate_dominance(player, world)
  global_threshold = world.victory_threshold
  
  if dominance_score >= global_threshold:
    return true
  
  active_rivals = count_active_players(world, exclude=player)
  if active_rivals == 0:
    return true
  
  return false
}
```

### Defeat Conditions
```
function check_defeat(player: Player): boolean {
  bases = filter(player.buildings, kind='Base')
  if bases.length == 0:
    return true
  
  if player.generation_rate == 0 && grace_period_expired(player):
    return true
  
  return false
}
```

## State Machines

### Player Action States
```
PlayerAction = Idle | DrawTerritory | PlaceBuilding | Expand | Trade | Research | AllianceOps

transitions = {
  Idle -> DrawTerritory: on_canvas_click,
  DrawTerritory -> PlaceBuilding: on_building_select,
  PlaceBuilding -> Expand: on_placement_success,
  * -> Idle: on_action_complete | on_error
}
```

### NPC Faction Behavior
```
NPCFaction = Observe | ContestTerritory | Fortify | RaidWithAPX | Retreat

npc_decision_tree = {
  Observe: analyze_player_threats(),
  ContestTerritory: if enemy_expansion_detected(),
  Fortify: if under_apx_attack(),
  RaidWithAPX: if opportunity_detected(),
  Retreat: if resources_depleted()
}
```

## Performance Optimizations

### Tile Sharding
```
function get_shard_id(tile_id: TileId): string {
  return `shard_${Math.floor(tile_id.lat / SHARD_SIZE)}_${Math.floor(tile_id.lon / SHARD_SIZE)}`
}

function subscribe_to_visible_tiles(viewport: BoundingBox): Set<ShardId> {
  shards = []
  for tile in get_tiles_in_bounds(viewport):
    shards.add(get_shard_id(tile.id))
  return shards
}
```

### Update Batching
```
function batch_pixel_updates(updates: PixelUpdate[]): BatchedUpdate {
  grouped = group_by(updates, update => update.shard_id)
  return {
    timestamp: now(),
    shards: grouped
  }
}
```

## Test Scenarios

### Core Game Loop Tests
```
TEST_01_Start: new_player() -> {px: 30, palette: 8}
TEST_02_Draw_Base: place_base() -> {cost: 36, unlocks: visible}
TEST_03_Gen_Storage: after_5min(GenPx + Storage) -> {px: increased, capped}
TEST_04_Colors: build_N_ColorFactory() -> {palette: += N, max: 512}
TEST_05_APX: apx_attack() -> {enemy_tiles: reduced, cooldown: active}
TEST_06_Tech_Tier: meet_T2_colors() -> {AdvGenPx: placeable, T2: unlocked}
```

This pseudocode serves as the canonical reference for all game logic implementation and should be maintained alongside the actual TypeScript code.
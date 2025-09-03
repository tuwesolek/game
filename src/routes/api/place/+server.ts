// API endpoint for pixel placement validation and processing

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { gameRules } from '../../../lib/game/rules.js';
import { getBuildingTemplate } from '../../../lib/game/buildings.js';
import type { PlaceActionRequest, ApiResponse, Player, TileCoord, BuildingType } from '../../../lib/types.js';

// Player state management
// TODO(prod): Replace with proper database integration
const mockPlayers = new Map<string, Player>();
const mockOccupiedTiles = new Set<string>();

// In a production implementation, this would connect to a real database:
/*
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getPlayerFromDatabase(playerId: string): Promise<Player | null> {
  try {
    const playerData = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        resources: true,
        buildings: true,
        palette: true,
        alliances: true
      }
    });
    
    if (!playerData) return null;
    
    return {
      id: playerData.id,
      faction_id: playerData.factionId,
      resources: {
        px: playerData.resources.px,
        exp: playerData.resources.exp,
        apx: playerData.resources.apx
      },
      palette: {
        colors: new Set(playerData.palette.colors)
      },
      owned_territories: new Set(playerData.ownedTerritories),
      buildings: playerData.buildings.map(building => ({
        id: building.id,
        template: getBuildingTemplate(building.type as BuildingType),
        position: { lat_idx: building.latIdx, lon_idx: building.lonIdx },
        owner_id: building.ownerId,
        placed_at: building.placedAt.getTime()
      })),
      tech_level: playerData.techLevel,
      alliances: new Set(playerData.alliances),
      generation_rate: playerData.generationRate,
      storage_capacity: playerData.storageCapacity,
      last_tick: playerData.lastTick.getTime()
    };
  } catch (error) {
    console.error('Database error fetching player:', error);
    return null;
  }
}

async function updatePlayerInDatabase(player: Player): Promise<boolean> {
  try {
    await prisma.player.update({
      where: { id: player.id },
      data: {
        resources: {
          update: {
            px: player.resources.px,
            exp: player.resources.exp,
            apx: player.resources.apx
          }
        },
        techLevel: player.tech_level,
        generationRate: player.generation_rate,
        storageCapacity: player.storage_capacity,
        lastTick: new Date(player.last_tick),
        ownedTerritories: Array.from(player.owned_territories),
        palette: {
          update: {
            colors: Array.from(player.palette.colors)
          }
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('Database error updating player:', error);
    return false;
  }
}
*/

// Initialize a mock player for development
function getMockPlayer(playerId: string = 'dev-player'): Player {
  if (!mockPlayers.has(playerId)) {
    const mockPlayer: Player = {
      id: playerId,
      faction_id: 'development',
      resources: {
        px: 1000, // Generous amount for testing
        exp: 50,
        apx: 25
      },
      palette: {
        colors: new Set([
          '#6b7280', '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
          '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899'
        ])
      },
      owned_territories: new Set(),
      buildings: [],
      tech_level: 1,
      alliances: new Set(),
      generation_rate: 1,
      storage_capacity: 200,
      last_tick: Date.now()
    };
    mockPlayers.set(playerId, mockPlayer);
  }
  return mockPlayers.get(playerId)!;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: PlaceActionRequest = await request.json();
    
    // Get mock player (in production, extract from authentication)
    const playerId = 'dev-player';
    const player = getMockPlayer(playerId);
    
    // Validate request format
    if (!data.action || !data.tiles || !Array.isArray(data.tiles)) {
      return json({
        success: false,
        error: 'Invalid request format: missing action or tiles',
        timestamp: Date.now()
      } as ApiResponse);
    }
    
    let validationResult;
    
    switch (data.action) {
      case 'draw_territory':
        if (!data.color) {
          return json({
            success: false,
            error: 'Color required for territory drawing',
            timestamp: Date.now()
          } as ApiResponse);
        }
        
        validationResult = gameRules.validateTerritoryDraw(
          data.tiles,
          data.color,
          player,
          mockOccupiedTiles
        );
        
        if (validationResult.valid) {
          // Apply territory placement
          for (const tile of data.tiles) {
            const tileId = `${tile.lat_idx}_${tile.lon_idx}`;
            mockOccupiedTiles.add(tileId);
            player.owned_territories.add(tileId);
          }
          
          // Deduct cost
          player.resources.px -= validationResult.cost!;
          
          // Broadcast update via WebSocket
          // TODO(prod): Replace with proper WebSocket broadcast implementation
          console.log('Territory placed:', {
            playerId,
            tiles: data.tiles,
            color: data.color,
            cost: validationResult.cost
          });
          
          // In production, this would broadcast to all connected clients:
          /*
          broadcastToClients({
            type: 'territory_update',
            data: {
              playerId,
              tiles: data.tiles,
              color: data.color,
              timestamp: Date.now()
            }
          });
          */
        }
        break;
        
      case 'place_building':
        if (!data.building_type || data.tiles.length !== 1) {
          return json({
            success: false,
            error: 'Building type and single position required',
            timestamp: Date.now()
          } as ApiResponse);
        }
        
        validationResult = gameRules.validateBuildingPlacement(
          data.building_type as BuildingType,
          data.tiles[0],
          player,
          mockOccupiedTiles
        );
        
        if (validationResult.valid) {
          const template = getBuildingTemplate(data.building_type as BuildingType);
          
          // Create building
          const building = {
            id: `building_${Date.now()}`,
            template,
            position: data.tiles[0],
            owner_id: playerId,
            placed_at: Date.now()
          };
          
          // Apply building placement
          player.buildings.push(building);
          
          // Mark footprint as occupied
          for (const tileId of validationResult.affected_tiles!) {
            mockOccupiedTiles.add(tileId);
          }
          
          // Deduct cost and apply effects
          player.resources.px -= validationResult.cost!;
          
          // Apply building effects
          if (template.effects.on_place) {
            if (template.effects.on_place.palette_colors) {
              // Add random colors to palette (simplified)
              const newColors = template.effects.on_place.palette_colors;
              for (let i = 0; i < newColors; i++) {
                const hue = Math.floor(Math.random() * 360);
                const color = `hsl(${hue}, 60%, 50%)`;
                const hexColor = hslToHex(hue, 60, 50);
                player.palette.colors.add(hexColor);
              }
            }
          }
          
          if (template.effects.passive) {
            if (template.effects.passive.px_cap) {
              player.storage_capacity += template.effects.passive.px_cap;
            }
          }
          
          console.log('Building placed:', {
            playerId,
            buildingType: data.building_type,
            position: data.tiles[0],
            cost: validationResult.cost
          });
        }
        break;
        
      default:
        return json({
          success: false,
          error: `Unknown action: ${data.action}`,
          timestamp: Date.now()
        } as ApiResponse);
    }
    
    if (!validationResult.valid) {
      return json({
        success: false,
        error: validationResult.error,
        timestamp: Date.now()
      } as ApiResponse);
    }
    
    // Return success response with updated player state
    return json({
      success: true,
      data: {
        player_resources: player.resources,
        player_storage: player.storage_capacity,
        affected_tiles: validationResult.affected_tiles,
        cost: validationResult.cost
      },
      timestamp: Date.now()
    } as ApiResponse);
    
  } catch (error) {
    console.error('Place API error:', error);
    
    return json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now()
    } as ApiResponse, {
      status: 500
    });
  }
};

// Helper function to convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  const sDecimal = s / 100;
  const lDecimal = l / 100;
  
  const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lDecimal - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, '0');
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, '0');
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, '0');
  
  return `#${rHex}${gHex}${bHex}`;
}

// GET endpoint for testing
export const GET: RequestHandler = async () => {
  return json({
    message: 'Pixel Dominion Place API',
    version: '1.0.0',
    endpoints: {
      POST: 'Place pixels or buildings'
    }
  });
};
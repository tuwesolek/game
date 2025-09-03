import { json } from "@sveltejs/kit";
import { c as canBuildBuilding, G as GAME_CONFIG, g as getBuildingTemplate, A as APX_SHAPES } from "../../../../chunks/buildings.js";
function tileId(coord) {
  return `${coord.lat_idx}_${coord.lon_idx}`;
}
function tileDistance(a, b) {
  const dx = Math.abs(a.lon_idx - b.lon_idx);
  const dy = Math.abs(a.lat_idx - b.lat_idx);
  return Math.sqrt(dx * dx + dy * dy);
}
function getTileArea(center, width, height) {
  const tiles = [];
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
class RateLimiter {
  limits = /* @__PURE__ */ new Map();
  check(key, limit, windowMs) {
    const now = Date.now();
    const existing = this.limits.get(key);
    if (!existing || now > existing.resetTime) {
      this.limits.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    if (existing.count >= limit) {
      return false;
    }
    existing.count++;
    return true;
  }
  getRemainingCount(key, limit) {
    const existing = this.limits.get(key);
    if (!existing || Date.now() > existing.resetTime) {
      return limit;
    }
    return Math.max(0, limit - existing.count);
  }
}
const territoryLimiter = new RateLimiter();
const buildingLimiter = new RateLimiter();
const apxLimiter = new RateLimiter();
function validateTerritoryDraw(tiles, color, player, occupiedTiles) {
  if (!isGrayscale(color)) {
    return {
      valid: false,
      error: "Territory must be grayscale colors only"
    };
  }
  const regionKey = `${player.id}_territory_${getRegionKey(tiles[0])}`;
  if (!territoryLimiter.check(regionKey, GAME_CONFIG.RATE_LIMITS.TERRITORY_PER_REGION_PER_MINUTE, 6e4)) {
    return {
      valid: false,
      error: "Territory drawing rate limit exceeded for this region"
    };
  }
  const tileIds = tiles.map((coord) => tileId(coord));
  const cost = tiles.length;
  if (player.resources.px < cost) {
    return {
      valid: false,
      error: `Insufficient PX: need ${cost}, have ${player.resources.px}`
    };
  }
  for (const id of tileIds) {
    if (occupiedTiles.has(id)) {
      return {
        valid: false,
        error: "Cannot draw on occupied tiles"
      };
    }
  }
  return {
    valid: true,
    cost,
    affected_tiles: tileIds
  };
}
function validateBuildingPlacement(buildingType, position, player, occupiedTiles) {
  const template = getBuildingTemplate(buildingType);
  if (!canBuildBuilding(buildingType, player)) {
    return {
      valid: false,
      error: "Building requirements not met (resources, tech, or dependencies)"
    };
  }
  const regionKey = `${player.id}_building_${getRegionKey(position)}`;
  if (!buildingLimiter.check(regionKey, GAME_CONFIG.RATE_LIMITS.BUILDING_PER_REGION_PER_MINUTE, 6e4)) {
    return {
      valid: false,
      error: "Building placement rate limit exceeded for this region"
    };
  }
  const buildingTiles = getTileArea(position, template.size.width, template.size.height);
  const buildingTileIds = buildingTiles.map((coord) => tileId(coord));
  for (const id of buildingTileIds) {
    if (occupiedTiles.has(id)) {
      return {
        valid: false,
        error: "Building footprint conflicts with existing structures"
      };
    }
  }
  if (buildingType === "Base") {
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
function validateApxAttack(shape, position, targetRegion, player) {
  const apxConfig = APX_SHAPES[shape.toUpperCase()];
  if (!apxConfig) {
    return {
      valid: false,
      error: "Invalid APX attack shape"
    };
  }
  if (player.resources.apx < apxConfig.cost) {
    return {
      valid: false,
      error: `Insufficient APX: need ${apxConfig.cost}, have ${player.resources.apx}`
    };
  }
  const cooldownKey = `${player.id}_apx_${shape}_${targetRegion}`;
  if (isOnCooldown(cooldownKey, apxConfig.cooldown * 1e3)) {
    return {
      valid: false,
      error: `APX attack on cooldown for ${shape} in ${targetRegion}`
    };
  }
  const rateLimitKey = `${player.id}_apx_${targetRegion}`;
  if (!apxLimiter.check(rateLimitKey, GAME_CONFIG.RATE_LIMITS.APX_PER_REGION_PER_HOUR, 36e5)) {
    return {
      valid: false,
      error: "APX attack rate limit exceeded for this region"
    };
  }
  const affectedTiles = calculateApxAffectedTiles(shape, position);
  return {
    valid: true,
    cost: apxConfig.cost,
    affected_tiles: affectedTiles
  };
}
function validateResourceConversion(from, amount, player) {
  if (amount <= 0) {
    return {
      valid: false,
      error: "Conversion amount must be positive"
    };
  }
  if (from === "PX_TO_EXP") {
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
  if (from === "exp_to_px") {
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
        error: "Conversion would exceed PX storage capacity"
      };
    }
    return { valid: true, cost };
  }
  return {
    valid: false,
    error: "Invalid conversion type"
  };
}
function validateAllianceAction(action, player, targetId) {
  switch (action) {
    case "create":
      if (player.alliances.size > 0) {
        return {
          valid: false,
          error: "Player is already in an alliance"
        };
      }
      break;
    case "join":
    case "leave":
      if (!targetId) {
        return {
          valid: false,
          error: "Alliance ID required"
        };
      }
      break;
    case "invite":
      if (player.alliances.size === 0) {
        return {
          valid: false,
          error: "Player must be in an alliance to invite others"
        };
      }
      break;
  }
  return { valid: true };
}
function isGrayscale(color) {
  const hex = color.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return r === g && g === b;
}
function getRegionKey(coord) {
  const regionSize = 100;
  const regionLat = Math.floor(coord.lat_idx / regionSize);
  const regionLon = Math.floor(coord.lon_idx / regionSize);
  return `${regionLat}_${regionLon}`;
}
function findNearestBase(position, player) {
  let nearest = null;
  let minDistance = Infinity;
  for (const building of player.buildings) {
    if (building.template.kind === "Base") {
      const distance = tileDistance(position, building.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = building.position;
      }
    }
  }
  return nearest;
}
const cooldowns = /* @__PURE__ */ new Map();
function isOnCooldown(key, durationMs) {
  const endTime = cooldowns.get(key);
  if (!endTime) return false;
  if (Date.now() > endTime) {
    cooldowns.delete(key);
    return false;
  }
  return true;
}
function setCooldown(key, durationMs) {
  cooldowns.set(key, Date.now() + durationMs);
}
function getCooldownRemaining(key) {
  const endTime = cooldowns.get(key);
  if (!endTime) return 0;
  const remaining = endTime - Date.now();
  return Math.max(0, remaining);
}
function calculateApxAffectedTiles(shape, position) {
  const affectedTiles = [];
  const { lat_idx, lon_idx } = position;
  switch (shape.toLowerCase()) {
    case "point":
      affectedTiles.push(`${lat_idx}_${lon_idx}`);
      break;
    case "line":
      for (let i = 0; i < 5; i++) {
        affectedTiles.push(`${lat_idx}_${lon_idx + i - 2}`);
      }
      break;
    case "area":
      for (let latOffset = -1; latOffset <= 1; latOffset++) {
        for (let lonOffset = -1; lonOffset <= 1; lonOffset++) {
          affectedTiles.push(`${lat_idx + latOffset}_${lon_idx + lonOffset}`);
        }
      }
      break;
    case "building":
      for (let latOffset = -2; latOffset <= 2; latOffset++) {
        for (let lonOffset = -2; lonOffset <= 2; lonOffset++) {
          affectedTiles.push(`${lat_idx + latOffset}_${lon_idx + lonOffset}`);
        }
      }
      break;
    default:
      affectedTiles.push(`${lat_idx}_${lon_idx}`);
  }
  return affectedTiles;
}
function detectGriefingBehavior(player, recentActions) {
  const now = Date.now();
  const oneHourAgo = now - 36e5;
  const recentTerritoryActions = recentActions.filter(
    (a) => a.type === "draw_territory" && a.timestamp > oneHourAgo
  );
  const recentApxActions = recentActions.filter(
    (a) => a.type === "apx_attack" && a.timestamp > oneHourAgo
  );
  if (recentTerritoryActions.length > 500) {
    return {
      isGriefing: true,
      reason: "Excessive territory drawing activity",
      severity: "high"
    };
  }
  const apxTargets = new Set(recentApxActions.map((a) => a.target));
  if (apxTargets.size === 1 && recentApxActions.length > 10) {
    return {
      isGriefing: true,
      reason: "Targeted harassment with APX attacks",
      severity: "high"
    };
  }
  const smallDrawings = recentTerritoryActions.filter((a) => a.tiles.length === 1);
  if (smallDrawings.length > 100) {
    return {
      isGriefing: true,
      reason: "Pixel spam detected",
      severity: "medium"
    };
  }
  return {
    isGriefing: false,
    severity: "low"
  };
}
const gameRules = {
  validateTerritoryDraw,
  validateBuildingPlacement,
  validateApxAttack,
  validateResourceConversion,
  validateAllianceAction,
  setCooldown,
  getCooldownRemaining,
  detectGriefingBehavior
};
const mockPlayers = /* @__PURE__ */ new Map();
const mockOccupiedTiles = /* @__PURE__ */ new Set();
function getMockPlayer(playerId = "dev-player") {
  if (!mockPlayers.has(playerId)) {
    const mockPlayer = {
      id: playerId,
      faction_id: "development",
      resources: {
        px: 1e3,
        // Generous amount for testing
        exp: 50,
        apx: 25
      },
      palette: {
        colors: /* @__PURE__ */ new Set([
          "#6b7280",
          "#3b82f6",
          "#ef4444",
          "#10b981",
          "#f59e0b",
          "#8b5cf6",
          "#06b6d4",
          "#f97316",
          "#84cc16",
          "#ec4899"
        ])
      },
      owned_territories: /* @__PURE__ */ new Set(),
      buildings: [],
      tech_level: 1,
      alliances: /* @__PURE__ */ new Set(),
      generation_rate: 1,
      storage_capacity: 200,
      last_tick: Date.now()
    };
    mockPlayers.set(playerId, mockPlayer);
  }
  return mockPlayers.get(playerId);
}
const POST = async ({ request }) => {
  try {
    const data = await request.json();
    const playerId = "dev-player";
    const player = getMockPlayer(playerId);
    if (!data.action || !data.tiles || !Array.isArray(data.tiles)) {
      return json({
        success: false,
        error: "Invalid request format: missing action or tiles",
        timestamp: Date.now()
      });
    }
    let validationResult;
    switch (data.action) {
      case "draw_territory":
        if (!data.color) {
          return json({
            success: false,
            error: "Color required for territory drawing",
            timestamp: Date.now()
          });
        }
        validationResult = gameRules.validateTerritoryDraw(
          data.tiles,
          data.color,
          player,
          mockOccupiedTiles
        );
        if (validationResult.valid) {
          for (const tile of data.tiles) {
            const tileId2 = `${tile.lat_idx}_${tile.lon_idx}`;
            mockOccupiedTiles.add(tileId2);
            player.owned_territories.add(tileId2);
          }
          player.resources.px -= validationResult.cost;
          console.log("Territory placed:", {
            playerId,
            tiles: data.tiles,
            color: data.color,
            cost: validationResult.cost
          });
        }
        break;
      case "place_building":
        if (!data.building_type || data.tiles.length !== 1) {
          return json({
            success: false,
            error: "Building type and single position required",
            timestamp: Date.now()
          });
        }
        validationResult = gameRules.validateBuildingPlacement(
          data.building_type,
          data.tiles[0],
          player,
          mockOccupiedTiles
        );
        if (validationResult.valid) {
          const template = getBuildingTemplate(data.building_type);
          const building = {
            id: `building_${Date.now()}`,
            template,
            position: data.tiles[0],
            owner_id: playerId,
            placed_at: Date.now()
          };
          player.buildings.push(building);
          for (const tileId2 of validationResult.affected_tiles) {
            mockOccupiedTiles.add(tileId2);
          }
          player.resources.px -= validationResult.cost;
          if (template.effects.on_place) {
            if (template.effects.on_place.palette_colors) {
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
          console.log("Building placed:", {
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
        });
    }
    if (!validationResult.valid) {
      return json({
        success: false,
        error: validationResult.error,
        timestamp: Date.now()
      });
    }
    return json({
      success: true,
      data: {
        player_resources: player.resources,
        player_storage: player.storage_capacity,
        affected_tiles: validationResult.affected_tiles,
        cost: validationResult.cost
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Place API error:", error);
    return json({
      success: false,
      error: "Internal server error",
      timestamp: Date.now()
    }, {
      status: 500
    });
  }
};
function hslToHex(h, s, l) {
  const sDecimal = s / 100;
  const lDecimal = l / 100;
  const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
  const x = c * (1 - Math.abs(h / 60 % 2 - 1));
  const m = lDecimal - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }
  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, "0");
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, "0");
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, "0");
  return `#${rHex}${gHex}${bHex}`;
}
const GET = async () => {
  return json({
    message: "Pixel Dominion Place API",
    version: "1.0.0",
    endpoints: {
      POST: "Place pixels or buildings"
    }
  });
};
export {
  GET,
  POST
};

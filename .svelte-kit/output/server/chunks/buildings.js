const GAME_CONFIG = {
  // Starting resources and limits
  STARTING_PX: 30,
  BASE_GENERATION_RATE: 1,
  // tiles per shard for efficient updates
  BASE_MIN_DISTANCE: 50,
  // minimum tiles between bases
  // Rate limiting (anti-grief)
  RATE_LIMITS: {
    TERRITORY_PER_REGION_PER_MINUTE: 100,
    BUILDING_PER_REGION_PER_MINUTE: 25,
    APX_PER_REGION_PER_HOUR: 10
  },
  // Resource conversion rates
  CONVERSIONS: {
    PX_TO_EXP: { cost: 10, yield: 1 },
    // 10px -> 1exp
    EXP_TO_PX: { cost: 1, yield: 8 }
    // 1exp -> 8px
  },
  // Victory conditions
  DOMINANCE_THRESHOLD: 0.25
};
const COLORS = {
  TERRITORY_GRAY: "#6b7280"
};
const TECH_TIER_REQUIREMENTS = {
  1: 8,
  // Tier 1: 8 colors minimum
  2: 16,
  // Tier 2: 16 colors minimum  
  3: 32,
  // Tier 3: 32 colors minimum
  4: 64,
  // Tier 4: 64 colors minimum
  5: 128
  // Tier 5: 128 colors minimum
};
const APX_SHAPES = {
  POINT: { size: 1, cost: 1, cooldown: 10 },
  LINE: { size: 5, cost: 3, cooldown: 20 },
  AREA: { size: 9, cost: 8, cooldown: 45 },
  BUILDING: { size: 25, cost: 15, cooldown: 90 }
};
const TIER_1_BUILDINGS = {
  Base: {
    kind: "Base",
    size: { width: 6, height: 6 },
    cost_px: 36,
    min_colors_required: 2,
    effects: {
      passive: { px_cap: 200 }
      // Base unlocks other buildings - handled in tech tree
    },
    prerequisites: {
      tech_tier: 1,
      deps: []
    }
  },
  GenPx: {
    kind: "GenPx",
    size: { width: 3, height: 3 },
    cost_px: 9,
    min_colors_required: TECH_TIER_REQUIREMENTS[1],
    effects: {
      on_tick: { px_rate: 1 }
    },
    prerequisites: {
      tech_tier: 1,
      deps: ["Base"]
    }
  },
  Storage: {
    kind: "Storage",
    size: { width: 3, height: 3 },
    cost_px: 9,
    min_colors_required: TECH_TIER_REQUIREMENTS[1],
    effects: {
      passive: { px_cap: 100 }
    },
    prerequisites: {
      tech_tier: 1,
      deps: ["Base"]
    }
  },
  ColorFactory: {
    kind: "ColorFactory",
    size: { width: 3, height: 3 },
    cost_px: 9,
    min_colors_required: TECH_TIER_REQUIREMENTS[1],
    effects: {
      on_place: { palette_colors: 1 }
    },
    prerequisites: {
      tech_tier: 1,
      deps: ["Base"]
    }
  },
  Science: {
    kind: "Science",
    size: { width: 5, height: 5 },
    cost_px: 25,
    min_colors_required: TECH_TIER_REQUIREMENTS[1],
    effects: {
      passive: { enables_research: true }
    },
    prerequisites: {
      tech_tier: 1,
      deps: ["Base"]
    }
  },
  EXP_Mine: {
    kind: "EXP_Mine",
    size: { width: 4, height: 4 },
    cost_px: 16,
    min_colors_required: TECH_TIER_REQUIREMENTS[1],
    effects: {
      on_tick: { exp_rate: 1 }
    },
    prerequisites: {
      tech_tier: 1,
      deps: ["Base"]
    }
  },
  PX2EXP: {
    kind: "PX2EXP",
    size: { width: 3, height: 3 },
    cost_px: 9,
    min_colors_required: TECH_TIER_REQUIREMENTS[1],
    effects: {
      active: { convert: "10px->1exp" }
    },
    prerequisites: {
      tech_tier: 1,
      deps: ["Base"]
    }
  },
  EXP2PX: {
    kind: "EXP2PX",
    size: { width: 3, height: 3 },
    cost_px: 9,
    min_colors_required: TECH_TIER_REQUIREMENTS[1],
    effects: {
      active: { convert: "1exp->8px" }
    },
    prerequisites: {
      tech_tier: 1,
      deps: ["Base"]
    }
  },
  AntiPxGen: {
    kind: "AntiPxGen",
    size: { width: 4, height: 4 },
    cost_px: 16,
    min_colors_required: TECH_TIER_REQUIREMENTS[1],
    effects: {
      on_tick: { apx_rate: 1 }
    },
    prerequisites: {
      tech_tier: 1,
      deps: ["Base"]
    }
  },
  Board: {
    kind: "Board",
    size: { width: 3, height: 3 },
    cost_px: 9,
    min_colors_required: TECH_TIER_REQUIREMENTS[1],
    effects: {
      active: { post_message: true }
    },
    prerequisites: {
      tech_tier: 1,
      deps: ["Base"]
    }
  },
  // Tier 2+ Buildings - Data stubs with effects marked for implementation
  AdvGenPx: {
    kind: "AdvGenPx",
    size: { width: 4, height: 4 },
    cost_px: 25,
    min_colors_required: TECH_TIER_REQUIREMENTS[2],
    effects: {
      on_tick: { px_rate: 3 }
    },
    prerequisites: {
      tech_tier: 2,
      deps: ["GenPx"]
    }
  },
  MegaStorage: {
    kind: "MegaStorage",
    size: { width: 5, height: 5 },
    cost_px: 36,
    min_colors_required: TECH_TIER_REQUIREMENTS[2],
    effects: {
      passive: { px_cap: 500 }
    },
    prerequisites: {
      tech_tier: 2,
      deps: ["Storage"]
    }
  },
  PigmentFactory: {
    kind: "PigmentFactory",
    size: { width: 4, height: 4 },
    cost_px: 20,
    min_colors_required: TECH_TIER_REQUIREMENTS[2],
    effects: {
      on_place: { palette_colors: 3 }
    },
    prerequisites: {
      tech_tier: 2,
      deps: ["ColorFactory"]
    }
  },
  Academy: {
    kind: "Academy",
    size: { width: 6, height: 6 },
    cost_px: 49,
    min_colors_required: TECH_TIER_REQUIREMENTS[2],
    effects: {
      passive: { research_speed: 2 }
    },
    prerequisites: {
      tech_tier: 2,
      deps: ["Science"]
    }
  },
  CentralDepot: {
    kind: "CentralDepot",
    size: { width: 7, height: 7 },
    cost_px: 64,
    min_colors_required: TECH_TIER_REQUIREMENTS[3],
    effects: {
      passive: { px_cap: 1500 }
    },
    prerequisites: {
      tech_tier: 3,
      deps: ["MegaStorage"]
    }
  },
  AlchemyLab: {
    kind: "AlchemyLab",
    size: { width: 5, height: 5 },
    cost_px: 36,
    min_colors_required: TECH_TIER_REQUIREMENTS[3],
    effects: {
      on_place: { palette_colors: 8 }
    },
    prerequisites: {
      tech_tier: 3,
      deps: ["PigmentFactory"]
    }
  },
  GlobalInstitute: {
    kind: "GlobalInstitute",
    size: { width: 8, height: 8 },
    cost_px: 81,
    min_colors_required: TECH_TIER_REQUIREMENTS[3],
    effects: {
      passive: { research_speed: 5 }
    },
    prerequisites: {
      tech_tier: 3,
      deps: ["Academy"]
    }
  },
  CrystalExpMine: {
    kind: "CrystalExpMine",
    size: { width: 6, height: 6 },
    cost_px: 49,
    min_colors_required: TECH_TIER_REQUIREMENTS[3],
    effects: {
      on_tick: { exp_rate: 5 }
    },
    prerequisites: {
      tech_tier: 3,
      deps: ["EXP_Mine"]
    }
  },
  AntiPxLab: {
    kind: "AntiPxLab",
    size: { width: 5, height: 5 },
    cost_px: 36,
    min_colors_required: TECH_TIER_REQUIREMENTS[3],
    effects: {
      on_tick: { apx_rate: 3 }
    },
    prerequisites: {
      tech_tier: 3,
      deps: ["AntiPxGen"]
    }
  },
  QuantumPxFactory: {
    kind: "QuantumPxFactory",
    size: { width: 8, height: 8 },
    cost_px: 100,
    min_colors_required: TECH_TIER_REQUIREMENTS[4],
    effects: {
      on_tick: { px_rate: 15 }
    },
    prerequisites: {
      tech_tier: 4,
      deps: ["CentralDepot"]
    }
  },
  ColossalColorLab: {
    kind: "ColossalColorLab",
    size: { width: 7, height: 7 },
    cost_px: 81,
    min_colors_required: TECH_TIER_REQUIREMENTS[4],
    effects: {
      on_place: { palette_colors: 20 }
    },
    prerequisites: {
      tech_tier: 4,
      deps: ["AlchemyLab"]
    }
  },
  AbsoluteArchive: {
    kind: "AbsoluteArchive",
    size: { width: 10, height: 10 },
    cost_px: 144,
    min_colors_required: TECH_TIER_REQUIREMENTS[4],
    effects: {
      passive: { research_speed: 10 }
    },
    prerequisites: {
      tech_tier: 4,
      deps: ["GlobalInstitute"]
    }
  },
  ChaosTower: {
    kind: "ChaosTower",
    size: { width: 6, height: 6 },
    cost_px: 64,
    min_colors_required: TECH_TIER_REQUIREMENTS[4],
    effects: {
      on_tick: { apx_rate: 8 }
    },
    prerequisites: {
      tech_tier: 4,
      deps: ["AntiPxLab"]
    }
  },
  WorldFortress: {
    kind: "WorldFortress",
    size: { width: 12, height: 12 },
    cost_px: 256,
    min_colors_required: TECH_TIER_REQUIREMENTS[5],
    effects: {
      passive: { px_cap: 1e4 },
      on_tick: { px_rate: 25 }
    },
    prerequisites: {
      tech_tier: 5,
      deps: ["QuantumPxFactory"]
    }
  },
  CentralAI: {
    kind: "CentralAI",
    size: { width: 15, height: 15 },
    cost_px: 400,
    min_colors_required: TECH_TIER_REQUIREMENTS[5],
    effects: {
      passive: { research_speed: 25 }
    },
    prerequisites: {
      tech_tier: 5,
      deps: ["AbsoluteArchive"]
    }
  },
  TotalAntiPxGen: {
    kind: "TotalAntiPxGen",
    size: { width: 8, height: 8 },
    cost_px: 121,
    min_colors_required: TECH_TIER_REQUIREMENTS[5],
    effects: {
      on_tick: { apx_rate: 20 }
    },
    prerequisites: {
      tech_tier: 5,
      deps: ["ChaosTower"]
    }
  },
  AntimatterGen: {
    kind: "AntimatterGen",
    size: { width: 10, height: 10 },
    cost_px: 225,
    min_colors_required: TECH_TIER_REQUIREMENTS[5],
    effects: {
      on_tick: { apx_rate: 50, px_rate: 50 }
    },
    prerequisites: {
      tech_tier: 5,
      deps: ["TotalAntiPxGen"]
    }
  }
};
const BUILDINGS = TIER_1_BUILDINGS;
function getBuildingTemplate(type) {
  return BUILDINGS[type];
}
function canBuildBuilding(building, player) {
  const template = getBuildingTemplate(building);
  if (player.resources.px < template.cost_px) {
    return false;
  }
  if (player.palette.colors.size < template.min_colors_required) {
    return false;
  }
  if (player.tech_level < template.prerequisites.tech_tier) {
    return false;
  }
  for (const dep of template.prerequisites.deps) {
    const hasDepBuilding = player.buildings.some((b) => b.template.kind === dep);
    if (!hasDepBuilding) {
      return false;
    }
  }
  return true;
}
function getAvailableBuildings(player) {
  const available = [];
  for (const [buildingType, template] of Object.entries(BUILDINGS)) {
    if (canBuildBuilding(buildingType, player)) {
      available.push(buildingType);
    }
  }
  return available;
}
function getBuildingDisplayInfo(buildingType) {
  const template = getBuildingTemplate(buildingType);
  const categories = {
    Base: "economy",
    GenPx: "economy",
    AdvGenPx: "economy",
    QuantumPxFactory: "economy",
    Storage: "economy",
    MegaStorage: "economy",
    CentralDepot: "economy",
    ColorFactory: "tech",
    PigmentFactory: "tech",
    AlchemyLab: "tech",
    ColossalColorLab: "tech",
    Science: "tech",
    Academy: "tech",
    GlobalInstitute: "tech",
    AbsoluteArchive: "tech",
    CentralAI: "tech",
    EXP_Mine: "tech",
    CrystalExpMine: "tech",
    PX2EXP: "utility",
    EXP2PX: "utility",
    AntiPxGen: "military",
    AntiPxLab: "military",
    ChaosTower: "military",
    TotalAntiPxGen: "military",
    AntimatterGen: "military",
    Board: "utility",
    WorldFortress: "military"
  };
  const descriptions = {
    Base: "Foundation structure that unlocks other buildings",
    GenPx: "Generates pixels over time",
    Storage: "Increases pixel storage capacity",
    ColorFactory: "Adds new colors to your palette",
    Science: "Enables research and tech progression",
    EXP_Mine: "Generates experience points",
    PX2EXP: "Converts pixels to experience",
    EXP2PX: "Converts experience to pixels",
    AntiPxGen: "Generates anti-pixel for attacks",
    Board: "Post messages to regional board",
    // T2+ descriptions
    AdvGenPx: "Advanced pixel generator (3x rate)",
    MegaStorage: "Large storage facility (5x capacity)",
    PigmentFactory: "Advanced color production (+3 colors)",
    Academy: "Accelerates research (2x speed)"
    // ... more descriptions for higher tiers
  };
  return {
    name: buildingType.replace(/([A-Z])/g, " $1").trim(),
    description: descriptions[buildingType] || "Advanced building",
    category: categories[buildingType] || "utility",
    tier: template.prerequisites.tech_tier
  };
}
export {
  APX_SHAPES as A,
  COLORS as C,
  GAME_CONFIG as G,
  getAvailableBuildings as a,
  getBuildingDisplayInfo as b,
  canBuildBuilding as c,
  getBuildingTemplate as g
};

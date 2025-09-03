// Buildings catalog and logic - implements T1 fully, T2-5 as data stubs

import type { BuildingTemplate, BuildingType, Player, Building } from '../types.js';
import { TECH_TIER_REQUIREMENTS } from './constants.js';

// Tier 1 Buildings - Fully Implemented
const TIER_1_BUILDINGS: Record<BuildingType, BuildingTemplate> = {
	Base: {
		kind: 'Base',
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
		kind: 'GenPx',
		size: { width: 3, height: 3 },
		cost_px: 9,
		min_colors_required: TECH_TIER_REQUIREMENTS[1],
		effects: {
			on_tick: { px_rate: 1 }
		},
		prerequisites: {
			tech_tier: 1,
			deps: ['Base']
		}
	},
	
	Storage: {
		kind: 'Storage',
		size: { width: 3, height: 3 },
		cost_px: 9,
		min_colors_required: TECH_TIER_REQUIREMENTS[1],
		effects: {
			passive: { px_cap: 100 }
		},
		prerequisites: {
			tech_tier: 1,
			deps: ['Base']
		}
	},
	
	ColorFactory: {
		kind: 'ColorFactory',
		size: { width: 3, height: 3 },
		cost_px: 9,
		min_colors_required: TECH_TIER_REQUIREMENTS[1],
		effects: {
			on_place: { palette_colors: 1 }
		},
		prerequisites: {
			tech_tier: 1,
			deps: ['Base']
		}
	},
	
	Science: {
		kind: 'Science',
		size: { width: 5, height: 5 },
		cost_px: 25,
		min_colors_required: TECH_TIER_REQUIREMENTS[1],
		effects: {
			passive: { enables_research: true }
		},
		prerequisites: {
			tech_tier: 1,
			deps: ['Base']
		}
	},
	
	EXP_Mine: {
		kind: 'EXP_Mine',
		size: { width: 4, height: 4 },
		cost_px: 16,
		min_colors_required: TECH_TIER_REQUIREMENTS[1],
		effects: {
			on_tick: { exp_rate: 1 }
		},
		prerequisites: {
			tech_tier: 1,
			deps: ['Base']
		}
	},
	
	PX2EXP: {
		kind: 'PX2EXP',
		size: { width: 3, height: 3 },
		cost_px: 9,
		min_colors_required: TECH_TIER_REQUIREMENTS[1],
		effects: {
			active: { convert: '10px->1exp' }
		},
		prerequisites: {
			tech_tier: 1,
			deps: ['Base']
		}
	},
	
	EXP2PX: {
		kind: 'EXP2PX',
		size: { width: 3, height: 3 },
		cost_px: 9,
		min_colors_required: TECH_TIER_REQUIREMENTS[1],
		effects: {
			active: { convert: '1exp->8px' }
		},
		prerequisites: {
			tech_tier: 1,
			deps: ['Base']
		}
	},
	
	AntiPxGen: {
		kind: 'AntiPxGen',
		size: { width: 4, height: 4 },
		cost_px: 16,
		min_colors_required: TECH_TIER_REQUIREMENTS[1],
		effects: {
			on_tick: { apx_rate: 1 }
		},
		prerequisites: {
			tech_tier: 1,
			deps: ['Base']
		}
	},
	
	Board: {
		kind: 'Board',
		size: { width: 3, height: 3 },
		cost_px: 9,
		min_colors_required: TECH_TIER_REQUIREMENTS[1],
		effects: {
			active: { post_message: true }
		},
		prerequisites: {
			tech_tier: 1,
			deps: ['Base']
		}
	},
	
	// Tier 2+ Buildings - Data stubs with effects marked for implementation
	AdvGenPx: {
		kind: 'AdvGenPx',
		size: { width: 4, height: 4 },
		cost_px: 25,
		min_colors_required: TECH_TIER_REQUIREMENTS[2],
		effects: {
			on_tick: { px_rate: 3 }
		},
		prerequisites: {
			tech_tier: 2,
			deps: ['GenPx']
		}
	},
	
	MegaStorage: {
		kind: 'MegaStorage',
		size: { width: 5, height: 5 },
		cost_px: 36,
		min_colors_required: TECH_TIER_REQUIREMENTS[2],
		effects: {
			passive: { px_cap: 500 }
		},
		prerequisites: {
			tech_tier: 2,
			deps: ['Storage']
		}
	},
	
	PigmentFactory: {
		kind: 'PigmentFactory',
		size: { width: 4, height: 4 },
		cost_px: 20,
		min_colors_required: TECH_TIER_REQUIREMENTS[2],
		effects: {
			on_place: { palette_colors: 3 }
		},
		prerequisites: {
			tech_tier: 2,
			deps: ['ColorFactory']
		}
	},
	
	Academy: {
		kind: 'Academy',
		size: { width: 6, height: 6 },
		cost_px: 49,
		min_colors_required: TECH_TIER_REQUIREMENTS[2],
		effects: {
			passive: { research_speed: 2 }
		},
		prerequisites: {
			tech_tier: 2,
			deps: ['Science']
		}
	},
	
	CentralDepot: {
		kind: 'CentralDepot',
		size: { width: 7, height: 7 },
		cost_px: 64,
		min_colors_required: TECH_TIER_REQUIREMENTS[3],
		effects: {
			passive: { px_cap: 1500 }
		},
		prerequisites: {
			tech_tier: 3,
			deps: ['MegaStorage']
		}
	},
	
	AlchemyLab: {
		kind: 'AlchemyLab',
		size: { width: 5, height: 5 },
		cost_px: 36,
		min_colors_required: TECH_TIER_REQUIREMENTS[3],
		effects: {
			on_place: { palette_colors: 8 }
		},
		prerequisites: {
			tech_tier: 3,
			deps: ['PigmentFactory']
		}
	},
	
	GlobalInstitute: {
		kind: 'GlobalInstitute',
		size: { width: 8, height: 8 },
		cost_px: 81,
		min_colors_required: TECH_TIER_REQUIREMENTS[3],
		effects: {
			passive: { research_speed: 5 }
		},
		prerequisites: {
			tech_tier: 3,
			deps: ['Academy']
		}
	},
	
	CrystalExpMine: {
		kind: 'CrystalExpMine',
		size: { width: 6, height: 6 },
		cost_px: 49,
		min_colors_required: TECH_TIER_REQUIREMENTS[3],
		effects: {
			on_tick: { exp_rate: 5 }
		},
		prerequisites: {
			tech_tier: 3,
			deps: ['EXP_Mine']
		}
	},
	
	AntiPxLab: {
		kind: 'AntiPxLab',
		size: { width: 5, height: 5 },
		cost_px: 36,
		min_colors_required: TECH_TIER_REQUIREMENTS[3],
		effects: {
			on_tick: { apx_rate: 3 }
		},
		prerequisites: {
			tech_tier: 3,
			deps: ['AntiPxGen']
		}
	},
	
	QuantumPxFactory: {
		kind: 'QuantumPxFactory',
		size: { width: 8, height: 8 },
		cost_px: 100,
		min_colors_required: TECH_TIER_REQUIREMENTS[4],
		effects: {
			on_tick: { px_rate: 15 }
		},
		prerequisites: {
			tech_tier: 4,
			deps: ['CentralDepot']
		}
	},
	
	ColossalColorLab: {
		kind: 'ColossalColorLab',
		size: { width: 7, height: 7 },
		cost_px: 81,
		min_colors_required: TECH_TIER_REQUIREMENTS[4],
		effects: {
			on_place: { palette_colors: 20 }
		},
		prerequisites: {
			tech_tier: 4,
			deps: ['AlchemyLab']
		}
	},
	
	AbsoluteArchive: {
		kind: 'AbsoluteArchive',
		size: { width: 10, height: 10 },
		cost_px: 144,
		min_colors_required: TECH_TIER_REQUIREMENTS[4],
		effects: {
			passive: { research_speed: 10 }
		},
		prerequisites: {
			tech_tier: 4,
			deps: ['GlobalInstitute']
		}
	},
	
	ChaosTower: {
		kind: 'ChaosTower',
		size: { width: 6, height: 6 },
		cost_px: 64,
		min_colors_required: TECH_TIER_REQUIREMENTS[4],
		effects: {
			on_tick: { apx_rate: 8 }
		},
		prerequisites: {
			tech_tier: 4,
			deps: ['AntiPxLab']
		}
	},
	
	WorldFortress: {
		kind: 'WorldFortress',
		size: { width: 12, height: 12 },
		cost_px: 256,
		min_colors_required: TECH_TIER_REQUIREMENTS[5],
		effects: {
			passive: { px_cap: 10000 },
			on_tick: { px_rate: 25 }
		},
		prerequisites: {
			tech_tier: 5,
			deps: ['QuantumPxFactory']
		}
	},
	
	CentralAI: {
		kind: 'CentralAI',
		size: { width: 15, height: 15 },
		cost_px: 400,
		min_colors_required: TECH_TIER_REQUIREMENTS[5],
		effects: {
			passive: { research_speed: 25 }
		},
		prerequisites: {
			tech_tier: 5,
			deps: ['AbsoluteArchive']
		}
	},
	
	TotalAntiPxGen: {
		kind: 'TotalAntiPxGen',
		size: { width: 8, height: 8 },
		cost_px: 121,
		min_colors_required: TECH_TIER_REQUIREMENTS[5],
		effects: {
			on_tick: { apx_rate: 20 }
		},
		prerequisites: {
			tech_tier: 5,
			deps: ['ChaosTower']
		}
	},
	
	AntimatterGen: {
		kind: 'AntimatterGen',
		size: { width: 10, height: 10 },
		cost_px: 225,
		min_colors_required: TECH_TIER_REQUIREMENTS[5],
		effects: {
			on_tick: { apx_rate: 50, px_rate: 50 }
		},
		prerequisites: {
			tech_tier: 5,
			deps: ['TotalAntiPxGen']
		}
	}
};

// Export building templates
export const BUILDINGS = TIER_1_BUILDINGS;

// Get building template by type
export function getBuildingTemplate(type: BuildingType): BuildingTemplate {
	return BUILDINGS[type];
}

// Check if player can build this building type
export function canBuildBuilding(building: BuildingType, player: Player): boolean {
	const template = getBuildingTemplate(building);
	
	// Check resource cost
	if (player.resources.px < template.cost_px) {
		return false;
	}
	
	// Check color requirements
	if (player.palette.colors.size < template.min_colors_required) {
		return false;
	}
	
	// Check tech tier
	if (player.tech_level < template.prerequisites.tech_tier) {
		return false;
	}
	
	// Check building dependencies
	for (const dep of template.prerequisites.deps) {
		const hasDepBuilding = player.buildings.some(b => b.template.kind === dep);
		if (!hasDepBuilding) {
			return false;
		}
	}
	
	return true;
}

// Apply building effects when placing
export function applyBuildingPlacement(building: BuildingTemplate, player: Player): void {
	// Deduct cost
	player.resources.px -= building.cost_px;
	
	// Apply placement effects
	if (building.effects.on_place) {
		if (building.effects.on_place.palette_colors) {
			// Add new colors to palette (implementation would generate random colors)
			const newColors = building.effects.on_place.palette_colors;
			// Generate unique colors not already in palette
			const generatedColors = generateUniqueColors(newColors, player.palette.colors);
			generatedColors.forEach(color => player.palette.colors.add(color));
			console.log(`Adding ${newColors} colors to palette`);
		}
	}
	
	// Apply passive effects
	if (building.effects.passive) {
		if (building.effects.passive.px_cap) {
			player.storage_capacity += building.effects.passive.px_cap;
		}
	}
}

// Apply building tick effects (called during game loop)
export function applyBuildingTick(building: Building, player: Player): void {
	if (!building.template.effects.on_tick) return;
	
	const effects = building.template.effects.on_tick;
	
	if (effects.px_rate) {
		player.generation_rate += effects.px_rate;
	}
	
	if (effects.exp_rate) {
		player.resources.exp += effects.exp_rate;
	}
	
	if (effects.apx_rate) {
		player.resources.apx += effects.apx_rate;
	}
}

// Get buildings available for player's current tech level
export function getAvailableBuildings(player: Player): BuildingType[] {
	const available: BuildingType[] = [];
	
	for (const [buildingType, template] of Object.entries(BUILDINGS) as [BuildingType, BuildingTemplate][]) {
		if (canBuildBuilding(buildingType, player)) {
			available.push(buildingType);
		}
	}
	
	return available;
}

// Get buildings unlocked by placing a specific building
export function getBuildingsUnlockedBy(buildingType: BuildingType): BuildingType[] {
	const unlocked: BuildingType[] = [];
	
	for (const [type, template] of Object.entries(BUILDINGS) as [BuildingType, BuildingTemplate][]) {
		if (template.prerequisites.deps.includes(buildingType)) {
			unlocked.push(type);
		}
	}
	
	return unlocked;
}

// Calculate building's total tile footprint
export function getBuildingFootprint(building: BuildingTemplate): number {
	return building.size.width * building.size.height;
}

// Generate unique colors not already in the palette
function generateUniqueColors(count: number, existingColors: Set<string>): string[] {
	const newColors: string[] = [];
	const existingColorsArray = Array.from(existingColors);
	
	// Helper function to generate a random hex color
	const generateRandomColor = (): string => {
		const hue = Math.floor(Math.random() * 360);
		const saturation = Math.floor(Math.random() * 50) + 50; // 50-100%
		const lightness = Math.floor(Math.random() * 40) + 30; // 30-70%
		return hslToHex(hue, saturation, lightness);
	};
	
	// Helper function to convert HSL to Hex
	const hslToHex = (h: number, s: number, l: number): string => {
		l /= 100;
		const a = s * Math.min(l, 1 - l) / 100;
		const f = (n: number) => {
			const k = (n + h / 30) % 12;
			const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
			return Math.round(255 * color).toString(16).padStart(2, '0');
		};
		return `#${f(0)}${f(8)}${f(4)}`;
	};
	
	// Generate unique colors
	let attempts = 0;
	const maxAttempts = count * 100; // Prevent infinite loop
	
	while (newColors.length < count && attempts < maxAttempts) {
		attempts++;
		const color = generateRandomColor();
		
		// Check if color is unique (not in existing colors and not already generated)
		if (!existingColors.has(color) && !newColors.includes(color)) {
			newColors.push(color);
		}
	}
	
	// If we couldn't generate enough unique colors, fill with variations
	while (newColors.length < count) {
		if (existingColorsArray.length > 0) {
			// Take an existing color and create a slight variation
			const baseColor = existingColorsArray[newColors.length % existingColorsArray.length];
			const variation = generateColorVariation(baseColor);
			if (!existingColors.has(variation) && !newColors.includes(variation)) {
				newColors.push(variation);
			} else {
				// If variation conflicts, generate a completely random color
				const randomColor = generateRandomColor();
				if (!existingColors.has(randomColor) && !newColors.includes(randomColor)) {
					newColors.push(randomColor);
				}
			}
		} else {
			// If no existing colors, generate random colors
			const randomColor = generateRandomColor();
			if (!existingColors.has(randomColor) && !newColors.includes(randomColor)) {
				newColors.push(randomColor);
			}
		}
	}
	
	return newColors;
}

// Generate a slight variation of a color
function generateColorVariation(baseColor: string): string {
	// Convert hex to RGB
	const r = parseInt(baseColor.slice(1, 3), 16);
	const g = parseInt(baseColor.slice(3, 5), 16);
	const b = parseInt(baseColor.slice(5, 7), 16);
	
	// Apply small random variations (-20 to +20)
	const variance = (value: number) => {
		const newValue = value + Math.floor(Math.random() * 41) - 20;
		return Math.min(255, Math.max(0, newValue));
	};
	
	// Convert back to hex
	const toHex = (value: number) => value.toString(16).padStart(2, '0');
	
	return `#${toHex(variance(r))}${toHex(variance(g))}${toHex(variance(b))}`;
}

// Get building display information for UI
export interface BuildingDisplayInfo {
	name: string;
	description: string;
	category: 'economy' | 'military' | 'tech' | 'utility';
	tier: number;
}

export function getBuildingDisplayInfo(buildingType: BuildingType): BuildingDisplayInfo {
	const template = getBuildingTemplate(buildingType);
	
	// Categorize buildings for UI organization
	const categories = {
		Base: 'economy',
		GenPx: 'economy', AdvGenPx: 'economy', QuantumPxFactory: 'economy',
		Storage: 'economy', MegaStorage: 'economy', CentralDepot: 'economy',
		ColorFactory: 'tech', PigmentFactory: 'tech', AlchemyLab: 'tech', ColossalColorLab: 'tech',
		Science: 'tech', Academy: 'tech', GlobalInstitute: 'tech', AbsoluteArchive: 'tech', CentralAI: 'tech',
		EXP_Mine: 'tech', CrystalExpMine: 'tech',
		PX2EXP: 'utility', EXP2PX: 'utility',
		AntiPxGen: 'military', AntiPxLab: 'military', ChaosTower: 'military', TotalAntiPxGen: 'military', AntimatterGen: 'military',
		Board: 'utility', WorldFortress: 'military'
	} as const;
	
	// Generate descriptions based on effects
	const descriptions = {
		Base: 'Foundation structure that unlocks other buildings',
		GenPx: 'Generates pixels over time',
		Storage: 'Increases pixel storage capacity',
		ColorFactory: 'Adds new colors to your palette',
		Science: 'Enables research and tech progression',
		EXP_Mine: 'Generates experience points',
		PX2EXP: 'Converts pixels to experience',
		EXP2PX: 'Converts experience to pixels',
		AntiPxGen: 'Generates anti-pixel for attacks',
		Board: 'Post messages to regional board',
		// T2+ descriptions
		AdvGenPx: 'Advanced pixel generator (3x rate)',
		MegaStorage: 'Large storage facility (5x capacity)',
		PigmentFactory: 'Advanced color production (+3 colors)',
		Academy: 'Accelerates research (2x speed)',
		// ... more descriptions for higher tiers
	} as any;
	
	return {
		name: buildingType.replace(/([A-Z])/g, ' $1').trim(),
		description: descriptions[buildingType] || 'Advanced building',
		category: categories[buildingType] || 'utility',
		tier: template.prerequisites.tech_tier
	};
}
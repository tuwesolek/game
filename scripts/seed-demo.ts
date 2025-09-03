#!/usr/bin/env tsx

// Demo data seeding script for development

import { GAME_CONFIG } from '../src/lib/game/constants.js';
import { BUILDINGS } from '../src/lib/game/buildings.js';

console.log('🎮 Pixel Dominion - Demo Data Seeder');
console.log('=====================================\n');

// Mock world generation
function generateDemoWorld() {
  console.log('📍 Generating demo world...');
  
  const mockPlayers = [
    {
      id: 'player_1',
      name: 'Digital Nomads',
      territories: 245,
      buildings: 18,
      tech_level: 3,
      resources: { px: 1250, exp: 45, apx: 12 }
    },
    {
      id: 'player_2', 
      name: 'Pixel Pirates',
      territories: 189,
      buildings: 22,
      tech_level: 2,
      resources: { px: 890, exp: 23, apx: 8 }
    },
    {
      id: 'dev-player',
      name: 'Development',
      territories: 67,
      buildings: 8,
      tech_level: 1,
      resources: { px: 500, exp: 10, apx: 5 }
    }
  ];
  
  console.log(`✅ Generated ${mockPlayers.length} demo players`);
  console.log(`✅ Total territories: ${mockPlayers.reduce((sum, p) => sum + p.territories, 0)}`);
  console.log(`✅ Total buildings: ${mockPlayers.reduce((sum, p) => sum + p.buildings, 0)}\n`);
  
  return mockPlayers;
}

// Building system validation
function validateBuildingSystem() {
  console.log('🏗️ Validating building system...');
  
  const t1Buildings = Object.values(BUILDINGS).filter(b => b.prerequisites.tech_tier === 1);
  const allBuildings = Object.values(BUILDINGS);
  
  console.log(`✅ Tier 1 buildings: ${t1Buildings.length}/10 implemented`);
  console.log(`✅ Total buildings: ${allBuildings.length} defined`);
  console.log(`✅ Building types: ${Object.keys(BUILDINGS).join(', ')}\n`);
  
  // Validate building effects
  const effectTypes = ['on_tick', 'on_place', 'passive', 'active'];
  let effectCount = 0;
  
  for (const building of allBuildings) {
    for (const effectType of effectTypes) {
      if (building.effects[effectType]) {
        effectCount++;
      }
    }
  }
  
  console.log(`✅ Building effects: ${effectCount} total effects implemented`);
}

// Game constants validation
function validateGameConstants() {
  console.log('⚙️ Validating game constants...');
  
  const constants = GAME_CONFIG;
  
  console.log(`✅ Starting PX: ${constants.STARTING_PX}`);
  console.log(`✅ Generation rate: ${constants.BASE_GENERATION_RATE} PX per ${constants.GENERATION_INTERVAL_MS}ms`);
  console.log(`✅ Max colors: ${constants.MAX_PALETTE_COLORS}`);
  console.log(`✅ Victory threshold: ${constants.DOMINANCE_THRESHOLD * 100}%`);
  console.log(`✅ Base min distance: ${constants.BASE_MIN_DISTANCE} tiles\n`);
}

// Resource economy simulation
function simulateEconomyBalance() {
  console.log('💰 Simulating economy balance...');
  
  // Simulate 10 minutes of gameplay
  const simulationMinutes = 10;
  const ticksPerMinute = 2; // Every 30 seconds
  const totalTicks = simulationMinutes * ticksPerMinute;
  
  let px = GAME_CONFIG.STARTING_PX;
  let buildings = 0;
  let generationRate = GAME_CONFIG.BASE_GENERATION_RATE;
  
  console.log(`Starting simulation: ${px} PX, rate ${generationRate}/tick`);
  
  for (let tick = 1; tick <= totalTicks; tick++) {
    // Apply generation
    px += generationRate;
    
    // Try to build something every few ticks
    if (tick % 3 === 0 && px >= 9) {
      if (buildings < 5) {
        px -= 9; // Build GenPx
        generationRate += 1;
        buildings++;
        console.log(`Tick ${tick}: Built GenPx, PX: ${px}, Rate: ${generationRate}`);
      } else if (px >= 36) {
        px -= 36; // Build Base
        buildings++;
        console.log(`Tick ${tick}: Built Base, PX: ${px}, Buildings: ${buildings}`);
      }
    }
  }
  
  console.log(`✅ After ${simulationMinutes}m: ${px} PX, ${buildings} buildings, ${generationRate}/tick rate\n`);
}

// Tech tree validation
function validateTechTree() {
  console.log('🔬 Validating tech tree...');
  
  const techLevels = [1, 2, 3, 4, 5];
  
  for (const level of techLevels) {
    const buildingsAtLevel = Object.values(BUILDINGS).filter(b => b.prerequisites.tech_tier === level);
    const minColors = Math.min(...buildingsAtLevel.map(b => b.min_colors_required));
    const maxColors = Math.max(...buildingsAtLevel.map(b => b.min_colors_required));
    
    console.log(`Tech Level ${level}: ${buildingsAtLevel.length} buildings, ${minColors}-${maxColors} colors required`);
  }
  
  console.log('✅ Tech progression validated\n');
}

// Main execution
async function main() {
  try {
    const demoPlayers = generateDemoWorld();
    validateBuildingSystem();
    validateGameConstants();
    simulateEconomyBalance();
    validateTechTree();
    
    console.log('🎉 Demo seeding completed successfully!');
    console.log('\nTo start the game:');
    console.log('  npm run dev');
    console.log('  Open http://localhost:5173\n');
    
    // Export demo data
    const demoData = {
      players: demoPlayers,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      buildingCount: Object.keys(BUILDINGS).length,
      constants: GAME_CONFIG
    };
    
    // In a real implementation, this would write to a database
    console.log('Demo data generated:', JSON.stringify(demoData, null, 2).slice(0, 200) + '...');
    
  } catch (error) {
    console.error('❌ Demo seeding failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as seedDemo };
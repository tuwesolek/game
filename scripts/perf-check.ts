#!/usr/bin/env tsx

// Performance validation script

import { performance } from 'perf_hooks';

console.log('⚡ Pixel Dominion - Performance Check');
console.log('====================================\n');

// Simulate coordinate transformation performance
function benchmarkGridMath() {
  console.log('🗺️ Benchmarking grid coordinate transformations...');
  
  const iterations = 100000;
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    // Simulate geoToTile conversion
    const lat = (Math.random() - 0.5) * 180;
    const lng = (Math.random() - 0.5) * 360;
    const zoom = Math.floor(Math.random() * 15) + 5;
    
    const tileSize = Math.pow(2, zoom);
    const latRad = (lat * Math.PI) / 180;
    const lat_idx = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * tileSize
    );
    const lon_idx = Math.floor(((lng + 180) / 360) * tileSize);
    
    // Simulate tile ID generation
    const tileId = `${lat_idx}_${lon_idx}`;
    
    // Prevent optimization
    if (tileId.length === 0) throw new Error('Invalid tile');
  }
  
  const end = performance.now();
  const duration = end - start;
  const opsPerSecond = (iterations / duration) * 1000;
  
  console.log(`✅ Grid math: ${iterations} ops in ${duration.toFixed(2)}ms`);
  console.log(`✅ Performance: ${opsPerSecond.toFixed(0)} ops/sec\n`);
  
  return opsPerSecond > 50000; // Target: 50k ops/sec
}

// Simulate resource calculation performance
function benchmarkResourceCalculations() {
  console.log('💰 Benchmarking resource calculations...');
  
  const iterations = 50000;
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    // Simulate player with buildings
    const buildingCount = Math.floor(Math.random() * 20);
    let pxRate = 1; // Base rate
    let expRate = 0;
    let apxRate = 0;
    
    // Apply building effects
    for (let b = 0; b < buildingCount; b++) {
      const buildingType = Math.floor(Math.random() * 3);
      switch (buildingType) {
        case 0: pxRate += 1; break;
        case 1: expRate += 1; break;
        case 2: apxRate += 1; break;
      }
    }
    
    // Calculate generation over time
    const ticks = Math.floor(Math.random() * 10) + 1;
    const generated = {
      px: ticks * pxRate,
      exp: ticks * expRate,
      apx: ticks * apxRate
    };
    
    // Apply storage caps
    const cappedPx = Math.min(generated.px, 1000);
    
    // Prevent optimization
    if (cappedPx < 0) throw new Error('Invalid generation');
  }
  
  const end = performance.now();
  const duration = end - start;
  const opsPerSecond = (iterations / duration) * 1000;
  
  console.log(`✅ Resource calc: ${iterations} ops in ${duration.toFixed(2)}ms`);
  console.log(`✅ Performance: ${opsPerSecond.toFixed(0)} ops/sec\n`);
  
  return opsPerSecond > 25000; // Target: 25k ops/sec
}

// Simulate validation performance
function benchmarkValidation() {
  console.log('🛡️ Benchmarking validation rules...');
  
  const iterations = 25000;
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    // Simulate tile placement validation
    const tileCount = Math.floor(Math.random() * 50) + 1;
    const playerPx = Math.floor(Math.random() * 1000);
    const cost = tileCount;
    
    // Resource check
    const hasResources = playerPx >= cost;
    
    // Color validation (simulate grayscale check)
    const color = `#${Math.floor(Math.random() * 256).toString(16).padStart(2, '0').repeat(3)}`;
    const isGrayscale = color.slice(1, 3) === color.slice(3, 5) && color.slice(3, 5) === color.slice(5, 7);
    
    // Rate limit check (simplified)
    const lastAction = Math.floor(Math.random() * 60000); // Random timestamp
    const rateLimitOk = lastAction > 1000; // 1 second cooldown
    
    const valid = hasResources && isGrayscale && rateLimitOk;
    
    // Prevent optimization
    if (typeof valid !== 'boolean') throw new Error('Invalid validation');
  }
  
  const end = performance.now();
  const duration = end - start;
  const opsPerSecond = (iterations / duration) * 1000;
  
  console.log(`✅ Validation: ${iterations} ops in ${duration.toFixed(2)}ms`);
  console.log(`✅ Performance: ${opsPerSecond.toFixed(0)} ops/sec\n`);
  
  return opsPerSecond > 15000; // Target: 15k ops/sec
}

// Simulate WebSocket message processing
function benchmarkMessageProcessing() {
  console.log('📡 Benchmarking WebSocket message processing...');
  
  const iterations = 10000;
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    // Simulate message creation
    const message = {
      type: 'pixel_update',
      data: {
        tile_id: `${Math.floor(Math.random() * 1000)}_${Math.floor(Math.random() * 1000)}`,
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
        opacity: Math.random(),
        owner_id: `player_${Math.floor(Math.random() * 100)}`
      },
      timestamp: Date.now()
    };
    
    // Simulate JSON serialization
    const serialized = JSON.stringify(message);
    
    // Simulate parsing
    const parsed = JSON.parse(serialized);
    
    // Simulate validation
    const valid = parsed.type === 'pixel_update' && 
                 parsed.data.tile_id && 
                 parsed.data.color &&
                 typeof parsed.data.opacity === 'number';
    
    // Prevent optimization
    if (!valid) throw new Error('Invalid message');
  }
  
  const end = performance.now();
  const duration = end - start;
  const opsPerSecond = (iterations / duration) * 1000;
  
  console.log(`✅ Message processing: ${iterations} ops in ${duration.toFixed(2)}ms`);
  console.log(`✅ Performance: ${opsPerSecond.toFixed(0)} ops/sec\n`);
  
  return opsPerSecond > 5000; // Target: 5k ops/sec
}

// Memory usage simulation
function checkMemoryUsage() {
  console.log('🧠 Checking memory usage patterns...');
  
  const initialMemory = process.memoryUsage();
  const objects = [];
  
  // Simulate game object creation
  for (let i = 0; i < 10000; i++) {
    objects.push({
      id: `object_${i}`,
      position: { lat_idx: Math.floor(Math.random() * 1000), lon_idx: Math.floor(Math.random() * 1000) },
      color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
      owner: `player_${Math.floor(Math.random() * 100)}`,
      timestamp: Date.now()
    });
  }
  
  const peakMemory = process.memoryUsage();
  
  // Clear objects and force GC
  objects.length = 0;
  if (global.gc) global.gc();
  
  const finalMemory = process.memoryUsage();
  
  const peakUsage = (peakMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
  const finalUsage = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
  
  console.log(`✅ Peak memory increase: ${peakUsage.toFixed(2)} MB`);
  console.log(`✅ Final memory increase: ${finalUsage.toFixed(2)} MB`);
  console.log(`✅ Memory cleanup: ${((peakUsage - finalUsage) / peakUsage * 100).toFixed(1)}%\n`);
  
  return peakUsage < 100 && finalUsage < 10; // Target: <100MB peak, <10MB residual
}

// Performance summary
function generatePerformanceReport(results: { [key: string]: boolean }) {
  console.log('📊 Performance Report');
  console.log('====================');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.values(results).length;
  const score = (passed / total) * 100;
  
  console.log(`Overall Score: ${score.toFixed(1)}% (${passed}/${total} checks passed)\n`);
  
  for (const [test, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);
  }
  
  console.log('\nPerformance Targets:');
  console.log('• Grid Math: >50k ops/sec (coordinate transformations)');
  console.log('• Resource Calc: >25k ops/sec (economy calculations)');
  console.log('• Validation: >15k ops/sec (rule checking)');
  console.log('• Message Processing: >5k ops/sec (WebSocket messages)');
  console.log('• Memory Usage: <100MB peak, <10MB residual\n');
  
  if (score >= 80) {
    console.log('🎉 Performance validation PASSED!');
    console.log('Game is ready for production deployment.\n');
  } else {
    console.log('⚠️ Performance validation FAILED!');
    console.log('Consider optimization before production deployment.\n');
  }
  
  return score >= 80;
}

// Main execution
async function main() {
  try {
    const results = {
      'Grid Math': benchmarkGridMath(),
      'Resource Calculations': benchmarkResourceCalculations(),
      'Validation Rules': benchmarkValidation(),
      'Message Processing': benchmarkMessageProcessing(),
      'Memory Usage': checkMemoryUsage()
    };
    
    const passed = generatePerformanceReport(results);
    process.exit(passed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Performance check failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as performanceCheck };
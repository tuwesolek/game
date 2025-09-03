# Pixel Dominion - Qwen AI Context

## Performance Optimization & Analysis Context

### System Performance Profile
Pixel Dominion is designed for high-performance real-time gameplay with the following targets:
- **Client FPS**: 60fps canvas rendering with 1000+ pixels
- **Server Throughput**: 100+ concurrent players
- **Network Latency**: <100ms WebSocket round-trip
- **Memory Usage**: <200MB client-side stable over 1+ hour sessions
- **Mobile Performance**: Smooth on mid-range devices (iPhone 12, Galaxy S21)

### Critical Performance Bottlenecks & Solutions

#### 1. Canvas Rendering Performance
**Location**: `/src/components/Map.svelte` - `redrawPixels()` and `redrawGrid()`

**Optimization Strategy**:
```typescript
// Batch pixel updates in 16ms intervals (60fps)
let pixelUpdateQueue: PixelUpdate[] = [];
let renderRequestId: number;

function batchPixelUpdates() {
  const batchSize = 50; // Optimal batch size found through testing
  const batch = pixelUpdateQueue.splice(0, batchSize);
  
  if (batch.length > 0) {
    renderPixelBatch(batch);
  }
  
  if (pixelUpdateQueue.length > 0) {
    renderRequestId = requestAnimationFrame(batchPixelUpdates);
  }
}
```

**Memory Optimization**:
- Reuse canvas contexts instead of creating new ones
- Implement pixel culling for off-screen elements
- Use object pooling for frequently created/destroyed objects

#### 2. WebSocket Message Optimization
**Location**: `/src/lib/ws.ts` - Message handling and subscription system

**Throughput Optimization**:
```typescript
// Message compression and batching
const MESSAGE_BATCH_SIZE = 10;
const BATCH_INTERVAL = 16; // ~60fps

class OptimizedWebSocket {
  private messageQueue: WSMessage[] = [];
  private batchTimer?: NodeJS.Timeout;

  private batchMessages() {
    if (this.messageQueue.length === 0) return;
    
    // Compress similar messages
    const compressed = this.compressMessages(this.messageQueue);
    this.sendBatch(compressed);
    this.messageQueue = [];
  }

  private compressMessages(messages: WSMessage[]): WSMessage[] {
    // Merge pixel updates for same tile
    const pixelUpdates = new Map<string, PixelUpdate>();
    const otherMessages: WSMessage[] = [];
    
    for (const msg of messages) {
      if (msg.type === 'pixel_update') {
        pixelUpdates.set(msg.data.tile_id, msg.data);
      } else {
        otherMessages.push(msg);
      }
    }
    
    return [...otherMessages, ...Array.from(pixelUpdates.values())];
  }
}
```

#### 3. State Management Efficiency
**Location**: `/src/lib/store.ts` - Svelte store optimization

**Reactive Update Optimization**:
```typescript
// Minimize reactive computations
import { derived, writable } from 'svelte/store';

// Use selective updates to prevent cascade re-renders
export const optimizedPlayerUpdate = writable(
  initialPlayer,
  (set) => {
    // Only update specific fields that changed
    return (updates: Partial<Player>) => {
      set(current => {
        // Deep comparison to avoid unnecessary updates
        if (isEqual(current, { ...current, ...updates })) {
          return current;
        }
        return { ...current, ...updates };
      });
    };
  }
);

// Debounce expensive derived calculations
export const dominanceScore = derived(
  [playerTerritories, worldTiles],
  ([$territories, $world], set) => {
    const debounced = debounce(() => {
      set(calculateDominance($territories, $world));
    }, 100);
    debounced();
  }
);
```

#### 4. Memory Leak Prevention
**Critical Areas**: Event listeners, intervals, WebSocket connections

**Cleanup Strategy**:
```typescript
// Component lifecycle management
onMount(() => {
  const interval = setInterval(gameLoop, 30000);
  const wsConnection = setupWebSocket();
  const mapEventHandler = map.on('moveend', handleMapMove);
  
  return () => {
    // Critical: Clean up all subscriptions
    clearInterval(interval);
    wsConnection.disconnect();
    map.off('moveend', mapEventHandler);
  };
});

// Memory pool for frequently created objects
class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  
  constructor(createFn: () => T, initialSize: number = 10) {
    this.createFn = createFn;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createFn());
    }
  }
  
  acquire(): T {
    return this.pool.pop() || this.createFn();
  }
  
  release(obj: T): void {
    // Reset object state if needed
    this.resetObject(obj);
    this.pool.push(obj);
  }
}
```

### Performance Monitoring Implementation

#### Client-Side Performance Tracking
```typescript
// Performance metrics collection
class PerformanceMonitor {
  private metrics = {
    fps: 0,
    renderTime: 0,
    memoryUsage: 0,
    wsLatency: 0
  };

  startFrameMonitoring() {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const updateFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        this.metrics.fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        
        // Alert if FPS drops below threshold
        if (this.metrics.fps < 30) {
          this.onPerformanceWarning('Low FPS detected');
        }
      }
      
      requestAnimationFrame(updateFPS);
    };
    
    requestAnimationFrame(updateFPS);
  }

  measureRenderTime<T>(renderFn: () => T): T {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();
    
    this.metrics.renderTime = end - start;
    return result;
  }

  measureMemoryUsage() {
    if ('memory' in performance) {
      // @ts-ignore - Chrome specific API
      const memory = performance.memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize;
    }
  }
}
```

### Algorithm Optimization Opportunities

#### 1. Spatial Indexing for Collision Detection
```typescript
// R-tree for efficient spatial queries
class SpatialIndex {
  private tree = new RTree();
  
  insertBuilding(building: Building) {
    const bbox = this.getBoundingBox(building);
    this.tree.insert(bbox, building);
  }
  
  findConflicts(position: TileCoord, size: BuildingSize): Building[] {
    const query = {
      minX: position.lon_idx,
      minY: position.lat_idx,
      maxX: position.lon_idx + size.width,
      maxY: position.lat_idx + size.height
    };
    
    return this.tree.search(query);
  }
}
```

#### 2. Efficient Path Finding for APX Attacks
```typescript
// A* algorithm for optimal attack paths
class PathFinder {
  findAttackPath(
    start: TileCoord, 
    target: TileCoord, 
    obstacles: Set<TileId>
  ): TileCoord[] {
    const openSet = new PriorityQueue<PathNode>();
    const closedSet = new Set<string>();
    
    // Heuristic: Manhattan distance
    const heuristic = (a: TileCoord, b: TileCoord) => 
      Math.abs(a.lat_idx - b.lat_idx) + Math.abs(a.lon_idx - b.lon_idx);
    
    // A* implementation optimized for game grid
    // Returns optimal path considering terrain and defenses
  }
}
```

### Build Optimization Configuration

#### Vite Bundle Analysis
```typescript
// vite.config.ts optimization
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'maplibre': ['maplibre-gl'],
          'game-logic': [
            './src/lib/game/buildings.ts',
            './src/lib/game/economy.ts',
            './src/lib/game/rules.ts'
          ],
          'ui-components': [
            './src/components/Map.svelte',
            './src/components/Toolbar.svelte'
          ]
        }
      }
    },
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
```

#### Docker Image Optimization
```dockerfile
# Multi-stage optimization for minimal image size
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --frozen-lockfile

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --frozen-lockfile
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
RUN addgroup -g 1001 -S nodejs && adduser -S pixeldominion -u 1001
WORKDIR /app
COPY --from=dependencies --chown=pixeldominion:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=pixeldominion:nodejs /app/build ./build
COPY --from=build --chown=pixeldominion:nodejs /app/package.json ./
USER pixeldominion
EXPOSE 3000
CMD ["node", "build"]
```

### Performance Testing Strategy

#### Load Testing Configuration
```typescript
// Performance test scenarios
const PERFORMANCE_TESTS = {
  // Simulate 100 concurrent users placing pixels
  concurrentPixelPlacement: {
    users: 100,
    duration: '5m',
    rampUp: '30s',
    actions: ['place_territory', 'place_building', 'convert_resources']
  },
  
  // Test WebSocket message throughput
  realtimeMessageLoad: {
    connections: 200,
    messageRate: '10/s',
    messageTypes: ['pixel_update', 'building_placed', 'resource_update']
  },
  
  // Memory leak detection
  longRunningSession: {
    duration: '2h',
    actions: 'continuous_gameplay',
    memoryThreshold: '300MB',
    gcPressure: 'monitor'
  }
};
```

### Optimization Checklist for Development

#### Before Each Release:
1. **Bundle Analysis**: Check chunk sizes with `npm run build:analyze`
2. **Memory Profiling**: Use Chrome DevTools heap snapshots
3. **Network Analysis**: Measure WebSocket message frequency
4. **Mobile Testing**: Verify performance on target devices
5. **Load Testing**: Run concurrent user simulations
6. **Lighthouse Audit**: Maintain >90 performance score

#### Continuous Monitoring:
- **Real User Monitoring**: Track FPS, memory usage in production
- **Error Rate Monitoring**: Watch for performance-related errors
- **WebSocket Health**: Monitor connection drops and latency
- **Server Resource Usage**: CPU, memory, network utilization

This context provides Qwen with the specific performance optimization knowledge needed to maintain and improve the game's real-time performance characteristics.
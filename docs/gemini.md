# Pixel Dominion - Gemini AI Context

## System Design Overview
Pixel Dominion is a production-ready real-time strategy game built with modern web technologies, emphasizing scalable architecture and clean code patterns.

## Technical Stack & Rationale

### Frontend Architecture
- **SvelteKit**: Chosen for reactive state management and excellent developer experience
- **TypeScript**: Ensures type safety across the entire codebase
- **TailwindCSS**: Utility-first styling with dark theme optimization
- **MapLibre GL JS**: High-performance vector tile rendering with WebGL acceleration

### Game Engine Design
- **Entity-Component System**: Buildings, players, and tiles as typed entities
- **Reactive State Management**: Svelte stores with derived computed properties  
- **Functional Game Logic**: Pure functions for economy, validation, and scoring
- **Event-Driven Architecture**: WebSocket events for real-time synchronization

### Data Flow & State Management
```typescript
// Centralized store pattern
Player State → UI Components → User Actions → Validation → API → WebSocket → World State → UI Update
```

## Core Game Mechanics Implementation

### Resource Economy System
Located in `/src/lib/game/economy.ts`:
- **Generation Formula**: `base_rate * (1 + building_multipliers) * tick_elapsed`
- **Storage Limits**: Prevents infinite accumulation, creates strategic pressure
- **Conversion Rates**: 10 PX → 1 EXP → 8 PX (slight loss encourages specialization)

### Building System Architecture
- **Template Pattern**: Reusable building definitions with effects composition
- **Tech Tree Dependencies**: Graph-based prerequisite system
- **Effect System**: `on_tick`, `on_place`, `passive`, `active` effect types
- **Validation Pipeline**: Prerequisites → Resources → Placement → Effects

### Anti-Griefing & Game Balance
- **Rate Limiting**: Per-region, per-player restrictions using token bucket algorithm
- **Economic Pressure**: Progressive costs and diminishing returns
- **Spatial Constraints**: Minimum base distances, building footprint validation
- **APX Combat System**: Rock-paper-scissors balance with cooldowns

## Code Organization Principles

### Domain-Driven Design
```
/src/lib/game/     # Core game logic (pure functions)
/src/lib/map/      # Geographic/spatial systems
/src/components/   # UI presentation layer
/src/routes/api/   # Server endpoints with validation
```

### Type Safety Strategy
- **Strict TypeScript**: No `any` types, comprehensive interfaces
- **Zod Validation**: Runtime type checking for API boundaries
- **Domain Types**: Separate types for UI state vs game state vs API contracts

### Performance Optimization
- **Canvas Rendering**: 60fps pixel overlay with optimized redraw cycles
- **Tile Sharding**: Spatial partitioning for efficient WebSocket subscriptions
- **Reactive Updates**: Only re-render components when relevant state changes
- **Memory Management**: Proper cleanup of intervals, event listeners, WebSocket connections

## Development Patterns

### Error Handling Strategy
```typescript
// API Response Pattern
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

// Validation Result Pattern  
interface ValidationResult {
  valid: boolean;
  error?: string;
  cost?: number;
  affected_tiles?: TileId[];
}
```

### State Update Patterns
- **Immutable Updates**: Never mutate state directly, always create new objects
- **Atomic Operations**: Group related state changes together
- **Optimistic UI**: Show changes immediately, reconcile with server later
- **Error Recovery**: Rollback optimistic updates on validation failure

### WebSocket Message Architecture
- **Type-Safe Events**: Discriminated unions for message types
- **Backpressure Handling**: Drop/merge rapid updates to prevent lag
- **Reconnection Strategy**: Exponential backoff with maximum attempts
- **Shard Subscriptions**: Subscribe only to visible map regions

## Testing Strategy

### Unit Testing Priorities
1. **Game Logic Functions**: Economy calculations, validation rules
2. **State Management**: Store updates, derived values
3. **API Contracts**: Request/response validation with zod
4. **Utility Functions**: Grid math, coordinate transformations

### Integration Testing Scenarios
- **Pixel Placement Flow**: UI → Validation → API → WebSocket → State Update
- **Building Construction**: Resource check → Placement validation → Effect application
- **Resource Generation**: Timer → Building effects → Storage limits → UI update

### Performance Testing Targets
- **Canvas Rendering**: Maintain 60fps with 1000+ pixels visible
- **WebSocket Throughput**: Handle 100+ concurrent players
- **Memory Usage**: Stable memory profile over 1+ hour sessions
- **Mobile Performance**: Smooth operation on mid-range devices

## Deployment & Scaling Considerations

### Docker Production Setup
- **Multi-stage Build**: Separate build and runtime environments
- **Security**: Non-root user, minimal attack surface
- **Health Checks**: Application-level monitoring endpoints
- **Resource Limits**: CPU/memory constraints for container orchestration

### CDN & Caching Strategy
- **Static Assets**: Immutable caching for hashed files
- **API Responses**: Short-lived cache for leaderboard, stats
- **Tile Data**: Aggressive caching for OpenFreeMap vector tiles
- **WebSocket**: Direct connection, bypass CDN for real-time data

### Monitoring & Observability
- **Performance Metrics**: Frame rate, WebSocket latency, API response times
- **Game Metrics**: Player actions, resource generation, territory changes
- **Error Tracking**: Client-side errors, validation failures, connection issues
- **Business Metrics**: Player retention, session duration, feature usage

## AI Reasoning Guidelines

When working with this codebase:

1. **Preserve Game Balance**: Any changes should maintain economic equilibrium
2. **Maintain Type Safety**: Always use proper TypeScript types and interfaces
3. **Follow Reactive Patterns**: Use Svelte stores and derived values appropriately
4. **Validate Thoroughly**: Never trust client input, validate at API boundaries
5. **Optimize for Real-time**: Consider WebSocket message frequency and size
6. **Think Mobile-First**: Ensure touch-friendly interfaces and responsive design
7. **Document Decisions**: Complex game logic should include reasoning comments

## Expansion Opportunities

### Short-term Enhancements
- **Alliance System**: Shared resources, coordinated attacks, diplomatic mechanics
- **Tech Tree Expansion**: Complete T2-T5 building implementations
- **NPC Opponents**: AI players with different strategies and difficulty levels
- **Spectator Mode**: Watch games without participating, learning tool

### Long-term Vision
- **Persistent World**: Database-backed world state, player progression
- **Tournament System**: Scheduled competitions, leaderboards, prizes
- **Custom Game Modes**: Different victory conditions, map sizes, rule sets
- **Mobile App**: Native iOS/Android with push notifications

The architecture supports these expansions through its modular design and clear separation of concerns.
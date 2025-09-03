# Pixel Dominion - Grok AI Context

## Project Overview
Real-time pixel-based RTS game inspired by r/place mechanics with territory control, building system, and multiplayer combat.

## Architecture
- **Frontend**: SvelteKit + TypeScript + TailwindCSS
- **Map**: MapLibre GL JS + OpenFreeMap vector tiles
- **Realtime**: WebSocket (development mock server)
- **State**: Svelte stores + reactive patterns
- **API**: RESTful endpoints with zod validation
- **Deployment**: Docker multi-stage + Node.js adapter

## Core Game Loop
1. **Resource Generation**: Base rate 1 PX/30s + building multipliers
2. **Pixel Placement**: Territory (grayscale) vs Buildings (colored)
3. **Building System**: T1 fully implemented, T2-T5 data stubs
4. **Combat**: APX (anti-pixel) attacks with cooldowns/resistance
5. **Victory**: 25% world dominance OR rival elimination

## Key Files Structure
```
/src/lib/
├── game/
│   ├── constants.ts     # Single source of truth for balance
│   ├── buildings.ts     # T1 complete, T2-T5 templates
│   ├── economy.ts       # Resource generation/conversion
│   └── rules.ts         # Validation + anti-grief
├── map/
│   ├── grid.ts          # Tile coordinate system  
│   └── theme.ts         # MapLibre customization
├── components/          # Svelte UI components
├── store.ts            # Game state management
├── api.ts              # Client API with zod validation
└── ws.ts               # WebSocket client with backoff
```

## Development State
- ✅ Complete T1 gameplay loop
- ✅ Pixel placement with validation
- ✅ Real-time multiplayer foundation
- ✅ Mobile-responsive UI
- ⚠️ T2-T5 buildings need implementation
- ⚠️ Persistent world state needed
- ⚠️ Production WebSocket server needed

## Building & Reasoning Guide

### When Debugging Map Issues:
- Check `/src/lib/map/grid.ts` for coordinate transformations
- MapLibre styles in `/config/maplibre-style.json`
- Canvas overlay rendering in `Map.svelte`

### When Implementing New Buildings:
1. Add template to `/src/lib/game/buildings.ts`
2. Update prerequisites in tech tree
3. Add effects to economy system
4. Update UI components for new building type

### When Fixing Game Balance:
- Modify `/src/lib/game/constants.ts` (single source of truth)
- Test with `/src/lib/game/economy.ts` calculations
- Validate via `/src/lib/game/rules.ts` anti-grief systems

### When Adding Features:
1. Domain types in `/src/lib/types.ts`
2. State management in `/src/lib/store.ts`
3. API endpoints in `/src/routes/api/`
4. UI components in `/src/components/`
5. Update WebSocket handlers if realtime needed

## Critical Invariants
- Territory MUST be grayscale only
- Buildings MUST be colored only
- Cost = exact pixel count placed
- Base minimum distance = 50 tiles
- Storage capacity enforced
- Rate limiting per region active
- Tech tier gates building placement

## Performance Considerations
- Canvas rendering @ 60fps target
- Tile-sharded WebSocket subscriptions
- Batched pixel updates (16ms intervals)
- Optimize for mobile (44px touch targets)
- CDN cache for static assets (immutable headers)

## Deployment
```bash
# Development
npm run dev

# Production build
docker build -t pixel-dominion .
docker run -p 3000:3000 pixel-dominion

# Environment variables
PUBLIC_TILE_STYLE_URL=https://tiles.openfreemap.org/styles/bright
PUBLIC_WS_URL=ws://localhost:5173/ws
PUBLIC_COOLDOWN_SECONDS=30
```

## Reasoning Priority
1. **Game Balance First**: Any changes should consider economic balance
2. **Real-time Consistency**: WebSocket updates must be atomic
3. **Anti-Griefing**: Rate limits and validation are non-negotiable
4. **Mobile Performance**: Touch targets and 60fps rendering
5. **Accessibility**: Keyboard navigation and ARIA labels

## Next Development Steps
1. Complete T2-T5 building effects implementation
2. Add persistent world state (database integration)
3. Implement advanced alliance mechanics
4. Add NPC/AI opponent system
5. Create spectator mode
6. Optimize for larger player counts (1000+)

Use this context when reasoning about game mechanics, debugging issues, or implementing new features. The codebase prioritizes correctness over cleverness - clear, testable code that maintains game balance.
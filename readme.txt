================================================================================
                             PIXEL DOMINION v1.0.0
                         Real-time Pixel-based RTS Game
================================================================================

PROJECT OVERVIEW
================

Pixel Dominion is a production-ready first playable of a real-time strategy 
game inspired by r/place mechanics. Players compete for world domination 
through strategic pixel placement, building construction, and resource 
management on an interactive world map.

ARCHITECTURE OVERVIEW
====================

Frontend Stack:
- SvelteKit + TypeScript + TailwindCSS (reactive UI framework)
- MapLibre GL JS + OpenFreeMap (vector tile mapping engine)
- WebSocket client with reconnection logic (real-time multiplayer)
- Svelte stores for reactive state management
- Zod validation for API contracts

Backend/Server:
- Node.js adapter for SvelteKit (production server)
- WebSocket mock server for development (tile-sharded updates)
- RESTful API endpoints with validation
- Docker multi-stage build for deployment

Game Engine:
- Entity-component system for buildings, players, tiles
- Pure functional game logic (economy, rules, validation)
- Event-driven architecture for real-time synchronization
- Anti-griefing systems with rate limiting

GAME LOOP MECHANICS
==================

1. Resource Generation
   - Base: +1 PX per 30 seconds
   - Buildings multiply generation rates
   - Storage capacity limits prevent infinite accumulation

2. Territory Control  
   - Territory: Grayscale pixels only (1 PX per pixel)
   - Buildings: Colored structures with special effects
   - Ownership: First to place claims tile

3. Building System
   - Tier 1: Complete implementation (10 building types)
   - Tier 2-5: Data templates with placeholder effects
   - Tech progression: Color requirements gate higher tiers
   - Dependencies: Buildings unlock other buildings

4. Combat System (APX)
   - Anti-pixel attacks to erase enemy territory
   - Multiple attack shapes: point, line, area, building
   - Cooldowns and resistance mechanics prevent spam

5. Victory Conditions
   - Dominance: Control ≥25% of active world tiles
   - Elimination: All opponents lose their bases

TECH TREE DIAGRAM
================

                                   Base (6x6)
                                       |
        +-----------+-----------+-----+-----+-----------+-----------+
        |           |           |           |           |           |
      GenPx      Storage   ColorFactory  Science    EXP_Mine    AntiPxGen
      (3x3)      (3x3)      (3x3)       (5x5)      (4x4)       (4x4)
        |          |           |           |           |           |
    AdvGenPx   MegaStorage  PigmentFac   Academy   CrystalExp   AntiPxLab
    [Tier 2]   [Tier 2]    [Tier 2]     [Tier 2]  [Tier 3]    [Tier 3]
        |          |           |           |           |           |
   QuantumPx   CentralDep   AlchemyLab   GlobalInst    |      ChaosTower
   [Tier 4]   [Tier 3]     [Tier 3]     [Tier 3]     |      [Tier 4]
        |          |           |           |           |           |
   WorldFortress   |      ColossalLab  AbsoluteArch    |    TotalAntiPx
   [Tier 5]        |      [Tier 4]     [Tier 4]       |     [Tier 5]
                   |           |           |           |           |
                   |           |      CentralAI       |    AntimatterGen
                   |           |      [Tier 5]        |     [Tier 5]
                   |           |                      |
                PX2EXP ←→ EXP2PX              Board (independent)
                (3x3)     (3x3)               (3x3)

RUNNING LOCALLY
==============

Development Mode:
1. npm install
2. npm run dev  
3. Open http://localhost:5173

Production Build:
1. npm run build
2. npm run preview
3. Open http://localhost:4173

Docker Deployment:
1. docker build -t pixel-dominion .
2. docker run -p 3000:3000 pixel-dominion
3. Open http://localhost:3000

Demo & Testing:
- npm run seed-demo    (validate game systems)
- npm run perf-check   (performance benchmarks)

ENVIRONMENT VARIABLES
====================

Required for production:
- PUBLIC_TILE_STYLE_URL: OpenFreeMap tile server URL
- PUBLIC_WS_URL: WebSocket server endpoint
- PUBLIC_COOLDOWN_SECONDS: Global cooldown timer

Example .env file:
PUBLIC_TILE_STYLE_URL=https://tiles.openfreemap.org/styles/bright
PUBLIC_TILE_API_URL=https://tiles.openfreemap.org
PUBLIC_WS_URL=ws://37.60.229.209/ws
PUBLIC_COOLDOWN_SECONDS=30

CLOUDFLARE CACHE OPTIMIZATION
============================

For optimal performance with Cloudflare CDN, configure these cache rules:

Static Assets (JS, CSS, images):
Cache-Control: public, max-age=31536000, immutable

Map Tiles:
Cache-Control: public, max-age=86400, s-maxage=86400

API Responses:
Cache-Control: public, max-age=60, s-maxage=300

WebSocket Connections:
Bypass CDN, connect directly to origin server

LICENSING & ATTRIBUTION
=======================

Game Code: MIT License
Map Data: © OpenFreeMap contributors (ODbL)
Base Map: © OpenStreetMap contributors (ODbL)
Fonts: JetBrains Mono (SIL OFL 1.1)

Required Attribution:
"Map data © OpenFreeMap contributors"
Must be visible in application UI

KNOWN GAPS & LIMITATIONS
========================

Technical Limitations:
- T2-T5 building effects are data stubs only
- WebSocket server is development mock (not production-ready)
- No persistent database (state resets on server restart)
- Alliance system is basic implementation
- No user authentication or sessions

Performance Limitations:
- Client-side state management (not suitable for >100 concurrent players)
- Canvas rendering may struggle with >1000 active pixels
- No server-side validation of game rules
- Basic rate limiting (memory-based, not persistent)

Feature Gaps:
- No AI/NPC opponents
- No spectator mode or replays  
- No tournament or competitive modes
- No mobile native apps (PWA only)
- No achievement or progression system

Production Deployment Gaps:
- No server-side anti-cheat validation
- No database persistence layer
- No user account system
- No admin/moderation tools
- No monitoring/analytics integration

DEVELOPMENT NEXT STEPS
=====================

Immediate (Production Readiness):
1. Implement persistent database backend
2. Replace mock WebSocket server with production implementation
3. Add user authentication and session management
4. Implement server-side game rule validation
5. Add comprehensive test suite (unit + integration)

Short-term (Enhanced Gameplay):
1. Complete T2-T5 building effect implementations
2. Expand alliance system with shared resources and diplomacy
3. Add AI/NPC opponent system with different difficulty levels
4. Implement spectator mode and replay functionality
5. Add achievement and progression systems

Long-term (Platform Features):
1. Tournament and competitive mode systems
2. Custom game modes and private servers
3. Native mobile apps (iOS/Android)
4. Advanced analytics and player behavior tracking
5. Modding support and community tools

This codebase provides a solid foundation for a production RTS game with
clean architecture, modern web technologies, and scalable design patterns.
The first playable demonstrates core mechanics while leaving clear paths
for feature expansion and production deployment.

================================================================================
Built with SvelteKit, MapLibre GL JS, and modern web technologies
© 2024 Pixel Dominion Team - MIT License
================================================================================
# Pixel Dominion 🎮

> Real-time pixel-based RTS inspired by r/place mechanics

A production-ready first playable of Pixel Dominion, featuring territory control, building mechanics, and real-time multiplayer gameplay on an interactive pixel art canvas.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/pixel-dominion/game) [![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE) [![PWA Ready](https://img.shields.io/badge/PWA-ready-purple)](static/manifest.webmanifest)

## 🚀 Quick Start

### Development
```bash
# Clone and install
git clone <repository-url>
cd pixel-dominion
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

### Production (Docker)
```bash
# Build and run
docker build -t pixel-dominion .
docker run -p 3000:3000 pixel-dominion

# Open http://localhost:3000
```

## 🎯 Game Overview

### Objective
Control 25% of the world map or eliminate all opponents through strategic territory expansion and building construction.

### Core Mechanics
- **Territory Drawing**: Grayscale pixels for claiming land (1 PX per pixel)
- **Building Placement**: Colored structures with special effects
- **Resource Management**: PX (currency), EXP (research), APX (combat)
- **Real-time Multiplayer**: Live pixel updates via WebSocket
- **Tech Progression**: 5-tier building system with prerequisites

### Victory Conditions
- **Dominance**: Control ≥25% of active world tiles
- **Elimination**: All opponents lose their bases
- **Defeat**: Your bases destroyed OR no resource generation for 5+ minutes

## 🏗️ Architecture

### Tech Stack
- **Frontend**: SvelteKit + TypeScript + TailwindCSS
- **Canvas Rendering**: HTML5 Canvas for pixel grid
- **Real-time**: WebSocket with reconnection & backoff
- **State**: Svelte stores with reactive patterns
- **Validation**: Zod schemas for API contracts
- **Deployment**: Docker multi-stage build

### Project Structure
```
src/
├── lib/
│   ├── game/           # Core game logic
│   │   ├── buildings.ts    # T1 complete, T2-T5 stubs
│   │   ├── economy.ts      # Resource generation
│   │   ├── rules.ts        # Validation & anti-grief
│   │   └── constants.ts    # Game balance config
│   ├── map/            # Spatial systems
│   │   └── grid.ts         # Tile coordinate system
│   ├── components/     # Svelte UI components
│   ├── store.ts        # State management
│   ├── api.ts          # Client API with validation
│   ├── ws.ts           # WebSocket client
│   └── types.ts        # TypeScript definitions
├── routes/
│   ├── api/            # Server endpoints
│   └── +page.svelte    # Main game interface
└── styles/app.css      # Global styling
```

## Frontend Architecture: Pixel Canvas

### Overview
The application now features a collaborative pixel art canvas, similar to wplace.live. It's a grid-based system where users can "paint" pixels on a shared digital space. The previous geographic map background has been replaced with this pixel-art-focused interface.

### Key Components
- **`src/lib/components/Map.svelte`**: This is the central Svelte component responsible for rendering and interacting with the pixel grid. It utilizes three HTML5 Canvas elements:
    - `pixelCanvas`: Draws the actual colored pixels based on the `worldState`.
    - `gridCanvas`: Renders a grid overlay, visible at higher zoom levels, to delineate individual pixels.
    - `cursorCanvas`: Displays a real-time cursor preview, showing the currently hovered tile and the selected painting color.
  This component also handles all user input for panning, zooming, and painting, translating screen coordinates into logical tile coordinates.

- **`src/lib/map/grid.ts`**: This file provides a simplified, non-geographic tile coordinate system. Its functions are designed for managing a grid of abstract tiles, including:
    - `tileId(coord)`: Generates a unique string identifier for a given tile coordinate (e.g., "lat_idx_lon_idx").
    - `parseTileId(id)`: Converts a tile ID string back into its `TileCoord` object.
    - `tileDistance(a, b)`: Calculates the Euclidean distance between two tile coordinates.
    - `getAdjacentTiles(coord)`: Returns an array of the 8 tiles immediately surrounding a given tile.
    - `getTileArea(center, width, height)`: Returns all tile coordinates within a specified rectangular area around a center tile.
    - `getShardId(coord)`: Determines the shard ID for a tile, used for efficient data management.
    - `isAreaClear(...)`: Utility for checking if a given area of tiles is unoccupied.
  Crucially, this module no longer contains any functions for converting between geographic coordinates (latitude/longitude) and tile coordinates, as the map is no longer tied to real-world geography.

- **`src/lib/store.ts`**: This Svelte store manages the global application state. Key parts relevant to the pixel canvas include:
    - `worldState`: A writable store containing the game world data, most notably `worldState.tiles`, which is a `Map<TileId, Tile>` storing the color and other properties of each pixel on the canvas.
    - `uiState`: A writable store for UI-specific states, such as the currently `selected_tool` (e.g., 'territory' for painting), `selected_color`, and the current `zoom_level`.

- **`src/lib/ws.ts`**: This module handles real-time communication with the backend server using WebSockets. It is responsible for:
    - Sending `pixel_update` messages to the server whenever a user paints a pixel, informing the backend of the `tile_id`, `color`, and `opacity`.
    - Receiving `world_state` updates and individual `pixel_update` messages from the server, which then trigger updates to the local `worldState` store, ensuring all clients see the same canvas state.

### Interaction Flow
1.  **User Input**: Mouse clicks, drags, and wheel scrolls on the canvas are captured by `Map.svelte`.
2.  **Coordinate Translation**: `Map.svelte` translates the screen coordinates of user input into logical tile coordinates (lat_idx, lon_idx) based on the current pan and zoom levels.
3.  **Painting**: When a user paints a pixel (e.g., by clicking or dragging in 'territory' mode):
    -   `Map.svelte` immediately updates the local `worldState` via `gameActions.updateTile` for instant visual feedback.
    -   A `pixel_update` message is sent via WebSocket (`ws.sendPixelUpdate`) to the backend server, notifying it of the change.
4.  **Rendering Loop**: A `requestAnimationFrame` loop in `Map.svelte` continuously redraws the canvas:
    -   The `pixelCanvas` is drawn by iterating over the `worldState.tiles` data and rendering each tile with its assigned color and opacity, applying the current pan and zoom transformations.
    -   The `gridCanvas` is drawn to show pixel boundaries when zoomed in sufficiently.
    -   The `cursorCanvas` provides a visual indicator of the currently hovered tile and the selected color.
5.  **Panning and Zooming**: These actions are implemented by dynamically adjusting `panX`, `panY`, and `zoom` variables within `Map.svelte`. These values are then used to transform the drawing context of all three canvases, creating the visual effect of moving and scaling the pixel art canvas.

## 🎮 Gameplay Features

### Building System (Tier 1 Complete)
| Building | Size | Cost | Effect |
|----------|------|------|--------|
| Base | 6×6 | 36 PX | Unlocks all other buildings |
| GenPx | 3×3 | 9 PX | +1 pixel generation/30s |
| Storage | 3×3 | 9 PX | +100 pixel capacity |
| ColorFactory | 3×3 | 9 PX | +1 available color |
| Science | 5×5 | 25 PX | Enables research |
| EXP_Mine | 4×4 | 16 PX | +1 EXP/30s |
| PX2EXP/EXP2PX | 3×3 | 9 PX | Resource conversion |
| AntiPxGen | 4×4 | 16 PX | +1 APX/30s |
| Board | 3×3 | 9 PX | Post regional messages |

### Resource Economy
- **Starting Resources**: 30 PX, 8 colors, +1 PX/30s
- **Storage Limits**: Prevent infinite accumulation
- **Conversion Rates**: 10 PX → 1 EXP → 8 PX (slight loss)
- **Building Effects**: Multiplicative generation bonuses

### Combat System (APX)
- **Attack Shapes**: Point (1px), Line (5px), Area (9px), Building (25px)
- **Cooldowns**: Shape-specific to prevent spam
- **Resistance**: Based on enemy defensive buildings
- **Success Rate**: APX cost vs enemy defenses

### Anti-Griefing Systems
- **Rate Limiting**: Per-region, per-player restrictions
- **Spatial Constraints**: Minimum base distances (50 tiles)
- **Economic Pressure**: Progressive costs for expansion
- **Diminishing Returns**: Prevents single-strategy dominance

## 🚀 Development

### Environment Setup
```bash
# Environment variables (.env)
PUBLIC_TILE_STYLE_URL=https://tiles.openfreemap.org/styles/bright
PUBLIC_TILE_API_URL=https://tiles.openfreemap.org
PUBLIC_WS_URL=ws://37.60.229.209/ws
PUBLIC_COOLDOWN_SECONDS=30
```

### Available Scripts
```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview built app
npm run check        # Type checking
npm run lint         # ESLint + Prettier
npm run format       # Auto-format code

# AI agent builds
npm run build:ai:grok    # Grok AI context
npm run build:ai:gemini  # Gemini AI context  
npm run build:ai:codex   # Codex AI context
npm run build:ai:qwen    # Qwen AI context
```

### Key Development Files
- **Game Logic**: `/src/lib/game/` - Pure functions, no side effects
- **UI Components**: `/src/components/` - Reactive Svelte components  
- **API Endpoints**: `/src/routes/api/` - Server-side validation
- **Type Definitions**: `/src/lib/types.ts` - Comprehensive interfaces
- **Constants**: `/src/lib/game/constants.ts` - Single source of truth

### Performance Targets
- **60 FPS** canvas rendering with 1000+ pixels
- **<100ms** WebSocket round-trip latency
- **<200MB** stable memory usage over 1+ hour sessions
- **Lighthouse Score**: Performance ≥90, Best Practices ≥95

## 🌐 Deployment

### Docker Production
```bash
# Build optimized image
docker build -t pixel-dominion .

# Run with health checks
docker run -d \
  --name pixel-dominion \
  --restart unless-stopped \
  -p 3000:3000 \
  --health-cmd="curl -f http://localhost:3000/api/health || exit 1" \
  --health-interval=30s \
  --health-timeout=3s \
  --health-retries=3 \
  pixel-dominion
```

### Cloudflare Optimization
Add these cache rules for optimal performance:

```nginx
# Static assets (immutable)
Cache-Control: public, max-age=31536000, immutable
# Map tiles  
Cache-Control: public, max-age=86400, s-maxage=86400
# API responses
Cache-Control: public, max-age=60, s-maxage=300
```

### Environment Variables (Production)
```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
PUBLIC_TILE_STYLE_URL=https://tiles.openfreemap.org/styles/bright
PUBLIC_WS_URL=wss://your-domain.com/ws
PUBLIC_COOLDOWN_SECONDS=30
```

## 📱 Progressive Web App (PWA)

Pixel Dominion is installable as a PWA with:
- **Offline Shell**: Core UI works without network
- **Home Screen Install**: Native app-like experience  
- **Service Worker**: Background updates and caching
- **Mobile Optimized**: Touch-friendly 44px targets
- **Responsive Design**: Adapts to all screen sizes

## 🎹 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `T` | Territory drawing mode |
| `B` | Building placement mode |  
| `A` | APX attack mode |
| `I` | Tile inspection mode |
| `G` | Toggle grid overlay |
| `Tab` | Toggle sidebar |
| `M` | Toggle board/leaderboard |
| `?` | Show shortcuts help |
| `Esc` | Cancel action/close modal |

## 🗺️ Map Controls

- **Click**: Paint pixel or place building
- **Drag**: Pan pixel canvas
- **Scroll**: Zoom pixel canvas

## 🔧 Known Limitations & Roadmap

### Current Limitations
- **T2-T5 Buildings**: Data stubs only, effects not implemented
- **Alliance System**: Basic mechanics, needs expansion
- **Persistence**: No database, state resets on server restart
- **AI Opponents**: Basic NPCs planned but not implemented
- **Mobile App**: PWA only, native apps planned

### Planned Features (v2.0)
- [ ] Complete T2-T5 building implementations
- [ ] Advanced alliance mechanics (shared resources, diplomacy)
- [ ] Persistent world state with database backend
- [ ] Spectator mode and replay system
- [ ] Tournament/competition system
- [ ] Custom game modes and private servers
- [ ] Achievement and progression system
- [ ] Native mobile apps (iOS/Android)

### Technical Debt
- [ ] Replace mock WebSocket server with production implementation
- [ ] Add comprehensive test suite (unit + integration)
- [ ] Implement proper user authentication and sessions
- [ ] Add server-side validation and anti-cheat measures
- [ ] Optimize for larger player counts (1000+ concurrent)

## 📊 Performance Monitoring

### Client-Side Metrics
- **FPS Tracking**: Real-time frame rate monitoring
- **Memory Usage**: Heap size tracking with leak detection
- **Network Latency**: WebSocket round-trip measurements
- **User Actions**: Click-to-response time tracking

### Server-Side Metrics (TODO)
- WebSocket connection count and stability
- API endpoint response times
- Resource usage (CPU, memory, network)
- Game state update frequency and backlog

## 🤝 Contributing

### Code Style
- **TypeScript**: Strict mode, no `any` types
- **Functional**: Pure functions for game logic
- **Reactive**: Svelte stores for state management
- **Validated**: Zod schemas for all API boundaries

### Pull Request Process
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes following established patterns
4. Test locally (`npm run check` and `npm run lint`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request with clear description

### Development Guidelines
- Follow existing code patterns and file organization
- Add TypeScript types for all new interfaces
- Include error handling and validation
- Test on both desktop and mobile browsers
- Update documentation for new features

## 📄 License & Attribution

### License
MIT License - see [LICENSE](LICENSE) file for details

### Attributions
- **Map Data**: © [OpenFreeMap](https://openfreemap.org) contributors
- **Vector Tiles**: © [OpenStreetMap](https://www.openstreetmap.org/) contributors  
- **Fonts**: JetBrains Mono (OFL License)
- **Icons**: Custom pixel art + emoji

## 📞 Support & Community

- **Issues**: [GitHub Issues](https://github.com/anthropics/claude-code/issues)
- **Documentation**: `/docs/` directory
- **Performance**: See `/docs/qwen.md` for optimization details
- **AI Context**: Agent-specific documentation in `/docs/`

---

Built with ❤️ using SvelteKit, and modern web technologies.

*This is a first playable demonstration. Full production deployment requires additional server infrastructure and database integration.*

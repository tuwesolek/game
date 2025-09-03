import { b as get_store_value, c as create_ssr_component, a as subscribe, d as add_attribute, e as createEventDispatcher, v as validate_component } from "../../chunks/ssr.js";
import { w as writable, d as derived } from "../../chunks/index.js";
import { G as GAME_CONFIG, C as COLORS, a as getAvailableBuildings, b as getBuildingDisplayInfo } from "../../chunks/buildings.js";
import { e as escape } from "../../chunks/escape.js";
const WS_URL = typeof window !== "undefined" ? `ws://${window.location.hostname}:8080` : "ws://localhost:8080";
class WebSocketClient {
  ws = null;
  connectionState = writable("disconnected");
  pixelUpdateCallbacks = /* @__PURE__ */ new Set();
  buildingPlacedCallbacks = /* @__PURE__ */ new Set();
  constructor() {
  }
  connect() {
    this.connectionState.set("connecting");
    this.ws = new WebSocket(WS_URL);
    this.ws.onopen = () => {
      console.log("WebSocket connected");
      this.connectionState.set("connected");
      this.send({ type: "player_join", payload: { playerId: get_store_value(player)?.id || "anonymous" } });
    };
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    this.ws.onclose = (event) => {
      console.log("WebSocket disconnected:", event.code, event.reason);
      this.connectionState.set("disconnected");
      setTimeout(() => this.connect(), 3e3);
    };
    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      this.connectionState.set("error");
      this.ws?.close();
    };
  }
  handleMessage(message) {
    switch (message.type) {
      case "world_state":
        console.log("Initial world state received:", message.payload);
        worldState.set(message.payload);
        break;
      case "pixel_update":
        const pixelUpdate = message.payload;
        gameActions.updateTile(pixelUpdate.tile_id, {
          color: pixelUpdate.color,
          opacity: pixelUpdate.opacity
        });
        this.pixelUpdateCallbacks.forEach((callback) => callback(pixelUpdate));
        break;
      case "building_placed":
        const building = message.payload;
        gameActions.addBuilding(building.owner_id, building);
        this.buildingPlacedCallbacks.forEach((callback) => callback(building));
        break;
      case "player_update":
        gameActions.updateResources(message.payload.playerId, message.payload.resources);
        break;
      case "error":
        console.error("Server error:", message.payload);
        break;
      default:
        console.warn("Unknown message type:", message.type, message.payload);
    }
  }
  send(message) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not open. Message not sent:", message);
    }
  }
  sendPixelUpdate(tile_id, color, opacity) {
    this.send({
      type: "pixel_update",
      payload: { tile_id, color, opacity }
    });
  }
  sendBuildingPlacement(data) {
    this.send({
      type: "building_placement",
      payload: data
    });
  }
  onPixelUpdate(callback) {
    this.pixelUpdateCallbacks.add(callback);
    return () => this.pixelUpdateCallbacks.delete(callback);
  }
  onBuildingPlaced(callback) {
    this.buildingPlacedCallbacks.add(callback);
    return () => this.buildingPlacedCallbacks.delete(callback);
  }
}
const wsClient = new WebSocketClient();
function getWebSocket() {
  return wsClient;
}
const player = writable(null);
const worldState = writable({
  players: /* @__PURE__ */ new Map(),
  tiles: /* @__PURE__ */ new Map(),
  alliances: /* @__PURE__ */ new Map(),
  buildings: /* @__PURE__ */ new Map(),
  victory_threshold: GAME_CONFIG.DOMINANCE_THRESHOLD,
  last_update: Date.now()
});
const uiState = writable({
  selected_tool: "territory",
  selected_color: COLORS.TERRITORY_GRAY,
  zoom_level: 8,
  cooldowns: /* @__PURE__ */ new Map(),
  show_grid: true,
  // Enable grid by default for pixel art editing
  show_alliances: true
});
getWebSocket().connectionState;
derived(
  player,
  ($player) => $player?.resources ?? { px: 0, exp: 0, apx: 0 }
);
derived(
  player,
  ($player) => $player?.owned_territories.size ?? 0
);
derived(
  player,
  ($player) => $player?.buildings.length ?? 0
);
derived(
  player,
  ($player) => Array.from($player?.palette.colors ?? [])
);
derived(
  [player, uiState],
  ([$player, $ui]) => {
    if (!$player || $ui.selected_tool !== "building") return false;
    return $player.resources.px >= 9;
  }
);
const gameActions = {
  // Initialize a new player
  initializePlayer(playerId, factionId = "default") {
    const newPlayer = {
      id: playerId,
      faction_id: factionId,
      resources: {
        px: GAME_CONFIG.STARTING_PX,
        exp: 0,
        apx: 0
      },
      palette: {
        colors: /* @__PURE__ */ new Set([
          COLORS.TERRITORY_GRAY,
          "#3b82f6",
          "#ef4444",
          "#10b981",
          "#f59e0b",
          "#8b5cf6",
          "#06b6d4",
          "#f97316"
        ])
      },
      owned_territories: /* @__PURE__ */ new Set(),
      buildings: [],
      tech_level: 1,
      alliances: /* @__PURE__ */ new Set(),
      generation_rate: GAME_CONFIG.BASE_GENERATION_RATE,
      storage_capacity: 100,
      last_tick: Date.now()
    };
    player.set(newPlayer);
    worldState.update((world) => ({
      ...world,
      players: new Map(world.players).set(playerId, newPlayer)
    }));
  },
  // Update player resources
  updateResources(playerId, resources) {
    player.update((current) => {
      if (!current || current.id !== playerId) return current;
      return {
        ...current,
        resources: { ...current.resources, ...resources }
      };
    });
    worldState.update((world) => {
      const players = new Map(world.players);
      const playerData = players.get(playerId);
      if (playerData) {
        players.set(playerId, { ...playerData, resources: { ...playerData.resources, ...resources } });
      }
      return { ...world, players };
    });
  },
  // Add territory to player
  addTerritory(playerId, tileId) {
    player.update((current) => {
      if (!current || current.id !== playerId) return current;
      const newTerritories = new Set(current.owned_territories);
      newTerritories.add(tileId);
      return { ...current, owned_territories: newTerritories };
    });
  },
  // Update tile state
  updateTile(tileId, updates) {
    worldState.update((world) => {
      const tiles = new Map(world.tiles);
      const existingTile = tiles.get(tileId);
      tiles.set(tileId, { ...existingTile, ...updates });
      return { ...world, tiles };
    });
  },
  // Add building to player
  addBuilding(playerId, building) {
    player.update((current) => {
      if (!current || current.id !== playerId) return current;
      return {
        ...current,
        buildings: [...current.buildings, building]
      };
    });
    worldState.update((world) => ({
      ...world,
      buildings: new Map(world.buildings).set(building.id, building)
    }));
  },
  // Update UI state
  setSelectedTool(tool) {
    uiState.update((ui) => ({ ...ui, selected_tool: tool }));
  },
  setSelectedColor(color) {
    uiState.update((ui) => ({ ...ui, selected_color: color }));
  },
  setSelectedBuilding(buildingType) {
    uiState.update((ui) => ({
      ...ui,
      selected_building: buildingType,
      selected_tool: "building"
    }));
  },
  setZoomLevel(zoom) {
    uiState.update((ui) => ({ ...ui, zoom_level: zoom }));
  },
  setCooldown(key, endTime) {
    uiState.update((ui) => ({
      ...ui,
      cooldowns: new Map(ui.cooldowns).set(key, endTime)
    }));
  },
  removeCooldown(key) {
    uiState.update((ui) => {
      const cooldowns = new Map(ui.cooldowns);
      cooldowns.delete(key);
      return { ...ui, cooldowns };
    });
  },
  toggleGrid() {
    uiState.update((ui) => ({ ...ui, show_grid: !ui.show_grid }));
  },
  toggleAlliances() {
    uiState.update((ui) => ({ ...ui, show_alliances: !ui.show_alliances }));
  }
};
const Map$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_uiState;
  let $$unsubscribe_worldState;
  $$unsubscribe_uiState = subscribe(uiState, (value) => value);
  $$unsubscribe_worldState = subscribe(worldState, (value) => value);
  let ws;
  try {
    ws = getWebSocket();
  } catch (error) {
    console.warn("WebSocket initialization failed:", error);
    ws = {
      subscribeTiles: () => {
      },
      sendPixelUpdate: () => {
      },
      onPixelUpdate: () => () => {
      }
    };
  }
  ws.onPixelUpdate((update) => {
    console.log("Pixel update received:", update);
  });
  $$unsubscribe_uiState();
  $$unsubscribe_worldState();
  return `<div class="w-full h-full relative bg-gray-800 overflow-hidden cursor-crosshair"${add_attribute()} data-svelte-h="svelte-1sjfu5l"></div>`;
});
function getToolIcon(tool) {
  switch (tool) {
    case "territory":
      return "✏️";
    case "building":
      return "🏗️";
    case "apx":
      return "💥";
    case "inspect":
      return "🔍";
    default:
      return "?";
  }
}
const Toolbar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $uiState, $$unsubscribe_uiState;
  let $player, $$unsubscribe_player;
  $$unsubscribe_uiState = subscribe(uiState, (value) => $uiState = value);
  $$unsubscribe_player = subscribe(player, (value) => $player = value);
  let availableBuildings = [];
  {
    if ($player) {
      availableBuildings = getAvailableBuildings($player);
    }
  }
  $$unsubscribe_uiState();
  $$unsubscribe_player();
  return ` <div class="building-menu-container relative svelte-np63j4"> <div class="flex gap-2 game-panel p-2"> <div class="flex gap-1 border-r border-gray-600 pr-2"><button class="${["game-button", $uiState.selected_tool === "territory" ? "active" : ""].join(" ").trim()}" title="Pixel Paint Tool (T) - Paint 1x1 pixels on the map" aria-label="Pixel painting tool"><span class="text-lg">${escape(getToolIcon("territory"))}</span></button> <button class="${["game-button relative", $uiState.selected_tool === "building" ? "active" : ""].join(" ").trim()}" title="Place Buildings (B)" aria-label="Building placement tool"><span class="text-lg">${escape(getToolIcon("building"))}</span> ${availableBuildings.length > 0 ? `<span class="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">${escape(availableBuildings.length)}</span>` : ``}</button> <button class="${["game-button", $uiState.selected_tool === "apx" ? "active" : ""].join(" ").trim()}" title="APX Attack (A)" aria-label="APX attack tool" ${!$player || $player.resources.apx === 0 ? "disabled" : ""}><span class="text-lg">${escape(getToolIcon("apx"))}</span></button> <button class="${["game-button", $uiState.selected_tool === "inspect" ? "active" : ""].join(" ").trim()}" title="Inspect Tiles (I)" aria-label="Tile inspection tool"><span class="text-lg">${escape(getToolIcon("inspect"))}</span></button></div>  <div class="flex gap-1 border-r border-gray-600 pr-2"><button class="${["game-button text-sm px-2", $uiState.show_grid ? "active" : ""].join(" ").trim()}" title="Toggle Grid (G)" data-svelte-h="svelte-258bha">Grid</button> <button class="${["game-button text-sm px-2", $uiState.show_alliances ? "active" : ""].join(" ").trim()}" title="Toggle Alliance View" data-svelte-h="svelte-1z039ae">Allies</button></div>  <div class="flex items-center text-sm text-gray-400 px-2 border-l border-gray-600 pl-2"><div class="flex flex-col text-xs leading-tight"><span>Z${escape(Math.floor($uiState.zoom_level))}</span> ${$uiState.zoom_level >= 14 ? `<span class="text-green-400" data-svelte-h="svelte-1510ku4">Pixel Mode</span>` : `<span class="text-gray-500" data-svelte-h="svelte-1pltd1t">Map View</span>`}</div></div></div>  ${``}</div>  ${$uiState.selected_tool !== "territory" ? `<div class="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-900/90 px-3 py-1 rounded-full text-sm z-10 pointer-events-none">${$uiState.selected_tool === "building" && $uiState.selected_building ? (() => {
    let info = getBuildingDisplayInfo($uiState.selected_building);
    return `
      Building: ${escape(info.name)}`;
  })() : `${$uiState.selected_tool === "apx" ? `APX Attack Mode` : `${$uiState.selected_tool === "inspect" ? `Inspection Mode` : ``}`}`}</div>` : ``}`;
});
const css = {
  code: "kbd.svelte-1hy6qx4{border-radius:0.25rem;border-width:1px;--tw-border-opacity:1;border-color:rgb(75 85 99 / var(--tw-border-opacity, 1));--tw-bg-opacity:1;background-color:rgb(55 65 81 / var(--tw-bg-opacity, 1));padding-left:0.5rem;padding-right:0.5rem;padding-top:0.25rem;padding-bottom:0.25rem;font-family:JetBrains Mono, Consolas, Monaco, monospace;font-size:0.75rem;line-height:1rem;--tw-text-opacity:1;color:rgb(209 213 219 / var(--tw-text-opacity, 1))\n}",
  map: '{"version":3,"file":"Modals.svelte","sources":["Modals.svelte"],"sourcesContent":["<script lang=\\"ts\\">import { createEventDispatcher } from \\"svelte\\";\\nlet showRules = false;\\nlet showChangelog = false;\\nlet showShortcuts = false;\\nlet showSettings = false;\\nconst dispatch = createEventDispatcher();\\nfunction closeModal() {\\n  showRules = false;\\n  showChangelog = false;\\n  showShortcuts = false;\\n  showSettings = false;\\n}\\nfunction handleKeydown(event) {\\n  if (event.key === \\"Escape\\") {\\n    closeModal();\\n  }\\n  if (event.key === \\"?\\") {\\n    event.preventDefault();\\n    showShortcuts = true;\\n  }\\n}\\nfunction handleOverlayClick(event) {\\n  if (event.target === event.currentTarget) {\\n    closeModal();\\n  }\\n}\\nexport function openRules() {\\n  showRules = true;\\n}\\nexport function openChangelog() {\\n  showChangelog = true;\\n}\\nexport function openShortcuts() {\\n  showShortcuts = true;\\n}\\nexport function openSettings() {\\n  showSettings = true;\\n}\\n<\/script>\\n\\n<svelte:window on:keydown={handleKeydown} />\\n\\n<!-- Help Button (floating) -->\\n<div class=\\"fixed bottom-4 right-20 z-30\\">\\n  <div class=\\"flex gap-2\\">\\n    <button\\n      class=\\"game-button p-3 rounded-full\\"\\n      on:click={() => showShortcuts = true}\\n      title=\\"Keyboard shortcuts (?)\\"\\n    >\\n      ❓\\n    </button>\\n    <button\\n      class=\\"game-button p-3 rounded-full\\"\\n      on:click={() => showRules = true}\\n      title=\\"Game rules\\"\\n    >\\n      📋\\n    </button>\\n  </div>\\n</div>\\n\\n<!-- Rules Modal -->\\n{#if showRules}\\n  <div class=\\"modal-overlay\\" on:click={handleOverlayClick}>\\n    <div class=\\"modal-content\\">\\n      <div class=\\"flex items-center justify-between mb-4\\">\\n        <h2 class=\\"text-xl font-bold text-game-accent\\">Game Rules</h2>\\n        <button on:click={closeModal} class=\\"text-gray-400 hover:text-white text-xl\\">✕</button>\\n      </div>\\n      \\n      <div class=\\"space-y-4 text-sm max-h-96 overflow-y-auto\\">\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">🎯 Objective</h3>\\n          <p class=\\"text-gray-300\\">\\n            Control 25% of the world map or eliminate all opponents to achieve victory. \\n            Build your pixel empire through strategic territory expansion and building construction.\\n          </p>\\n        </section>\\n\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">🗺️ Territory Control</h3>\\n          <ul class=\\"text-gray-300 space-y-1 ml-4\\">\\n            <li>• Territory = grayscale pixels only</li>\\n            <li>• Buildings = colored pixels only</li>\\n            <li>• Cost = 1 PX per pixel placed</li>\\n            <li>• Cannot build on enemy territory</li>\\n          </ul>\\n        </section>\\n\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">🏗️ Buildings & Tech</h3>\\n          <ul class=\\"text-gray-300 space-y-1 ml-4\\">\\n            <li>• Start with Base (unlocks all T1 buildings)</li>\\n            <li>• GenPx: Generates pixels over time</li>\\n            <li>• Storage: Increases pixel capacity</li>\\n            <li>• ColorFactory: Unlocks new colors</li>\\n            <li>• Science: Enables research progression</li>\\n            <li>• Higher tiers require more colors</li>\\n          </ul>\\n        </section>\\n\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">💰 Resources</h3>\\n          <ul class=\\"text-gray-300 space-y-1 ml-4\\">\\n            <li>• PX: Primary currency for all actions</li>\\n            <li>• EXP: Experience for tech advancement</li>\\n            <li>• APX: Anti-pixel for attacking enemies</li>\\n            <li>• Convert: 10 PX ⇄ 1 EXP ⇄ 8 PX</li>\\n          </ul>\\n        </section>\\n\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">⚔️ Combat & APX</h3>\\n          <ul class=\\"text-gray-300 space-y-1 ml-4\\">\\n            <li>• APX attacks can erase enemy pixels</li>\\n            <li>• Different shapes: point, line, area, building</li>\\n            <li>• Success depends on enemy defenses</li>\\n            <li>• Cooldowns prevent spam attacks</li>\\n          </ul>\\n        </section>\\n\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">🛡️ Anti-Griefing</h3>\\n          <ul class=\\"text-gray-300 space-y-1 ml-4\\">\\n            <li>• Rate limits per region</li>\\n            <li>• Minimum distance between bases</li>\\n            <li>• APX cooldowns and diminishing returns</li>\\n            <li>• Progressive costs for expansion</li>\\n          </ul>\\n        </section>\\n      </div>\\n      \\n      <div class=\\"mt-6 text-center\\">\\n        <button class=\\"game-button\\" on:click={closeModal}>Got it!</button>\\n      </div>\\n    </div>\\n  </div>\\n{/if}\\n\\n<!-- Shortcuts Modal -->\\n{#if showShortcuts}\\n  <div class=\\"modal-overlay\\" on:click={handleOverlayClick}>\\n    <div class=\\"modal-content\\">\\n      <div class=\\"flex items-center justify-between mb-4\\">\\n        <h2 class=\\"text-xl font-bold text-game-accent\\">Keyboard Shortcuts</h2>\\n        <button on:click={closeModal} class=\\"text-gray-400 hover:text-white text-xl\\">✕</button>\\n      </div>\\n      \\n      <div class=\\"space-y-4 text-sm\\">\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">🎮 Game Controls</h3>\\n          <div class=\\"grid grid-cols-2 gap-2 text-gray-300\\">\\n            <div><kbd>T</kbd> Territory mode</div>\\n            <div><kbd>B</kbd> Building mode</div>\\n            <div><kbd>A</kbd> APX attack mode</div>\\n            <div><kbd>I</kbd> Inspect mode</div>\\n            <div><kbd>G</kbd> Toggle grid</div>\\n            <div><kbd>Tab</kbd> Toggle sidebar</div>\\n            <div><kbd>M</kbd> Toggle board/leaderboard</div>\\n            <div><kbd>?</kbd> Show shortcuts</div>\\n          </div>\\n        </section>\\n\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">🗺️ Map Controls</h3>\\n          <div class=\\"grid grid-cols-2 gap-2 text-gray-300\\">\\n            <div><kbd>Click</kbd> Place pixel/building</div>\\n            <div><kbd>Right-click</kbd> Quick APX attack</div>\\n            <div><kbd>Drag</kbd> Pan map</div>\\n            <div><kbd>Scroll</kbd> Zoom in/out</div>\\n            <div><kbd>Double-click</kbd> Zoom to location</div>\\n            <div><kbd>Esc</kbd> Cancel action/close</div>\\n          </div>\\n        </section>\\n\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">💬 Communication</h3>\\n          <div class=\\"grid grid-cols-2 gap-2 text-gray-300\\">\\n            <div><kbd>Enter</kbd> Send board message</div>\\n            <div><kbd>Shift+Enter</kbd> New line in message</div>\\n          </div>\\n        </section>\\n\\n        <section class=\\"text-xs text-gray-500\\">\\n          <p>💡 Tip: Hold <kbd>Shift</kbd> while clicking to place multiple pixels rapidly</p>\\n        </section>\\n      </div>\\n      \\n      <div class=\\"mt-6 text-center\\">\\n        <button class=\\"game-button\\" on:click={closeModal}>Close</button>\\n      </div>\\n    </div>\\n  </div>\\n{/if}\\n\\n<!-- Changelog Modal -->\\n{#if showChangelog}\\n  <div class=\\"modal-overlay\\" on:click={handleOverlayClick}>\\n    <div class=\\"modal-content\\">\\n      <div class=\\"flex items-center justify-between mb-4\\">\\n        <h2 class=\\"text-xl font-bold text-game-accent\\">Changelog</h2>\\n        <button on:click={closeModal} class=\\"text-gray-400 hover:text-white text-xl\\">✕</button>\\n      </div>\\n      \\n      <div class=\\"space-y-4 text-sm max-h-96 overflow-y-auto\\">\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">v1.0.0 - First Playable</h3>\\n          <ul class=\\"text-gray-300 space-y-1 ml-4\\">\\n            <li>• Complete T1 building system</li>\\n            <li>• Real-time multiplayer pixel placement</li>\\n            <li>• MapLibre GL integration with OpenFreeMap</li>\\n            <li>• Resource generation and conversion</li>\\n            <li>• Basic APX attack system</li>\\n            <li>• Regional board messaging</li>\\n            <li>• Leaderboard and statistics</li>\\n            <li>• PWA support for mobile</li>\\n            <li>• Anti-griefing rate limiting</li>\\n            <li>• Keyboard shortcuts</li>\\n          </ul>\\n        </section>\\n\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">🚧 Known Limitations</h3>\\n          <ul class=\\"text-gray-300 space-y-1 ml-4\\">\\n            <li>• T2-T5 buildings are data stubs</li>\\n            <li>• Alliance system is basic</li>\\n            <li>• No persistent server state</li>\\n            <li>• Limited mobile optimization</li>\\n            <li>• Basic AI/NPC opponents</li>\\n          </ul>\\n        </section>\\n\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">🔮 Planned Features</h3>\\n          <ul class=\\"text-gray-300 space-y-1 ml-4\\">\\n            <li>• Full T2-T5 building implementation</li>\\n            <li>• Advanced alliance mechanics</li>\\n            <li>• Persistent world state</li>\\n            <li>• Mobile app version</li>\\n            <li>• Spectator mode</li>\\n            <li>• Custom game modes</li>\\n            <li>• Achievement system</li>\\n          </ul>\\n        </section>\\n      </div>\\n      \\n      <div class=\\"mt-6 text-center\\">\\n        <button class=\\"game-button\\" on:click={closeModal}>Close</button>\\n      </div>\\n    </div>\\n  </div>\\n{/if}\\n\\n<!-- Settings Modal -->\\n{#if showSettings}\\n  <div class=\\"modal-overlay\\" on:click={handleOverlayClick}>\\n    <div class=\\"modal-content\\">\\n      <div class=\\"flex items-center justify-between mb-4\\">\\n        <h2 class=\\"text-xl font-bold text-game-accent\\">Settings</h2>\\n        <button on:click={closeModal} class=\\"text-gray-400 hover:text-white text-xl\\">✕</button>\\n      </div>\\n      \\n      <div class=\\"space-y-4 text-sm\\">\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">🎨 Display</h3>\\n          <div class=\\"space-y-2\\">\\n            <label class=\\"flex items-center gap-2\\">\\n              <input type=\\"checkbox\\" class=\\"rounded\\" />\\n              <span class=\\"text-gray-300\\">Show grid by default</span>\\n            </label>\\n            <label class=\\"flex items-center gap-2\\">\\n              <input type=\\"checkbox\\" class=\\"rounded\\" />\\n              <span class=\\"text-gray-300\\">Show alliance territories</span>\\n            </label>\\n            <label class=\\"flex items-center gap-2\\">\\n              <input type=\\"checkbox\\" class=\\"rounded\\" />\\n              <span class=\\"text-gray-300\\">Smooth zoom transitions</span>\\n            </label>\\n          </div>\\n        </section>\\n\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">🔊 Audio</h3>\\n          <div class=\\"space-y-2\\">\\n            <label class=\\"flex items-center gap-2\\">\\n              <input type=\\"checkbox\\" class=\\"rounded\\" />\\n              <span class=\\"text-gray-300\\">Sound effects</span>\\n            </label>\\n            <label class=\\"flex items-center gap-2\\">\\n              <input type=\\"checkbox\\" class=\\"rounded\\" />\\n              <span class=\\"text-gray-300\\">Notification sounds</span>\\n            </label>\\n          </div>\\n        </section>\\n\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">🌐 Language</h3>\\n          <select class=\\"bg-gray-700 text-white rounded p-2 w-full\\">\\n            <option value=\\"en\\">English</option>\\n            <option value=\\"pl\\">Polski</option>\\n          </select>\\n        </section>\\n\\n        <section>\\n          <h3 class=\\"font-semibold text-gray-200 mb-2\\">💾 Data</h3>\\n          <div class=\\"space-y-2\\">\\n            <button class=\\"game-button w-full\\">Export Game Data</button>\\n            <button class=\\"game-button w-full\\">Clear Local Cache</button>\\n          </div>\\n        </section>\\n      </div>\\n      \\n      <div class=\\"mt-6 text-center space-x-2\\">\\n        <button class=\\"game-button\\" on:click={closeModal}>Save</button>\\n        <button class=\\"game-button\\" on:click={closeModal}>Cancel</button>\\n      </div>\\n    </div>\\n  </div>\\n{/if}\\n\\n<style>\\n  kbd {\\n    border-radius: 0.25rem;\\n    border-width: 1px;\\n    --tw-border-opacity: 1;\\n    border-color: rgb(75 85 99 / var(--tw-border-opacity, 1));\\n    --tw-bg-opacity: 1;\\n    background-color: rgb(55 65 81 / var(--tw-bg-opacity, 1));\\n    padding-left: 0.5rem;\\n    padding-right: 0.5rem;\\n    padding-top: 0.25rem;\\n    padding-bottom: 0.25rem;\\n    font-family: JetBrains Mono, Consolas, Monaco, monospace;\\n    font-size: 0.75rem;\\n    line-height: 1rem;\\n    --tw-text-opacity: 1;\\n    color: rgb(209 213 219 / var(--tw-text-opacity, 1))\\n}\\n</style>"],"names":[],"mappings":"AAkUE,kBAAI,CACF,aAAa,CAAE,OAAO,CACtB,YAAY,CAAE,GAAG,CACjB,mBAAmB,CAAE,CAAC,CACtB,YAAY,CAAE,IAAI,EAAE,CAAC,EAAE,CAAC,EAAE,CAAC,CAAC,CAAC,IAAI,mBAAmB,CAAC,EAAE,CAAC,CAAC,CACzD,eAAe,CAAE,CAAC,CAClB,gBAAgB,CAAE,IAAI,EAAE,CAAC,EAAE,CAAC,EAAE,CAAC,CAAC,CAAC,IAAI,eAAe,CAAC,EAAE,CAAC,CAAC,CACzD,YAAY,CAAE,MAAM,CACpB,aAAa,CAAE,MAAM,CACrB,WAAW,CAAE,OAAO,CACpB,cAAc,CAAE,OAAO,CACvB,WAAW,CAAE,SAAS,CAAC,IAAI,CAAC,CAAC,QAAQ,CAAC,CAAC,MAAM,CAAC,CAAC,SAAS,CACxD,SAAS,CAAE,OAAO,CAClB,WAAW,CAAE,IAAI,CACjB,iBAAiB,CAAE,CAAC,CACpB,KAAK,CAAE,IAAI,GAAG,CAAC,GAAG,CAAC,GAAG,CAAC,CAAC,CAAC,IAAI,iBAAiB,CAAC,EAAE,CAAC;AACtD"}'
};
const Modals = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let showRules = false;
  let showChangelog = false;
  let showShortcuts = false;
  let showSettings = false;
  createEventDispatcher();
  function openRules() {
    showRules = true;
  }
  function openChangelog() {
    showChangelog = true;
  }
  function openShortcuts() {
    showShortcuts = true;
  }
  function openSettings() {
    showSettings = true;
  }
  if ($$props.openRules === void 0 && $$bindings.openRules && openRules !== void 0) $$bindings.openRules(openRules);
  if ($$props.openChangelog === void 0 && $$bindings.openChangelog && openChangelog !== void 0) $$bindings.openChangelog(openChangelog);
  if ($$props.openShortcuts === void 0 && $$bindings.openShortcuts && openShortcuts !== void 0) $$bindings.openShortcuts(openShortcuts);
  if ($$props.openSettings === void 0 && $$bindings.openSettings && openSettings !== void 0) $$bindings.openSettings(openSettings);
  $$result.css.add(css);
  return `  <div class="fixed bottom-4 right-20 z-30"><div class="flex gap-2"><button class="game-button p-3 rounded-full" title="Keyboard shortcuts (?)" data-svelte-h="svelte-1vzedhi">❓</button> <button class="game-button p-3 rounded-full" title="Game rules" data-svelte-h="svelte-vlxsqi">📋</button></div></div>  ${showRules ? `<div class="modal-overlay"><div class="modal-content"><div class="flex items-center justify-between mb-4"><h2 class="text-xl font-bold text-game-accent" data-svelte-h="svelte-ofnes0">Game Rules</h2> <button class="text-gray-400 hover:text-white text-xl" data-svelte-h="svelte-xe32ie">✕</button></div> <div class="space-y-4 text-sm max-h-96 overflow-y-auto" data-svelte-h="svelte-1dogu1q"><section><h3 class="font-semibold text-gray-200 mb-2">🎯 Objective</h3> <p class="text-gray-300">Control 25% of the world map or eliminate all opponents to achieve victory. 
            Build your pixel empire through strategic territory expansion and building construction.</p></section> <section><h3 class="font-semibold text-gray-200 mb-2">🗺️ Territory Control</h3> <ul class="text-gray-300 space-y-1 ml-4"><li>• Territory = grayscale pixels only</li> <li>• Buildings = colored pixels only</li> <li>• Cost = 1 PX per pixel placed</li> <li>• Cannot build on enemy territory</li></ul></section> <section><h3 class="font-semibold text-gray-200 mb-2">🏗️ Buildings &amp; Tech</h3> <ul class="text-gray-300 space-y-1 ml-4"><li>• Start with Base (unlocks all T1 buildings)</li> <li>• GenPx: Generates pixels over time</li> <li>• Storage: Increases pixel capacity</li> <li>• ColorFactory: Unlocks new colors</li> <li>• Science: Enables research progression</li> <li>• Higher tiers require more colors</li></ul></section> <section><h3 class="font-semibold text-gray-200 mb-2">💰 Resources</h3> <ul class="text-gray-300 space-y-1 ml-4"><li>• PX: Primary currency for all actions</li> <li>• EXP: Experience for tech advancement</li> <li>• APX: Anti-pixel for attacking enemies</li> <li>• Convert: 10 PX ⇄ 1 EXP ⇄ 8 PX</li></ul></section> <section><h3 class="font-semibold text-gray-200 mb-2">⚔️ Combat &amp; APX</h3> <ul class="text-gray-300 space-y-1 ml-4"><li>• APX attacks can erase enemy pixels</li> <li>• Different shapes: point, line, area, building</li> <li>• Success depends on enemy defenses</li> <li>• Cooldowns prevent spam attacks</li></ul></section> <section><h3 class="font-semibold text-gray-200 mb-2">🛡️ Anti-Griefing</h3> <ul class="text-gray-300 space-y-1 ml-4"><li>• Rate limits per region</li> <li>• Minimum distance between bases</li> <li>• APX cooldowns and diminishing returns</li> <li>• Progressive costs for expansion</li></ul></section></div> <div class="mt-6 text-center"><button class="game-button" data-svelte-h="svelte-1jb6fz9">Got it!</button></div></div></div>` : ``}  ${showShortcuts ? `<div class="modal-overlay"><div class="modal-content"><div class="flex items-center justify-between mb-4"><h2 class="text-xl font-bold text-game-accent" data-svelte-h="svelte-4bn0f1">Keyboard Shortcuts</h2> <button class="text-gray-400 hover:text-white text-xl" data-svelte-h="svelte-xe32ie">✕</button></div> <div class="space-y-4 text-sm" data-svelte-h="svelte-1u41sp"><section><h3 class="font-semibold text-gray-200 mb-2">🎮 Game Controls</h3> <div class="grid grid-cols-2 gap-2 text-gray-300"><div><kbd class="svelte-1hy6qx4">T</kbd> Territory mode</div> <div><kbd class="svelte-1hy6qx4">B</kbd> Building mode</div> <div><kbd class="svelte-1hy6qx4">A</kbd> APX attack mode</div> <div><kbd class="svelte-1hy6qx4">I</kbd> Inspect mode</div> <div><kbd class="svelte-1hy6qx4">G</kbd> Toggle grid</div> <div><kbd class="svelte-1hy6qx4">Tab</kbd> Toggle sidebar</div> <div><kbd class="svelte-1hy6qx4">M</kbd> Toggle board/leaderboard</div> <div><kbd class="svelte-1hy6qx4">?</kbd> Show shortcuts</div></div></section> <section><h3 class="font-semibold text-gray-200 mb-2">🗺️ Map Controls</h3> <div class="grid grid-cols-2 gap-2 text-gray-300"><div><kbd class="svelte-1hy6qx4">Click</kbd> Place pixel/building</div> <div><kbd class="svelte-1hy6qx4">Right-click</kbd> Quick APX attack</div> <div><kbd class="svelte-1hy6qx4">Drag</kbd> Pan map</div> <div><kbd class="svelte-1hy6qx4">Scroll</kbd> Zoom in/out</div> <div><kbd class="svelte-1hy6qx4">Double-click</kbd> Zoom to location</div> <div><kbd class="svelte-1hy6qx4">Esc</kbd> Cancel action/close</div></div></section> <section><h3 class="font-semibold text-gray-200 mb-2">💬 Communication</h3> <div class="grid grid-cols-2 gap-2 text-gray-300"><div><kbd class="svelte-1hy6qx4">Enter</kbd> Send board message</div> <div><kbd class="svelte-1hy6qx4">Shift+Enter</kbd> New line in message</div></div></section> <section class="text-xs text-gray-500"><p>💡 Tip: Hold <kbd class="svelte-1hy6qx4">Shift</kbd> while clicking to place multiple pixels rapidly</p></section></div> <div class="mt-6 text-center"><button class="game-button" data-svelte-h="svelte-y1d4sv">Close</button></div></div></div>` : ``}  ${showChangelog ? `<div class="modal-overlay"><div class="modal-content"><div class="flex items-center justify-between mb-4"><h2 class="text-xl font-bold text-game-accent" data-svelte-h="svelte-1bqdqlx">Changelog</h2> <button class="text-gray-400 hover:text-white text-xl" data-svelte-h="svelte-xe32ie">✕</button></div> <div class="space-y-4 text-sm max-h-96 overflow-y-auto" data-svelte-h="svelte-9jxx1"><section><h3 class="font-semibold text-gray-200 mb-2">v1.0.0 - First Playable</h3> <ul class="text-gray-300 space-y-1 ml-4"><li>• Complete T1 building system</li> <li>• Real-time multiplayer pixel placement</li> <li>• MapLibre GL integration with OpenFreeMap</li> <li>• Resource generation and conversion</li> <li>• Basic APX attack system</li> <li>• Regional board messaging</li> <li>• Leaderboard and statistics</li> <li>• PWA support for mobile</li> <li>• Anti-griefing rate limiting</li> <li>• Keyboard shortcuts</li></ul></section> <section><h3 class="font-semibold text-gray-200 mb-2">🚧 Known Limitations</h3> <ul class="text-gray-300 space-y-1 ml-4"><li>• T2-T5 buildings are data stubs</li> <li>• Alliance system is basic</li> <li>• No persistent server state</li> <li>• Limited mobile optimization</li> <li>• Basic AI/NPC opponents</li></ul></section> <section><h3 class="font-semibold text-gray-200 mb-2">🔮 Planned Features</h3> <ul class="text-gray-300 space-y-1 ml-4"><li>• Full T2-T5 building implementation</li> <li>• Advanced alliance mechanics</li> <li>• Persistent world state</li> <li>• Mobile app version</li> <li>• Spectator mode</li> <li>• Custom game modes</li> <li>• Achievement system</li></ul></section></div> <div class="mt-6 text-center"><button class="game-button" data-svelte-h="svelte-y1d4sv">Close</button></div></div></div>` : ``}  ${showSettings ? `<div class="modal-overlay"><div class="modal-content"><div class="flex items-center justify-between mb-4"><h2 class="text-xl font-bold text-game-accent" data-svelte-h="svelte-d7qzcw">Settings</h2> <button class="text-gray-400 hover:text-white text-xl" data-svelte-h="svelte-xe32ie">✕</button></div> <div class="space-y-4 text-sm"><section data-svelte-h="svelte-1cc2n3y"><h3 class="font-semibold text-gray-200 mb-2">🎨 Display</h3> <div class="space-y-2"><label class="flex items-center gap-2"><input type="checkbox" class="rounded"> <span class="text-gray-300">Show grid by default</span></label> <label class="flex items-center gap-2"><input type="checkbox" class="rounded"> <span class="text-gray-300">Show alliance territories</span></label> <label class="flex items-center gap-2"><input type="checkbox" class="rounded"> <span class="text-gray-300">Smooth zoom transitions</span></label></div></section> <section data-svelte-h="svelte-qdmh8j"><h3 class="font-semibold text-gray-200 mb-2">🔊 Audio</h3> <div class="space-y-2"><label class="flex items-center gap-2"><input type="checkbox" class="rounded"> <span class="text-gray-300">Sound effects</span></label> <label class="flex items-center gap-2"><input type="checkbox" class="rounded"> <span class="text-gray-300">Notification sounds</span></label></div></section> <section><h3 class="font-semibold text-gray-200 mb-2" data-svelte-h="svelte-1gv2zu6">🌐 Language</h3> <select class="bg-gray-700 text-white rounded p-2 w-full"><option value="en" data-svelte-h="svelte-1bjraht">English</option><option value="pl" data-svelte-h="svelte-1whlh0q">Polski</option></select></section> <section data-svelte-h="svelte-ogkg3p"><h3 class="font-semibold text-gray-200 mb-2">💾 Data</h3> <div class="space-y-2"><button class="game-button w-full">Export Game Data</button> <button class="game-button w-full">Clear Local Cache</button></div></section></div> <div class="mt-6 text-center space-x-2"><button class="game-button" data-svelte-h="svelte-uu8v6y">Save</button> <button class="game-button" data-svelte-h="svelte-1ihdg0x">Cancel</button></div></div></div>` : ``}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { params = {} } = $$props;
  if ($$props.params === void 0 && $$bindings.params && params !== void 0) $$bindings.params(params);
  return `<div class="h-screen w-screen overflow-hidden bg-game-bg flex"> ${validate_component(Toolbar, "Toolbar").$$render($$result, {}, {}, {})}  <div class="flex-1 relative">${validate_component(Map$1, "Map").$$render($$result, {}, {}, {})}</div></div>  ${validate_component(Modals, "Modals").$$render($$result, {}, {}, {})}`;
});
export {
  Page as default
};

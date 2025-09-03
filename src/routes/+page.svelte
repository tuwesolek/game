<script>
  import { onMount, onDestroy } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  
  // Accept and ignore the params prop to prevent warnings
  export let params = undefined;

  let gameStarted = false;
  let selectedTool = 'territory';
  let selectedColor = '#ff0000';
  let selectedBuilding = null;
  let resources = { px: 100, exp: 50, apx: 10 };
  let showGrid = true;
  let mapContainer;
  let map;
  let zoomLevel = 8;
  let isDragging = false;
  let lastMousePos = { x: 0, y: 0 };
  let mapOffset = { x: 0, y: 0 };
  let placedPixels = [];
  let budgetUsed = 0;
  
  // Available colors
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  
  // Available tools
  const tools = [
    { id: 'territory', name: 'Territory', icon: '🗺️' },
    { id: 'building', name: 'Building', icon: '🏗️' },
    { id: 'apx', name: 'Attack', icon: '💥' },
    { id: 'inspect', name: 'Inspect', icon: '🔍' }
  ];
  
  // Buildings
  const buildings = [
    { id: 'town_hall', name: 'Town Hall', icon: '🏛️', cost: 50 },
    { id: 'house', name: 'House', icon: '🏠', cost: 20 },
    { id: 'factory', name: 'Factory', icon: '🏭', cost: 100 }
  ];

  onMount(() => {
    // Small delay to ensure DOM is fully ready
    setTimeout(() => {
      initializeMap();
      gameStarted = true;
    }, 100);
  });
  
  // Cleanup on destroy
  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });

  function initializeMap() {
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }
    
    console.log('Initializing map with container:', mapContainer);
    console.log('Container dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);
    console.log('Container parent:', mapContainer.parentElement);
    
    // Make sure the container has dimensions
    mapContainer.style.width = '100%';
    mapContainer.style.height = '100%';
    
    // Ensure the container is visible
    mapContainer.style.display = 'block';
    
    // Add a check to ensure the container is in the DOM
    if (!document.body.contains(mapContainer)) {
      console.error('Map container is not in the DOM');
      return;
    }
    
    // Add a visual indicator to confirm the container exists
    mapContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    
    try {
      // Initialize MapLibre GL map with a working style
      map = new maplibregl.Map({
        container: mapContainer,
        style: 'https://demotiles.maplibre.org/style.json', // Using a known working style
        center: [0, 20], // Start near equator
        zoom: 1,
        maxZoom: 19,
        minZoom: 1
      });
      
      // Map event handlers
      map.on('load', () => {
        console.log('Map loaded successfully');
        setupPixelOverlay();
        // Trigger a re-render to hide the fallback message
        map = map; // This will trigger reactivity
      });
      
      map.on('click', handleMapClick);
      map.on('zoom', () => {
        zoomLevel = map.getZoom();
      });
      
      map.on('contextmenu', (e) => {
        e.preventDefault();
      });
      
      // Add navigation controls
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      
      // Error handling
      map.on('error', (e) => {
        console.error('Map error:', e);
      });
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }
  
  function setupPixelOverlay() {
    if (!map) return;
    
    // Add a source for pixel overlays
    map.addSource('pixels', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });
    
    // Add pixel layer
    map.addLayer({
      id: 'pixel-layer',
      type: 'circle',
      source: 'pixels',
      paint: {
        'circle-radius': 6,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff'
      }
    });
    
    // Add building layer
    map.addLayer({
      id: 'building-layer',
      type: 'circle',
      source: 'pixels',
      filter: ['==', 'type', 'building'],
      paint: {
        'circle-radius': 10,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 3,
        'circle-stroke-color': '#ffffff'
      }
    });
  }
  
  function updatePixelOverlay() {
    if (!map || !map.getSource('pixels')) return;
    
    const features = placedPixels.map(pixel => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: pixel.coordinates
      },
      properties: {
        color: pixel.color,
        type: pixel.type,
        tool: pixel.tool,
        cost: pixel.cost,
        building: pixel.building || null
      }
    }));
    
    map.getSource('pixels').setData({
      type: 'FeatureCollection',
      features: features
    });
  }
  
  function handleMapClick(event) {
    if (!map) return;
    
    const lngLat = event.lngLat;
    
    let cost = 0;
    let canPlace = false;
    let itemType = 'pixel';
    let itemName = selectedTool;
    
    // Check if action is valid and calculate cost
    switch (selectedTool) {
      case 'territory':
        cost = 1;
        canPlace = resources.px >= cost;
        break;
      case 'building':
        if (selectedBuilding) {
          const building = buildings.find(b => b.id === selectedBuilding);
          cost = building ? building.cost : 20;
          canPlace = resources.px >= cost;
          itemType = 'building';
          itemName = building ? building.name : 'Building';
        } else {
          alert('Please select a building type first!');
          return;
        }
        break;
      case 'apx':
        cost = 1;
        canPlace = resources.apx >= cost;
        break;
      case 'inspect':
        // Show info about clicked location
        const clickCoords = [lngLat.lng, lngLat.lat];
        const nearbyItems = placedPixels.filter(p => {
          const distance = Math.sqrt(
            Math.pow(p.coordinates[0] - clickCoords[0], 2) + 
            Math.pow(p.coordinates[1] - clickCoords[1], 2)
          );
          return distance < 0.001; // Small threshold for nearby items
        });
        
        if (nearbyItems.length > 0) {
          alert(`Found ${nearbyItems.length} items here:\n` + 
            nearbyItems.map(item => `${item.type}: ${item.building || 'Territory'} (${item.cost} PX)`).join('\n'));
        } else {
          alert(`Empty area at (${lngLat.lng.toFixed(4)}, ${lngLat.lat.toFixed(4)})`);
        }
        return;
    }
    
    if (!canPlace) {
      alert(`Not enough resources! Need ${cost} ${selectedTool === 'apx' ? 'APX' : 'PX'}`);
      return;
    }
    
    // Place the item
    const newItem = {
      coordinates: [lngLat.lng, lngLat.lat],
      color: selectedColor,
      type: itemType,
      tool: selectedTool,
      cost: cost,
      timestamp: Date.now()
    };
    
    if (itemType === 'building') {
      newItem.building = itemName;
    }
    
    placedPixels.push(newItem);
    
    // Deduct resources
    if (selectedTool === 'apx') {
      resources.apx -= cost;
    } else {
      resources.px -= cost;
    }
    budgetUsed += cost;
    
    // Update map display
    updatePixelOverlay();
    resources = resources; // Trigger reactivity
    
    console.log(`Placed ${itemName} at (${lngLat.lng.toFixed(4)}, ${lngLat.lat.toFixed(4)}) for ${cost} ${selectedTool === 'apx' ? 'APX' : 'PX'}`);
  }
  
  // Map navigation is now handled by MapLibre GL JS
  
  function selectTool(tool) {
    selectedTool = tool;
  }
  
  function selectColor(color) {
    selectedColor = color;
  }
  
  function toggleGrid() {
    showGrid = !showGrid;
    // Grid functionality would need to be implemented as a map layer
    console.log('Grid toggle - feature to be implemented with map layers');
  }
  
  function selectBuilding(buildingId) {
    selectedBuilding = buildingId;
    selectedTool = 'building';
  }
  
  function resetBudget() {
    budgetUsed = 0;
    placedPixels = [];
    resources = { px: 100, exp: 50, apx: 10 };
    updatePixelOverlay();
  }
  
  function centerMap() {
    if (map) {
      map.flyTo({
        center: [0, 20],
        zoom: 8,
        essential: true
      });
    }
  }
</script>

{#if !gameStarted}
  <div class="flex h-screen w-screen items-center justify-center bg-game-bg">
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-game-accent mb-4"></div>
      <div class="text-xl font-bold text-white">Initializing Pixel Dominion...</div>
      <div class="text-sm text-gray-400 mt-2">Loading game world</div>
    </div>
  </div>
{:else}
  <!-- Main Game Interface -->
  <div class="h-screen w-screen overflow-hidden bg-game-bg flex">
    
    <!-- Left Panel - Tools & Controls -->
    <div class="w-80 h-full bg-game-panel border-r border-gray-600 flex flex-col">
      <!-- Player Resources -->
      <div class="p-4 border-b border-gray-600">
        <div class="text-sm text-gray-300 mb-2">Player Resources</div>
        <div class="grid grid-cols-3 gap-2 text-xs mb-3">
          <div class="px-display">
            PX: {resources.px}
          </div>
          <div class="exp-display">
            EXP: {resources.exp}
          </div>
          <div class="apx-display">
            APX: {resources.apx}
          </div>
        </div>
        
        <!-- Budget Counter -->
        <div class="bg-gray-700/50 rounded p-2 text-xs">
          <div class="flex justify-between items-center mb-1">
            <span class="text-gray-300">💰 Budget Used:</span>
            <span class="text-yellow-300 font-mono">{budgetUsed} PX</span>
          </div>
          <div class="flex justify-between items-center mb-2">
            <span class="text-gray-300">📊 Items Placed:</span>
            <span class="text-blue-300 font-mono">{placedPixels.length}</span>
          </div>
          <button 
            on:click={resetBudget}
            class="w-full text-xs px-2 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded transition-colors"
            title="Reset budget and clear all placed items"
          >
            🔄 Reset Budget
          </button>
        </div>
      </div>
      
      <!-- Tools -->
      <div class="p-4 border-b border-gray-600">
        <div class="text-sm text-gray-300 mb-3">Tools</div>
        <div class="grid grid-cols-2 gap-2">
          {#each tools as tool}
            <button
              class="game-button text-sm"
              class:active={selectedTool === tool.id}
              on:click={() => selectTool(tool.id)}
            >
              {tool.icon} {tool.name}
            </button>
          {/each}
        </div>
      </div>
      
      <!-- Color Palette -->
      <div class="p-4 border-b border-gray-600">
        <div class="text-sm text-gray-300 mb-3">Colors</div>
        <div class="grid grid-cols-6 gap-2">
          {#each colors as color}
            <button
              class="color-swatch"
              class:selected={selectedColor === color}
              style="background-color: {color}"
              on:click={() => selectColor(color)}
              title={color}
            ></button>
          {/each}
        </div>
      </div>
      
      <!-- Buildings -->
      <div class="flex-1 overflow-y-auto p-4">
        <div class="text-sm text-gray-300 mb-3">Buildings</div>
        <div class="space-y-2">
          {#each buildings as building}
            <div 
              class="building-card"
              class:available={resources.px >= building.cost}
              class:unavailable={resources.px < building.cost}
              class:selected={selectedBuilding === building.id}
            >
              <div class="flex items-center justify-between">
                <div class="flex-1">
                  <div class="font-medium text-sm">{building.icon} {building.name}</div>
                  <div class="text-xs text-gray-400">Cost: {building.cost} PX</div>
                  {#if selectedBuilding === building.id}
                    <div class="text-xs text-blue-300 mt-1">✓ Selected - Click map to place</div>
                  {/if}
                </div>
                <button 
                  class="text-xs px-2 py-1 rounded transition-colors"
                  class:bg-blue-600={selectedBuilding !== building.id && resources.px >= building.cost}
                  class:hover:bg-blue-700={selectedBuilding !== building.id && resources.px >= building.cost}
                  class:bg-green-600={selectedBuilding === building.id}
                  class:opacity-50={resources.px < building.cost}
                  disabled={resources.px < building.cost}
                  on:click={() => selectBuilding(building.id)}
                >
                  {selectedBuilding === building.id ? 'Selected' : 'Select'}
                </button>
              </div>
            </div>
          {/each}
          
          {#if selectedBuilding}
            <button 
              on:click={() => { selectedBuilding = null; selectedTool = 'territory'; }}
              class="w-full text-xs px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors mt-2"
            >
              Cancel Building Selection
            </button>
          {/if}
        </div>
      </div>
    </div>
    
    <!-- Main Map Area -->
    <div class="flex-1 relative">
      <div bind:this={mapContainer} class="w-full h-full" style="min-height: 400px;">
        <!-- Map will be initialized here -->
      </div>
      {#if !map}
        <div class="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-10">
          <div class="text-center p-4 bg-game-panel rounded-lg border border-gray-600">
            <div class="text-red-400 mb-2">Map failed to load</div>
            <div class="text-sm text-gray-300 mb-4">Check console for errors</div>
            <button 
              on:click={initializeMap}
              class="px-4 py-2 bg-game-accent hover:bg-blue-600 text-white rounded transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      {/if}
      
      <!-- Map Controls -->
      <div class="absolute top-4 left-4 z-20 space-y-2">
        <div class="bg-black/50 rounded p-2 space-y-2">
          <button 
            class="game-button text-sm w-full"
            class:active={showGrid}
            on:click={toggleGrid}
          >
            Grid {showGrid ? 'ON' : 'OFF'}
          </button>
          <button 
            class="game-button text-sm w-full"
            on:click={centerMap}
          >
            🎯 Center Map
          </button>
          <div class="text-xs text-gray-300 text-center">
            Zoom: {zoomLevel.toFixed(1)}x
          </div>
        </div>
      </div>
      
      <!-- Game Info -->
      <div class="absolute bottom-4 right-4 text-xs text-gray-400 bg-black/50 px-3 py-2 rounded">
        <div class="font-mono mb-1">
          Tool: <span class="text-yellow-300">{selectedTool}</span> | 
          Color: <span class="text-white" style="background: {selectedColor}; padding: 1px 4px; border-radius: 2px;">{selectedColor}</span>
        </div>
        {#if selectedBuilding}
          <div class="text-blue-300 mb-1">
            Building: {buildings.find(b => b.id === selectedBuilding)?.name || selectedBuilding}
          </div>
        {/if}
        <div class="text-center text-gray-500">
          🖱️ Click to place • 🖱️ Drag to pan • 🖱️ Scroll to zoom
        </div>
      </div>
    </div>
    
    <!-- Right Panel - Leaderboard -->
    <div class="w-80 h-full bg-game-panel border-l border-gray-600 flex flex-col">
      <!-- Leaderboard -->
      <div class="p-4 border-b border-gray-600">
        <div class="text-sm text-gray-300 mb-3">🏆 Leaderboard</div>
        <div class="space-y-2 text-xs">
          <div class="leaderboard-entry">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>RedFaction</span>
            </div>
            <span class="text-yellow-300">2,847 PX</span>
          </div>
          <div class="leaderboard-entry">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>BlueAlliance</span>
            </div>
            <span class="text-yellow-300">2,134 PX</span>
          </div>
          <div class="leaderboard-entry">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>GreenEmpire</span>
            </div>
            <span class="text-yellow-300">1,892 PX</span>
          </div>
        </div>
      </div>
      
      <!-- Game Stats -->
      <div class="p-4 border-b border-gray-600">
        <div class="text-sm text-gray-300 mb-3">📊 Game Stats</div>
        <div class="text-xs text-gray-400 space-y-1">
          <div>Online Players: 247</div>
          <div>Total Pixels: 18,492</div>
          <div>Active Factions: 12</div>
          <div>Buildings: 156</div>
        </div>
      </div>
      
      <!-- Chat/Messages -->
      <div class="flex-1 p-4">
        <div class="text-sm text-gray-300 mb-3">💬 Recent Activity</div>
        <div class="text-xs text-gray-400 space-y-2">
          <div class="bg-gray-700/30 rounded p-2">
            <div class="text-blue-300">BlueAlliance</div>
            <div>Built Town Hall at (142, 89)</div>
            <div class="text-xs text-gray-500 mt-1">2m ago</div>
          </div>
          <div class="bg-gray-700/30 rounded p-2">
            <div class="text-red-300">RedFaction</div>
            <div>Captured territory in North region</div>
            <div class="text-xs text-gray-500 mt-1">5m ago</div>
          </div>
          <div class="bg-gray-700/30 rounded p-2">
            <div class="text-green-300">GreenEmpire</div>
            <div>Alliance formed with YellowCorps</div>
            <div class="text-xs text-gray-500 mt-1">8m ago</div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
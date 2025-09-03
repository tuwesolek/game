<script>
  import { onMount, onDestroy } from 'svelte';
  import { Map as MapLibre } from 'maplibre-gl';
  import { gameMapStyle, transformRequest, mapInteractionConfig } from '$lib/map/theme.ts';
  import { uiState, gameActions, worldState } from '$lib/store.ts';
  import { geoToTile, snapToGrid, getShardsInBounds, tileToGeo } from '$lib/map/grid.ts';
  import { getWebSocket } from '$lib/ws.ts';
  import 'maplibre-gl/dist/maplibre-gl.css';

  let mapContainer;
  let map;
  let ws = getWebSocket();
  
  // Canvas overlays for pixel-perfect rendering
  let pixelCanvas;
  let pixelContext;
  let gridCanvas;
  let gridContext;
  let cursorCanvas;
  let cursorContext;
  
  // Pixel painting state
  let isPainting = false;
  let lastPaintedTile = null;
  let currentHoverTile = null;
  let pixelSize = 16; // Base pixel size that scales with zoom

  onMount(() => {
    initializeMap();
    setupPixelOverlay();
    setupEventHandlers();
    startRenderLoop();
  });

  onDestroy(() => {
    if (map) {
      map.remove();
    }
  });

  function initializeMap() {
    const mapOptions = {
      container: mapContainer,
      style: gameMapStyle,
      center: [0, 20], // Start near equator for better world coverage
      zoom: 8,
      transformRequest,
      ...mapInteractionConfig
    };

    map = new MapLibre(mapOptions);

    map.on('load', () => {
      console.log('Map loaded successfully');
      setupCanvasSource();
    });

    map.on('moveend', handleViewportChange);
    map.on('zoomend', handleViewportChange);
    map.on('click', handleMapClick);
    map.on('contextmenu', handleRightClick);
  }

  function setupPixelOverlay() {
    // Create canvas elements for pixel-perfect overlays
    pixelCanvas = document.createElement('canvas');
    pixelCanvas.style.position = 'absolute';
    pixelCanvas.style.top = '0';
    pixelCanvas.style.left = '0';
    pixelCanvas.style.pointerEvents = 'none';
    pixelCanvas.style.zIndex = '12';
    
    gridCanvas = document.createElement('canvas');
    gridCanvas.style.position = 'absolute';
    gridCanvas.style.top = '0';
    gridCanvas.style.left = '0';
    gridCanvas.style.pointerEvents = 'none';
    gridCanvas.style.zIndex = '11';
    
    cursorCanvas = document.createElement('canvas');
    cursorCanvas.style.position = 'absolute';
    cursorCanvas.style.top = '0';
    cursorCanvas.style.left = '0';
    cursorCanvas.style.pointerEvents = 'none';
    cursorCanvas.style.zIndex = '13';
    cursorCanvas.style.cursor = 'none';
    
    mapContainer.appendChild(gridCanvas);
    mapContainer.appendChild(pixelCanvas);
    mapContainer.appendChild(cursorCanvas);
    
    pixelContext = pixelCanvas.getContext('2d');
    gridContext = gridCanvas.getContext('2d');
    cursorContext = cursorCanvas.getContext('2d');
    
    // Disable image smoothing for crisp pixels
    pixelContext.imageSmoothingEnabled = false;
    gridContext.imageSmoothingEnabled = false;
    cursorContext.imageSmoothingEnabled = false;
  }

  function setupCanvasSource() {
    // Add canvas source for pixel overlay
    map.addSource('pixel-overlay', {
      type: 'canvas',
      canvas: pixelCanvas,
      coordinates: [
        [-180, 85.051129],
        [180, 85.051129],
        [180, -85.051129],
        [-180, -85.051129]
      ]
    });

    map.addLayer({
      id: 'pixel-layer',
      type: 'raster',
      source: 'pixel-overlay',
      paint: {
        'raster-opacity': 0.8
      }
    });
  }

  function setupEventHandlers() {
    // Handle window resize
    const handleResize = () => {
      if (map) {
        map.resize();
        resizeCanvases();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Pixel art painting events
    mapContainer.addEventListener('pointermove', handlePointerMove);
    mapContainer.addEventListener('pointerdown', handlePointerDown);
    mapContainer.addEventListener('pointerup', handlePointerUp);
    mapContainer.addEventListener('pointerleave', handlePointerLeave);
  }

  function resizeCanvases() {
    const containerRect = mapContainer.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Resize all canvases
    [pixelCanvas, gridCanvas, cursorCanvas].forEach(canvas => {
      canvas.width = containerRect.width * devicePixelRatio;
      canvas.height = containerRect.height * devicePixelRatio;
      canvas.style.width = containerRect.width + 'px';
      canvas.style.height = containerRect.height + 'px';
      
      const context = canvas.getContext('2d');
      context.scale(devicePixelRatio, devicePixelRatio);
      context.imageSmoothingEnabled = false; // Crisp pixels
    });
  }

  function handleViewportChange() {
    if (!map) return;
    
    const bounds = map.getBounds();
    const viewportBounds = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };
    
    // Update UI state
    gameActions.updateViewportBounds(viewportBounds);
    gameActions.setZoomLevel(map.getZoom());
    
    // Subscribe to visible tile shards
    const visibleShards = getShardsInBounds(viewportBounds, Math.floor(map.getZoom()));
    ws.subscribeTiles(visibleShards);
    
    // Redraw overlays for new viewport
    redrawOverlays();
  }

  // Pixel art painting event handlers
  function handlePointerDown(event) {
    if (!map || event.button !== 0) return; // Only left click
    event.preventDefault();
    
    const currentUI = $uiState;
    if (currentUI.selected_tool !== 'territory') return;
    
    isPainting = true;
    const tileCoord = getPixelFromEvent(event);
    if (tileCoord) {
      paintPixel(tileCoord, currentUI.selected_color);
      lastPaintedTile = `${tileCoord.lat_idx}_${tileCoord.lon_idx}`;
    }
  }
  
  function handlePointerMove(event) {
    if (!map) return;
    
    const tileCoord = getPixelFromEvent(event);
    if (!tileCoord) return;
    
    const tileId = `${tileCoord.lat_idx}_${tileCoord.lon_idx}`;
    currentHoverTile = tileCoord;
    
    // Paint while dragging (skip if same tile to avoid redundant updates)
    if (isPainting && $uiState.selected_tool === 'territory') {
      if (lastPaintedTile !== tileId) {
        paintPixel(tileCoord, $uiState.selected_color);
        lastPaintedTile = tileId;
      }
    }
    
    // Update cursor preview
    redrawCursor();
  }
  
  function handlePointerUp(event) {
    isPainting = false;
    lastPaintedTile = null;
  }
  
  function handlePointerLeave(event) {
    isPainting = false;
    lastPaintedTile = null;
    currentHoverTile = null;
    clearCursor();
  }
  
  function getPixelFromEvent(event) {
    const rect = mapContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert screen coordinates to map coordinates
    const lngLat = map.unproject([x, y]);
    const zoom = Math.floor(map.getZoom());
    
    // Snap to pixel grid
    const snapped = snapToGrid(lngLat.lat, lngLat.lng, zoom);
    return geoToTile(snapped.lat, snapped.lng, zoom);
  }
  
  function paintPixel(tileCoord, color) {
    // Send pixel update to server
    const tileId = `${tileCoord.lat_idx}_${tileCoord.lon_idx}`;
    ws.sendPixelUpdate(tileId, color, 1.0);
    
    // Update local state immediately for responsiveness
    gameActions.updateTile(tileId, {
      lat_idx: tileCoord.lat_idx,
      lon_idx: tileCoord.lon_idx,
      type: 'territory_gray',
      color: color,
      opacity: 1.0
    });
  }
  
  function handleMapClick(event) {
    // Fallback for non-territory tools
    const lngLat = event.lngLat;
    const currentUI = $uiState;
    
    if (currentUI.selected_tool === 'territory') return; // Handled by pointer events
    
    const snapped = snapToGrid(lngLat.lat, lngLat.lng, Math.floor(map.getZoom()));
    const tileCoord = geoToTile(snapped.lat, snapped.lng, Math.floor(map.getZoom()));
    
    switch (currentUI.selected_tool) {
      case 'building':
        if (currentUI.selected_building) {
          handleBuildingPlacement(currentUI.selected_building, tileCoord);
        }
        break;
      case 'apx':
        handleApxAttack(tileCoord);
        break;
      case 'inspect':
        handleTileInspect(tileCoord);
        break;
    }
  }

  function handleRightClick(event) {
    event.preventDefault();
    // Right-click for quick territory erase or cancel action
    const lngLat = event.lngLat;
    const snapped = snapToGrid(lngLat.lat, lngLat.lng, Math.floor(map.getZoom()));
    const tileCoord = geoToTile(snapped.lat, snapped.lng, Math.floor(map.getZoom()));
    
    // Quick erase with APX if available
    handleApxAttack(tileCoord, 'point');
  }

  function handleTerritoryDraw(tiles: any[], color: string) {
    // Send territory draw request
    ws.sendPixelUpdate(`${tiles[0].lat_idx}_${tiles[0].lon_idx}`, color, 1.0);
    console.log('Territory draw:', tiles, color);
  }

  function handleBuildingPlacement(buildingType: string, position: any) {
    // Send building placement request
    ws.sendBuildingPlacement({
      building_type: buildingType,
      position: position
    });
    console.log('Building placement:', buildingType, position);
  }

  function handleApxAttack(position: any, shape: string = 'point') {
    console.log('APX attack:', shape, position);
    
    // Send APX attack request
    ws.send({
      type: 'apx_attack',
      shape: shape,
      position: position,
      timestamp: Date.now()
    });
  }

  function handleTileInspect(position: any) {
    console.log('Inspect tile:', position);
    
    // Show tile information popup
    const popupContent = `
      <div class="bg-game-panel border border-gray-600 rounded-lg p-3 shadow-lg">
        <h3 class="text-lg font-bold text-white mb-2">Tile Information</h3>
        <div class="space-y-1 text-sm">
          <div><span class="text-gray-400">Position:</span> ${position.lat_idx}, ${position.lon_idx}</div>
          <div><span class="text-gray-400">Owner:</span> Unknown</div>
          <div><span class="text-gray-400">Type:</span> Empty</div>
        </div>
      </div>
    `;
    
    // Create and show popup
    const popup = new maplibregl.Popup({ closeOnClick: true })
      .setLngLat(map.unproject([position.lon_idx, position.lat_idx]))
      .setHTML(popupContent)
      .addTo(map);
  }

  // Render loop for smooth 60fps pixel updates
  let lastRenderTime = 0;
  let renderRequestId;

  function renderFrame(currentTime: number) {
    const deltaTime = currentTime - lastRenderTime;
    
    if (deltaTime >= 16) { // ~60 FPS
      redrawOverlays();
      lastRenderTime = currentTime;
    }
    
    renderRequestId = requestAnimationFrame(renderFrame);
  }

  function startRenderLoop() {
    renderRequestId = requestAnimationFrame(renderFrame);
  }

  function redrawOverlays() {
    redrawPixels();
    redrawGrid();
    redrawCursor();
  }

  function redrawPixels() {
    if (!pixelContext || !map) return;
    
    const canvas = pixelContext.canvas;
    pixelContext.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    
    // Calculate pixel size based on zoom level
    const zoom = map.getZoom();
    pixelSize = Math.max(2, Math.pow(2, zoom - 12)); // Exponential scaling
    
    // Get visible bounds
    const bounds = map.getBounds();
    const tileCoords = getTilesInViewport(bounds, Math.floor(zoom));
    
    // Draw each tile as a pixel
    const currentWorld = $worldState;
    
    tileCoords.forEach(coord => {
      const tileId = `${coord.lat_idx}_${coord.lon_idx}`;
      const tile = currentWorld.tiles.get(tileId);
      
      if (tile && tile.opacity > 0) {
        drawPixelAtTile(coord, tile.color, tile.opacity);
      }
    });
  }
  
  function getTilesInViewport(bounds, zoom) {
    const topLeft = geoToTile(bounds.getNorth(), bounds.getWest(), zoom);
    const bottomRight = geoToTile(bounds.getSouth(), bounds.getEast(), zoom);
    
    const tiles = [];
    for (let lat = Math.min(topLeft.lat_idx, bottomRight.lat_idx); lat <= Math.max(topLeft.lat_idx, bottomRight.lat_idx); lat++) {
      for (let lon = Math.min(topLeft.lon_idx, bottomRight.lon_idx); lon <= Math.max(topLeft.lon_idx, bottomRight.lon_idx); lon++) {
        tiles.push({ lat_idx: lat, lon_idx: lon });
      }
    }
    return tiles;
  }
  
  function drawPixelAtTile(tileCoord, color, opacity) {
    // Convert tile coordinate to screen position
    const geo = tileToGeo(tileCoord, Math.floor(map.getZoom()));
    const screenPos = map.project([geo.lng, geo.lat]);
    
    // Draw pixel with proper size and opacity
    pixelContext.fillStyle = color;
    pixelContext.globalAlpha = opacity;
    
    const halfSize = pixelSize / 2;
    pixelContext.fillRect(
      screenPos.x - halfSize,
      screenPos.y - halfSize,
      pixelSize,
      pixelSize
    );
    
    pixelContext.globalAlpha = 1;
  }

  function redrawGrid() {
    if (!gridContext || !map) return;
    
    const canvas = gridContext.canvas;
    gridContext.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    
    // Only show grid when close enough for pixel editing
    const zoom = map.getZoom();
    if (zoom < 14 || !$uiState.show_grid) return;
    
    // Draw pixel grid lines
    const bounds = map.getBounds();
    const tileCoords = getTilesInViewport(bounds, Math.floor(zoom));
    
    gridContext.strokeStyle = '#4ade80';
    gridContext.lineWidth = 1;
    gridContext.globalAlpha = 0.6;
    
    // Draw grid cell for each tile
    tileCoords.forEach(coord => {
      const geo = tileToGeo(coord, Math.floor(zoom));
      const screenPos = map.project([geo.lng, geo.lat]);
      
      const halfSize = pixelSize / 2;
      gridContext.strokeRect(
        screenPos.x - halfSize,
        screenPos.y - halfSize,
        pixelSize,
        pixelSize
      );
    });
  }
  
  function redrawCursor() {
    if (!cursorContext || !map || !currentHoverTile) return;
    
    const canvas = cursorContext.canvas;
    cursorContext.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    
    // Draw high-contrast cursor at hover tile
    const geo = tileToGeo(currentHoverTile, Math.floor(map.getZoom()));
    const screenPos = map.project([geo.lng, geo.lat]);
    
    const halfSize = pixelSize / 2;
    
    // White outline
    cursorContext.strokeStyle = '#ffffff';
    cursorContext.lineWidth = 3;
    cursorContext.globalAlpha = 0.9;
    cursorContext.strokeRect(
      screenPos.x - halfSize - 1,
      screenPos.y - halfSize - 1,
      pixelSize + 2,
      pixelSize + 2
    );
    
    // Black inner line  
    cursorContext.strokeStyle = '#000000';
    cursorContext.lineWidth = 1;
    cursorContext.strokeRect(
      screenPos.x - halfSize,
      screenPos.y - halfSize,
      pixelSize,
      pixelSize
    );
    
    // Color preview
    if ($uiState.selected_tool === 'territory') {
      cursorContext.fillStyle = $uiState.selected_color;
      cursorContext.globalAlpha = 0.7;
      cursorContext.fillRect(
        screenPos.x - halfSize,
        screenPos.y - halfSize,
        pixelSize,
        pixelSize
      );
    }
    
    cursorContext.globalAlpha = 1;
  }
  
  function clearCursor() {
    if (!cursorContext) return;
    const canvas = cursorContext.canvas;
    cursorContext.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
  }

  // WebSocket event handlers
  ws.onPixelUpdate((update) => {
    // Handle incoming pixel updates from other players
    console.log('Pixel update received:', update);
    // Redraw will happen in next render frame
  });

  ws.onBuildingPlaced((data) => {
    console.log('Building placed:', data);
    // Update world state and redraw
  });

  onDestroy(() => {
    if (renderRequestId) {
      cancelAnimationFrame(renderRequestId);
    }
  });
</script>

<div bind:this={mapContainer} class="w-full h-full relative bg-game-bg">
  <!-- Map loading indicator -->
  <div class="absolute inset-0 flex items-center justify-center bg-game-bg z-20" class:hidden={map}>
    <div class="text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-game-accent mb-2"></div>
      <div class="text-sm text-gray-400">Loading world map...</div>
    </div>
  </div>
  
  <!-- Attribution (required for OpenFreeMap) -->
  <div class="absolute bottom-2 right-2 text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
    © OpenFreeMap contributors
  </div>
</div>

<style>
  :global(.maplibregl-map) {
    font-family: 'JetBrains Mono', monospace;
  }
  
  :global(.maplibregl-popup-content) {
    background: var(--game-panel);
    color: #e5e7eb;
  }
  
  :global(.maplibregl-ctrl-group button) {
    background: var(--game-panel);
    color: #e5e7eb;
  }
</style>
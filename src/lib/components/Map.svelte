<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { uiState, gameActions, worldState } from '$lib/store.ts';
  import { getWebSocket } from '$lib/ws.ts';
  import { tileId, parseTileId } from '$lib/map/grid.ts';

  let container;
  let pixelCanvas;
  let pixelContext;
  let gridCanvas;
  let gridContext;
  let cursorCanvas;
  let cursorContext;

  let ws;
  try {
    ws = getWebSocket();
  } catch (error) {
    console.warn('WebSocket initialization failed:', error);
    ws = {
      subscribeTiles: () => {},
      sendPixelUpdate: () => {},
      onPixelUpdate: () => () => {},
    };
  }

  // Viewport state
  let panX = 0;
  let panY = 0;
  let zoom = 1;
  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 20;
  const TILE_SIZE = 16;

  // Painting state
  let isPainting = false;
  let isPanniing = false;
  let isSpacePainting = false; // New: track spacebar painting
  let lastPaintedTile = null;
  let currentHoverTile = null;
  
  let lastPointerX = 0;
  let lastPointerY = 0;

  onMount(() => {
    setupCanvases();
    setupEventHandlers();
    requestAnimationFrame(renderFrame);

    // Center the initial view
    panX = -container.clientWidth / 2;
    panY = -container.clientHeight / 2;

    // Mock world data for testing
    for (let i = -10; i < 10; i++) {
      for (let j = -10; j < 10; j++) {
        const id = tileId({ lat_idx: i, lon_idx: j });
        const color = (i + j) % 2 === 0 ? '#222' : '#333';
        gameActions.updateTile(id, { lat_idx: i, lon_idx: j, type: 'territory', color, opacity: 1.0 });
      }
    }
  });

  function setupCanvases() {
    pixelCanvas = document.createElement('canvas');
    gridCanvas = document.createElement('canvas');
    cursorCanvas = document.createElement('canvas');

    container.appendChild(pixelCanvas);
    container.appendChild(gridCanvas);
    container.appendChild(cursorCanvas);

    pixelContext = pixelCanvas.getContext('2d');
    gridContext = gridCanvas.getContext('2d');
    cursorContext = cursorCanvas.getContext('2d');

    resizeCanvases();
  }

  function resizeCanvases() {
    const rect = container.getBoundingClientRect();
    [pixelCanvas, gridCanvas, cursorCanvas].forEach(canvas => {
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
    });
    
    pixelContext.imageSmoothingEnabled = false;
    gridContext.imageSmoothingEnabled = false;
    cursorContext.imageSmoothingEnabled = false;
  }

  function setupEventHandlers() {
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerup', handlePointerUp);
    container.addEventListener('pointerleave', handlePointerLeave);
    container.addEventListener('wheel', handleWheel);
    
    // Add keyboard event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }

  function handlePointerDown(event) {
    if (event.button === 0) { // Left click
      if ($uiState.selected_tool === 'territory') {
        isPainting = true;
        const tileCoord = screenToTile(event.offsetX, event.offsetY);
        paintPixel(tileCoord, $uiState.selected_color);
        lastPaintedTile = tileId(tileCoord);
      }
    } else if (event.button === 1) { // Middle mouse
      isPanniing = true;
    }
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  }

  function handlePointerMove(event) {
    const tileCoord = screenToTile(event.offsetX, event.offsetY);
    currentHoverTile = tileCoord;

    if (isPanniing) {
      const dx = event.clientX - lastPointerX;
      const dy = event.clientY - lastPointerY;
      panX += dx;
      panY += dy;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      return;
    }

    // Paint with either mouse or spacebar
    if ((isPainting || isSpacePainting) && $uiState.selected_tool === 'territory') {
      const currentTileId = tileId(tileCoord);
      if (lastPaintedTile !== currentTileId) {
        paintPixel(tileCoord, $uiState.selected_color);
        lastPaintedTile = currentTileId;
      }
    }
  }

  function handlePointerUp(event) {
    isPainting = false;
    isPanniing = false;
    lastPaintedTile = null;
  }

  function handlePointerLeave() {
    isPainting = false;
    isPanniing = false;
    isSpacePainting = false; // Also stop space painting
    lastPaintedTile = null;
    currentHoverTile = null;
  }

  // New: Handle keyboard events
  function handleKeyDown(event) {
    // Spacebar for painting
    if (event.code === 'Space' && !isSpacePainting) {
      event.preventDefault(); // Prevent space from scrolling page
      isSpacePainting = true;
      // Paint the current hovered tile if there is one
      if (currentHoverTile && $uiState.selected_tool === 'territory') {
        paintPixel(currentHoverTile, $uiState.selected_color);
        lastPaintedTile = tileId(currentHoverTile);
      }
    }
  }

  function handleKeyUp(event) {
    // Release spacebar
    if (event.code === 'Space') {
      isSpacePainting = false;
      lastPaintedTile = null;
    }
  }

  function handleWheel(event) {
    event.preventDefault();
    const scale = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * scale));

    // Zoom towards the cursor
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;

    panX = mouseX - (mouseX - panX) * (newZoom / zoom);
    panY = mouseY - (mouseY - panY) * (newZoom / zoom);
    zoom = newZoom;
  }

  function paintPixel(tileCoord, color) {
    const id = tileId(tileCoord);
    ws.sendPixelUpdate(id, color, 1.0);
    gameActions.updateTile(id, {
      ...tileCoord,
      type: 'territory',
      color: color,
      opacity: 1.0
    });
  }

  function screenToTile(screenX, screenY) {
    const worldX = (screenX - panX) / zoom;
    const worldY = (screenY - panY) / zoom;
    const lon_idx = Math.floor(worldX / TILE_SIZE);
    const lat_idx = Math.floor(worldY / TILE_SIZE);
    return { lat_idx, lon_idx };
  }

  function renderFrame() {
    clearCanvases();
    drawPixels();
    if (zoom > 4) {
      drawGrid();
    }
    drawCursor();
    requestAnimationFrame(renderFrame);
  }

  function clearCanvases() {
    pixelContext.clearRect(0, 0, pixelCanvas.width, pixelCanvas.height);
    gridContext.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    cursorContext.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
  }

  function drawPixels() {
    pixelContext.save();
    pixelContext.translate(panX, panY);
    pixelContext.scale(zoom, zoom);

    const startTile = screenToTile(0, 0);
    const endTile = screenToTile(pixelCanvas.width, pixelCanvas.height);

    for (let lat = startTile.lat_idx -1; lat <= endTile.lat_idx + 1; lat++) {
      for (let lon = startTile.lon_idx -1; lon <= endTile.lon_idx + 1; lon++) {
        const id = tileId({ lat_idx: lat, lon_idx: lon });
        const tile = $worldState.tiles.get(id);
        if (tile) {
          pixelContext.fillStyle = tile.color;
          pixelContext.fillRect(lon * TILE_SIZE, lat * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
    pixelContext.restore();
  }

  function drawGrid() {
    gridContext.save();
    gridContext.translate(panX, panY);
    gridContext.scale(zoom, zoom);

    const scaledTileSize = TILE_SIZE;
    const startX = Math.floor(-panX / (scaledTileSize * zoom)) * scaledTileSize;
    const startY = Math.floor(-panY / (scaledTileSize * zoom)) * scaledTileSize;
    const endX = startX + container.clientWidth / zoom;
    const endY = startY + container.clientHeight / zoom;

    gridContext.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    gridContext.lineWidth = 1 / zoom;

    for (let x = startX; x < endX; x += scaledTileSize) {
        gridContext.beginPath();
        gridContext.moveTo(x, startY);
        gridContext.lineTo(x, endY);
        gridContext.stroke();
    }

    for (let y = startY; y < endY; y += scaledTileSize) {
        gridContext.beginPath();
        gridContext.moveTo(startX, y);
        gridContext.lineTo(endX, y);
        gridContext.stroke();
    }
    gridContext.restore();
  }

  function drawCursor() {
    if (!currentHoverTile) return;

    cursorContext.save();
    cursorContext.translate(panX, panY);
    cursorContext.scale(zoom, zoom);

    const x = currentHoverTile.lon_idx * TILE_SIZE;
    const y = currentHoverTile.lat_idx * TILE_SIZE;

    if ($uiState.selected_tool === 'territory') {
      cursorContext.fillStyle = $uiState.selected_color;
      cursorContext.globalAlpha = 0.7;
      cursorContext.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      cursorContext.globalAlpha = 1;
    }

    cursorContext.strokeStyle = '#ffffff';
    cursorContext.lineWidth = 2 / zoom;
    cursorContext.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
    
    cursorContext.strokeStyle = '#000000';
    cursorContext.lineWidth = 1 / zoom;
    cursorContext.strokeRect(x, y, TILE_SIZE, TILE_SIZE);

    cursorContext.restore();
  }

  ws.onPixelUpdate((update) => {
    // This will be handled by the store update, which triggers a rerender
    console.log('Pixel update received:', update);
  });

</script>

<div bind:this={container} class="w-full h-full relative bg-gray-800 overflow-hidden cursor-crosshair">
  <!-- Canvases are appended here by script -->
</div>

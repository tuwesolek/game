<script>
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';

  let mapContainer;
  let map;
  let tileLoadCount = 0;
  let statusMessage = 'Loading map...';

  onMount(() => {
    if (mapContainer) {
      // Initialize MapLibre GL map with OpenStreetMap tiles
      map = new maplibregl.Map({
        container: mapContainer,
        style: {
          version: 8,
          sources: {
            'openstreetmap': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [{
            id: 'openstreetmap-layer',
            type: 'raster',
            source: 'openstreetmap',
            minzoom: 0,
            maxzoom: 19
          }]
        },
        center: [0, 0], // Start at coordinates [0, 0]
        zoom: 2
      });

      // Add navigation controls
      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      // Map event handlers
      map.on('load', () => {
        console.log('Map loaded successfully with OpenStreetMap tiles');
        statusMessage = 'Map loaded successfully! Waiting for tiles...';
      });

      // Count tile loads
      map.on('dataloading', (e) => {
        if (e.dataType === 'source' && e.sourceDataType === 'content') {
          tileLoadCount++;
          statusMessage = `Map loaded. Tiles loaded: ${tileLoadCount}`;
        }
      });

      map.on('error', (e) => {
        console.error('Map error:', e);
        statusMessage = 'Error loading map: ' + e.error.message;
      });
    }
  });
</script>

<style>
  .map-container {
    width: 100%;
    height: 100vh;
  }
  
  .status {
    position: absolute;
    top: 10px;
    left: 10px;
    background: white;
    padding: 10px;
    border-radius: 5px;
    z-index: 1000;
    font-family: Arial, sans-serif;
  }
</style>

<div class="status">{statusMessage}</div>
<div bind:this={mapContainer} class="map-container"></div>
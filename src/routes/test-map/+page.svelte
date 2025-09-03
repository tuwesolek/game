<script>
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';

  let mapContainer;
  let status = 'Loading map...';

  onMount(() => {
    if (mapContainer) {
      try {
        // Initialize MapLibre GL map with a working style
        const map = new maplibregl.Map({
          container: mapContainer,
          style: 'https://tiles.openfreemap.org/styles/positron', // Use a working style
          center: [0, 0],
          zoom: 2
        });

        // Add navigation controls
        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        // Map event handlers
        map.on('load', () => {
          console.log('Map loaded successfully');
          status = 'Map loaded successfully!';
          document.getElementById('status').textContent = status;
        });

        map.on('error', (e) => {
          console.error('Map error:', e);
          status = 'Error loading map: ' + e.error.message;
          document.getElementById('status').textContent = status;
        });

        // Count tile loads
        let tileCount = 0;
        map.on('dataloading', (e) => {
          if (e.dataType === 'source' && e.sourceDataType === 'content') {
            tileCount++;
            status = `Map loaded. Tiles loaded: ${tileCount}`;
            document.getElementById('status').textContent = status;
          }
        });
      } catch (error) {
        console.error('Error initializing map:', error);
        status = 'Error initializing map: ' + error.message;
        document.getElementById('status').textContent = status;
      }
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

<div class="status" id="status">{status}</div>
<div bind:this={mapContainer} class="map-container"></div>
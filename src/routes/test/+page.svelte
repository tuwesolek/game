<script>
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';

  let mapContainer;
  let map;

  onMount(() => {
    if (mapContainer) {
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
      center: [0, 20],
      zoom: 8
    });

      map.on('load', () => {
        console.log('Map loaded successfully');
      });
    }
  });
</script>

<div bind:this={mapContainer} style="width: 100%; height: 100vh;"></div>
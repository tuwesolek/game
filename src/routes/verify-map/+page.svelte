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
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: [0, 0],
        zoom: 2
      });

      map.on('load', () => {
        console.log('Map loaded successfully with OpenStreetMap tiles');
      });
    }
  });
</script>

<div bind:this={mapContainer} style="width: 100%; height: 100vh;"></div>
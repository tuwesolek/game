<script>
  import Map from '$lib/components/Map.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import Modals from '$lib/components/Modals.svelte';
  
  // Accept and ignore the params prop to prevent warnings
  export const params = undefined;
</script>

<div class="h-screen w-screen overflow-hidden bg-game-bg flex">
  <!-- Game Toolbar -->
  <Toolbar />
  
  <!-- Main Map Area -->
  <div class="flex-1 relative">
    <Map />
  </div>
</div>

<!-- Modals -->
<Modals />


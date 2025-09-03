<script>
  import Map from '$lib/components/Map.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import Modals from '$lib/components/Modals.svelte';
  
  // Accept and ignore the params prop to prevent warnings
  export let params = undefined;
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

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
  }
  
  :global(.game-button) {
    @apply px-3 py-2 bg-game-button hover:bg-game-button-hover text-white rounded transition-colors;
  }
  
  :global(.game-button.active) {
    @apply bg-game-accent;
  }
  
  :global(.color-swatch) {
    @apply w-8 h-8 rounded border-2 border-transparent hover:border-white transition-colors cursor-pointer;
  }
  
  :global(.color-swatch.selected) {
    @apply border-white;
  }
  
  :global(.building-card) {
    @apply p-3 rounded border transition-colors cursor-pointer;
  }
  
  :global(.building-card.available) {
    @apply bg-gray-700/30 border-gray-600 hover:border-blue-500;
  }
  
  :global(.building-card.unavailable) {
    @apply bg-gray-700/10 border-gray-700 opacity-50;
  }
  
  :global(.building-card.selected) {
    @apply bg-blue-600/20 border-blue-500;
  }
  
  :global(.leaderboard-entry) {
    @apply flex justify-between items-center p-2 bg-gray-700/30 rounded;
  }
  
  :global(.px-display) {
    @apply bg-blue-600/20 px-2 py-1 rounded text-blue-200 text-center;
  }
  
  :global(.exp-display) {
    @apply bg-green-600/20 px-2 py-1 rounded text-green-200 text-center;
  }
  
  :global(.apx-display) {
    @apply bg-red-600/20 px-2 py-1 rounded text-red-200 text-center;
  }
</style>
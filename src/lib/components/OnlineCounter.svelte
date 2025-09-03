<script lang="ts">
  import { onMount } from 'svelte';
  import { statusAPI } from '$lib/api.js';
  
  let onlineCount = 0;
  let loading = true;
  let refreshInterval: any;

  onMount(() => {
    loadOnlineCount();
    // Refresh every 30 seconds
    refreshInterval = setInterval(loadOnlineCount, 30_000);
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });

  async function loadOnlineCount() {
    try {
      const response = await statusAPI.getOnlineCount();
      if (response.success && response.data) {
        onlineCount = response.data.count;
      }
    } catch (error) {
      console.error('Failed to load online count:', error);
    } finally {
      loading = false;
    }
  }

  function getStatusColor(): string {
    if (onlineCount === 0) return 'text-gray-500';
    if (onlineCount < 10) return 'text-yellow-400';
    if (onlineCount < 50) return 'text-green-400';
    return 'text-blue-400';
  }

  function getPulseAnimation(): boolean {
    return onlineCount > 0;
  }
</script>

<div class="bg-game-panel border border-gray-600 rounded-md px-3 py-2 flex items-center gap-2">
  <!-- Status Indicator -->
  <div 
    class="w-2 h-2 rounded-full {getStatusColor()}"
    class:animate-pulse={getPulseAnimation()}
    title="Server status indicator"
  ></div>
  
  <!-- Count -->
  <div class="text-sm font-mono">
    {#if loading}
      <span class="text-gray-400">Loading...</span>
    {:else}
      <span class="text-white font-medium">{onlineCount}</span>
      <span class="text-gray-400 ml-1">
        {onlineCount === 1 ? 'player' : 'players'} online
      </span>
    {/if}
  </div>
  
  <!-- Refresh Button -->
  <button
    on:click={loadOnlineCount}
    class="text-gray-400 hover:text-gray-200 text-xs ml-2"
    title="Refresh online count"
    disabled={loading}
  >
    🔄
  </button>
</div>
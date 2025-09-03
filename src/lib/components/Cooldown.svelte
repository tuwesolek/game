<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { uiState } from '$lib/store.js';
  import { GAME_CONFIG } from '$lib/game/constants.js';

  let currentTime = Date.now();
  let timeInterval: any;

  onMount(() => {
    timeInterval = setInterval(() => {
      currentTime = Date.now();
    }, 1000);
  });

  onDestroy(() => {
    if (timeInterval) {
      clearInterval(timeInterval);
    }
  });

  function formatTimeRemaining(endTime: number): string {
    const remaining = Math.max(0, endTime - currentTime);
    if (remaining === 0) return '';
    
    const seconds = Math.ceil(remaining / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  function getCooldownProgress(endTime: number, duration: number): number {
    const remaining = Math.max(0, endTime - currentTime);
    const elapsed = duration - remaining;
    return Math.min(100, (elapsed / duration) * 100);
  }

  // Filter active cooldowns
  $: activeCooldowns = Array.from($uiState.cooldowns.entries())
    .filter(([_, endTime]) => endTime > currentTime)
    .sort((a, b) => a[1] - b[1]); // Sort by end time

  function getCooldownIcon(key: string): string {
    if (key.includes('territory')) return '🗺️';
    if (key.includes('building')) return '🏗️';
    if (key.includes('apx')) return '💥';
    if (key.includes('convert')) return '🔄';
    return '⏱️';
  }

  function getCooldownLabel(key: string): string {
    if (key.includes('territory')) return 'Territory';
    if (key.includes('building')) return 'Building';
    if (key.includes('apx_point')) return 'APX Point';
    if (key.includes('apx_line')) return 'APX Line';
    if (key.includes('apx_area')) return 'APX Area';
    if (key.includes('convert')) return 'Convert';
    return 'Action';
  }
</script>

{#if activeCooldowns.length > 0}
  <div class="game-panel p-3 min-w-48">
    <h3 class="text-xs font-semibold mb-2 text-gray-400 flex items-center gap-2">
      ⏱️ Cooldowns
    </h3>
    
    <div class="space-y-2">
      {#each activeCooldowns.slice(0, 4) as [key, endTime]}
        {@const timeLeft = formatTimeRemaining(endTime)}
        {@const progress = getCooldownProgress(endTime, GAME_CONFIG.COOLDOWN_SECONDS * 1000)}
        <div class="text-sm">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2 text-xs">
              <span>{getCooldownIcon(key)}</span>
              <span class="text-gray-300">{getCooldownLabel(key)}</span>
            </div>
            <span class="cooldown-display">{timeLeft}</span>
          </div>
          
          <!-- Progress Bar -->
          <div class="w-full bg-gray-700 rounded-full h-1">
            <div 
              class="bg-blue-500 h-1 rounded-full transition-all duration-1000 ease-linear"
              style="width: {progress}%"
            ></div>
          </div>
        </div>
      {/each}
      
      {#if activeCooldowns.length > 4}
        <div class="text-xs text-gray-500 text-center">
          +{activeCooldowns.length - 4} more
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Global Cooldown Indicator -->
{#if activeCooldowns.length > 0}
  <div class="fixed top-20 left-4 z-10 pointer-events-none">
    <div class="bg-yellow-900/80 text-yellow-200 px-2 py-1 rounded text-xs font-mono">
      {activeCooldowns.length} active cooldown{activeCooldowns.length !== 1 ? 's' : ''}
    </div>
  </div>
{/if}
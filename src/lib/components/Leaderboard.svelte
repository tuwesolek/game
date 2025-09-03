<script lang="ts">
  import { onMount } from 'svelte';
  import { dataAPI } from '$lib/api.js';
  import type { LeaderboardEntry } from '$lib/types.js';

  let leaderboardData: LeaderboardEntry[] = [];
  let timeframe: '24h' | 'all-time' = '24h';
  let loading = false;
  let error: string | null = null;
  let refreshInterval: any;

  onMount(() => {
    loadLeaderboard();
    // Refresh every 60 seconds
    refreshInterval = setInterval(loadLeaderboard, 60_000);
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });

  async function loadLeaderboard() {
    loading = true;
    error = null;
    
    try {
      const response = await dataAPI.getLeaderboard(timeframe);
      if (response.success && response.data) {
        leaderboardData = response.data;
      } else {
        error = response.error || 'Failed to load leaderboard';
      }
    } catch (err) {
      error = 'Network error loading leaderboard';
      console.error('Leaderboard error:', err);
    } finally {
      loading = false;
    }
  }

  function switchTimeframe(newTimeframe: '24h' | 'all-time') {
    timeframe = newTimeframe;
    loadLeaderboard();
  }

  function getRankIcon(rank: number): string {
    switch (rank) {
      case 1: return '👑';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  }

  function getRankColor(rank: number): string {
    switch (rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-600';
      default: return 'text-gray-500';
    }
  }

  function formatDominanceScore(score: number): string {
    return `${(score * 100).toFixed(1)}%`;
  }

  function getTechLevelColor(level: number): string {
    switch (level) {
      case 1: return 'text-gray-400';
      case 2: return 'text-green-400';
      case 3: return 'text-blue-400';
      case 4: return 'text-purple-400';
      case 5: return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="p-4 border-b border-gray-600">
    <div class="flex items-center justify-between mb-3">
      <h2 class="font-semibold text-gray-300">Leaderboard</h2>
      <button
        on:click={loadLeaderboard}
        disabled={loading}
        class="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
        title="Refresh leaderboard"
      >
        🔄
      </button>
    </div>
    
    <!-- Timeframe Toggle -->
    <div class="flex gap-1 text-xs">
      <button
        class="px-2 py-1 rounded transition-colors"
        class:bg-blue-600={timeframe === '24h'}
        class:text-white={timeframe === '24h'}
        class:text-gray-400={timeframe !== '24h'}
        class:hover:bg-gray-600={timeframe !== '24h'}
        on:click={() => switchTimeframe('24h')}
      >
        24h
      </button>
      <button
        class="px-2 py-1 rounded transition-colors"
        class:bg-blue-600={timeframe === 'all-time'}
        class:text-white={timeframe === 'all-time'}
        class:text-gray-400={timeframe !== 'all-time'}
        class:hover:bg-gray-600={timeframe !== 'all-time'}
        on:click={() => switchTimeframe('all-time')}
      >
        All Time
      </button>
    </div>
  </div>

  <!-- Content -->
  <div class="flex-1 overflow-y-auto">
    {#if loading}
      <div class="flex items-center justify-center p-8">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mb-2"></div>
          <div class="text-sm text-gray-400">Loading...</div>
        </div>
      </div>
    {:else if error}
      <div class="p-4 text-center">
        <div class="text-red-400 text-sm mb-2">⚠️ {error}</div>
        <button
          on:click={loadLeaderboard}
          class="text-xs text-blue-400 hover:text-blue-300"
        >
          Try again
        </button>
      </div>
    {:else if leaderboardData.length === 0}
      <div class="p-4 text-center text-gray-500 text-sm">
        No players found for this timeframe
      </div>
    {:else}
      <div class="divide-y divide-gray-700">
        {#each leaderboardData as entry, index}
          {@const rank = index + 1}
          <div class="leaderboard-entry hover:bg-gray-700/30 transition-colors">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <!-- Rank -->
              <div class="flex-shrink-0 w-8 text-center text-sm font-mono {getRankColor(rank)}">
                {getRankIcon(rank)}
              </div>
              
              <!-- Player Info -->
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-white truncate">
                  {entry.faction_name}
                </div>
                <div class="text-xs text-gray-400">
                  {formatDominanceScore(entry.dominance_score)} dominance
                </div>
              </div>
              
              <!-- Stats -->
              <div class="text-right text-xs space-y-1">
                <div class="text-gray-300">
                  {entry.territories_count} territories
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-gray-400">{entry.buildings_count} buildings</span>
                  <span class="{getTechLevelColor(entry.tech_level)}">
                    T{entry.tech_level}
                  </span>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Footer Stats -->
  {#if leaderboardData.length > 0 && !loading && !error}
    <div class="p-3 border-t border-gray-600 text-xs text-gray-500">
      <div class="flex justify-between">
        <span>{leaderboardData.length} active players</span>
        <span>Updated {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  {/if}
</div>

<!-- Legend -->
<div class="fixed bottom-4 right-4 z-20 pointer-events-none">
  {#if leaderboardData.length > 0}
    <div class="bg-gray-900/90 p-2 rounded text-xs text-gray-400 space-y-1">
      <div class="font-medium text-gray-300">Legend:</div>
      <div>👑 1st place</div>
      <div>🥈 2nd place</div> 
      <div>🥉 3rd place</div>
      <div class="text-purple-400">T1-T5</div> <span>Tech levels</span>
    </div>
  {/if}
</div>
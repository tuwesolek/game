<script>
  import { onMount } from 'svelte';
  import { dataAPI, gameAPI } from '$lib/api.ts';
  import { player } from '$lib/store.ts';
  
  let messages = [];
  let loading = false;
  let error = null;
  let newMessage = '';
  let selectedRegion = 'global';
  let refreshInterval;

  const regions = [
    { id: 'global', name: 'Global', icon: '🌍' },
    { id: 'north_america', name: 'North America', icon: '🏔️' },
    { id: 'europe', name: 'Europe', icon: '🏰' },
    { id: 'asia', name: 'Asia', icon: '🏮' },
    { id: 'oceania', name: 'Oceania', icon: '🏝️' },
    { id: 'africa', name: 'Africa', icon: '🌍' },
    { id: 'south_america', name: 'South America', icon: '🌴' }
  ];

  onMount(() => {
    loadMessages();
    // Refresh every 30 seconds
    refreshInterval = setInterval(loadMessages, 30_000);
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  });

  async function loadMessages() {
    loading = true;
    error = null;
    
    try {
      const response = await dataAPI.getBoardMessages(selectedRegion, 50);
      if (response.success && response.data) {
        messages = response.data;
      } else {
        error = response.error || 'Failed to load messages';
      }
    } catch (err) {
      error = 'Network error loading messages';
      console.error('Board messages error:', err);
    } finally {
      loading = false;
    }
  }

  async function postMessage() {
    if (!newMessage.trim() || !$player) return;
    
    const messageText = newMessage.trim();
    newMessage = '';
    
    try {
      const response = await gameAPI.postBoardMessage(
        messageText, 
        selectedRegion === 'global' ? undefined : selectedRegion
      );
      
      if (response.success) {
        // Refresh messages to show new post
        await loadMessages();
      } else {
        error = response.error || 'Failed to post message';
        newMessage = messageText; // Restore message on error
      }
    } catch (err) {
      error = 'Network error posting message';
      newMessage = messageText;
      console.error('Post message error:', err);
    }
  }

  function switchRegion(regionId: string) {
    selectedRegion = regionId;
    loadMessages();
  }

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }

  function handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      postMessage();
    }
  }

  function getPlayerColor(playerId) {
    // Generate a consistent color based on player ID
    let hash = 0;
    for (let i = 0; i < playerId.length; i++) {
      hash = playerId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 70%)`;
  }

  $: currentRegion = regions.find(r => r.id === selectedRegion) || regions[0];
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="p-4 border-b border-gray-600">
    <h2 class="font-semibold text-gray-300 mb-3 flex items-center gap-2">
      💬 Regional Board
    </h2>
    
    <!-- Region Selector -->
    <div class="grid grid-cols-2 gap-1 text-xs">
      {#each regions.slice(0, 4) as region}
        <button
          class="px-2 py-1 rounded transition-colors text-left"
          class:bg-blue-600={selectedRegion === region.id}
          class:text-white={selectedRegion === region.id}
          class:text-gray-400={selectedRegion !== region.id}
          class:hover:bg-gray-600={selectedRegion !== region.id}
          on:click={() => switchRegion(region.id)}
        >
          {region.icon} {region.name}
        </button>
      {/each}
    </div>
  </div>

  <!-- Messages -->
  <div class="flex-1 overflow-y-auto p-4 space-y-3">
    {#if loading}
      <div class="text-center text-gray-400 text-sm">
        <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mb-2"></div>
        <div>Loading messages...</div>
      </div>
    {:else if error}
      <div class="text-center">
        <div class="text-red-400 text-sm mb-2">⚠️ {error}</div>
        <button
          on:click={loadMessages}
          class="text-xs text-blue-400 hover:text-blue-300"
        >
          Try again
        </button>
      </div>
    {:else if messages.length === 0}
      <div class="text-center text-gray-500 text-sm">
        No messages in {currentRegion.name} yet. Be the first to post!
      </div>
    {:else}
      {#each messages as message}
        <div class="bg-gray-700/30 rounded p-3 text-sm">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <div 
                class="w-3 h-3 rounded-full"
                style="background-color: {getPlayerColor(message.player_id)}"
                title="Player indicator"
              ></div>
              <span class="font-medium text-gray-300">{message.faction_name || 'Anonymous'}</span>
            </div>
            <span class="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
          </div>
          <div class="text-gray-200 whitespace-pre-wrap">{message.text}</div>
          {#if message.region && message.region !== 'global'}
            <div class="mt-2 text-xs text-blue-400">
              📍 {message.region}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <!-- Message Input -->
  {#if $player}
    <div class="p-4 border-t border-gray-600">
      <div class="flex gap-2">
        <textarea
          bind:value={newMessage}
          on:keydown={handleKeydown}
          placeholder="Share intel, coordinate attacks, or chat... (Enter to send)"
          class="flex-1 bg-gray-700 text-white text-sm rounded p-2 resize-none border border-gray-600 focus:border-blue-500 focus:outline-none"
          rows="2"
          maxlength="280"
        ></textarea>
        <button
          on:click={postMessage}
          disabled={!newMessage.trim()}
          class="game-button px-4 self-end"
          title="Post message"
        >
          Send
        </button>
      </div>
      <div class="flex justify-between mt-2 text-xs text-gray-500">
        <span>Posting to {currentRegion.icon} {currentRegion.name}</span>
        <span>{newMessage.length}/280</span>
      </div>
    </div>
  {:else}
    <div class="p-4 border-t border-gray-600 text-center text-sm text-gray-500">
      Join the game to participate in regional chat
    </div>
  {/if}
</div>
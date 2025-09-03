<script>
  import { uiState, gameActions, player, availableColors } from '$lib/store.ts';
  import { getBuildingsUnlockedBy, getAvailableBuildings, getBuildingDisplayInfo, getBuildingTemplate } from '$lib/game/buildings.ts';

  let showBuildingMenu = false;
  let availableBuildings = [];

  // Reactive updates for available buildings
  $: if ($player) {
    availableBuildings = getAvailableBuildings($player);
  }

  function selectTool(tool) {
    gameActions.setSelectedTool(tool);
    if (tool !== 'building') {
      showBuildingMenu = false;
    }
  }

  function selectBuilding(buildingType) {
    gameActions.setSelectedBuilding(buildingType);
    showBuildingMenu = false;
  }

  function toggleBuildingMenu() {
    if ($uiState.selected_tool === 'building') {
      showBuildingMenu = !showBuildingMenu;
    } else {
      selectTool('building');
      showBuildingMenu = true;
    }
  }

  function toggleGrid() {
    gameActions.toggleGrid();
  }

  function toggleAlliances() {
    gameActions.toggleAlliances();
  }

  // Close building menu when clicking outside
  function handleClickOutside(event) {
    const target = event.target;
    if (!target.closest('.building-menu-container')) {
      showBuildingMenu = false;
    }
  }

  function getToolIcon(tool) {
    switch (tool) {
      case 'territory': return '✏️'; // Pencil for pixel painting
      case 'building': return '🏗️';
      case 'apx': return '💥';
      case 'inspect': return '🔍';
      default: return '?';
    }
  }

  function getBuildingIcon(buildingType: BuildingType): string {
    const info = getBuildingDisplayInfo(buildingType);
    switch (info.category) {
      case 'economy': return '💰';
      case 'military': return '⚔️';
      case 'tech': return '🔬';
      case 'utility': return '🔧';
      default: return '🏢';
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="building-menu-container relative">
  <!-- Main Toolbar -->
  <div class="flex gap-2 game-panel p-2">
    <!-- Tool Selection -->
    <div class="flex gap-1 border-r border-gray-600 pr-2">
      <button
        class="game-button"
        class:active={$uiState.selected_tool === 'territory'}
        on:click={() => selectTool('territory')}
        title="Pixel Paint Tool (T) - Paint 1x1 pixels on the map"
        aria-label="Pixel painting tool"
      >
        <span class="text-lg">{getToolIcon('territory')}</span>
      </button>

      <button
        class="game-button relative"
        class:active={$uiState.selected_tool === 'building'}
        on:click={toggleBuildingMenu}
        title="Place Buildings (B)"
        aria-label="Building placement tool"
      >
        <span class="text-lg">{getToolIcon('building')}</span>
        {#if availableBuildings.length > 0}
          <span class="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {availableBuildings.length}
          </span>
        {/if}
      </button>

      <button
        class="game-button"
        class:active={$uiState.selected_tool === 'apx'}
        on:click={() => selectTool('apx')}
        title="APX Attack (A)"
        aria-label="APX attack tool"
        disabled={!$player || $player.resources.apx === 0}
      >
        <span class="text-lg">{getToolIcon('apx')}</span>
      </button>

      <button
        class="game-button"
        class:active={$uiState.selected_tool === 'inspect'}
        on:click={() => selectTool('inspect')}
        title="Inspect Tiles (I)"
        aria-label="Tile inspection tool"
      >
        <span class="text-lg">{getToolIcon('inspect')}</span>
      </button>
    </div>

    <!-- View Options -->
    <div class="flex gap-1 border-r border-gray-600 pr-2">
      <button
        class="game-button text-sm px-2"
        class:active={$uiState.show_grid}
        on:click={toggleGrid}
        title="Toggle Grid (G)"
      >
        Grid
      </button>

      <button
        class="game-button text-sm px-2"
        class:active={$uiState.show_alliances}
        on:click={toggleAlliances}
        title="Toggle Alliance View"
      >
        Allies
      </button>
    </div>

    <!-- Zoom Level Display -->
    <div class="flex items-center text-sm text-gray-400 px-2 border-l border-gray-600 pl-2">
      <div class="flex flex-col text-xs leading-tight">
        <span>Z{Math.floor($uiState.zoom_level)}</span>
        {#if $uiState.zoom_level >= 14}
          <span class="text-green-400">Pixel Mode</span>
        {:else}
          <span class="text-gray-500">Map View</span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Building Selection Menu -->
  {#if showBuildingMenu && $uiState.selected_tool === 'building'}
    <div class="absolute top-full right-0 mt-2 game-panel p-3 min-w-72 max-h-96 overflow-y-auto z-30">
      <h3 class="text-sm font-semibold mb-3 text-gray-300">Available Buildings</h3>
      
      {#if availableBuildings.length === 0}
        <div class="text-sm text-gray-500 text-center py-4">
          No buildings available. Build a Base first!
        </div>
      {:else}
        <div class="grid gap-2">
          {#each availableBuildings as buildingType}
            {@const info = getBuildingDisplayInfo(buildingType)}
            {@const template = getBuildingTemplate ? getBuildingTemplate(buildingType) : null}
            <button
              class="building-card text-left available"
              class:selected={$uiState.selected_building === buildingType}
              on:click={() => selectBuilding(buildingType)}
            >
              <div class="flex items-start gap-3">
                <div class="text-2xl">{getBuildingIcon(buildingType)}</div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <h4 class="font-medium text-sm text-white truncate">{info.name}</h4>
                    <div class="text-xs text-gray-400">T{info.tier}</div>
                  </div>
                  <p class="text-xs text-gray-400 mt-1">{info.description}</p>
                  {#if template}
                    <div class="flex items-center justify-between mt-2 text-xs">
                      <span class="px-display">{template.cost_px} PX</span>
                      <span class="text-gray-500">{template.size.width}×{template.size.height}</span>
                      {#if template.min_colors_required > 8}
                        <span class="text-purple-400">{template.min_colors_required} colors</span>
                      {/if}
                    </div>
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        </div>
      {/if}

      <!-- Locked Buildings Preview -->
      {#if $player && $player.tech_level < 5}
        <div class="mt-4 pt-3 border-t border-gray-600">
          <h4 class="text-xs font-semibold mb-2 text-gray-500">Next Tier Preview</h4>
          <div class="text-xs text-gray-600">
            Unlock more buildings by placing required structures and gaining colors.
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Selected Tool Display -->
{#if $uiState.selected_tool !== 'territory'}
  <div class="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-gray-900/90 px-3 py-1 rounded-full text-sm z-10 pointer-events-none">
    {#if $uiState.selected_tool === 'building' && $uiState.selected_building}
      {@const info = getBuildingDisplayInfo($uiState.selected_building)}
      Building: {info.name}
    {:else if $uiState.selected_tool === 'apx'}
      APX Attack Mode
    {:else if $uiState.selected_tool === 'inspect'}
      Inspection Mode
    {/if}
  </div>
{/if}

<style>
  .building-menu-container {
    /* Ensure proper stacking context */
  }
</style>
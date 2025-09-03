<script lang="ts">
  import { uiState, gameActions, availableColors } from '$lib/store.js';
  import { COLORS } from '$lib/game/constants.js';

  let showColorPicker = false;
  
  // Default territory colors (grayscale)
  const territoryColors = [
    '#000000', '#1f2937', '#374151', '#4b5563', 
    '#6b7280', '#9ca3af', '#d1d5db', '#ffffff'
  ];

  function selectColor(color: string) {
    gameActions.setSelectedColor(color);
    if ($uiState.selected_tool !== 'territory') {
      gameActions.setSelectedTool('territory');
    }
    showColorPicker = false;
  }

  function toggleColorPicker() {
    showColorPicker = !showColorPicker;
  }

  function isGrayscale(color: string): boolean {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return r === g && g === b;
  }

  function getColorType(color: string): 'territory' | 'building' {
    return isGrayscale(color) ? 'territory' : 'building';
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.palette-container')) {
      showColorPicker = false;
    }
  }

  // Quick access colors based on current tool
  $: quickColors = $uiState.selected_tool === 'territory' 
    ? territoryColors 
    : Array.from($availableColors).filter(color => !isGrayscale(color)).slice(0, 8);
</script>

<svelte:window on:click={handleClickOutside} />

<div class="palette-container relative">
  <!-- Current Color Display -->
  <div class="game-panel p-2 flex items-center gap-3">
    <!-- Selected Color -->
    <div class="flex items-center gap-2">
      <button
        class="color-swatch selected border-2"
        style="background-color: {$uiState.selected_color}"
        on:click={toggleColorPicker}
        title="Current color - click to change"
        aria-label="Current color palette"
      ></button>
      <div class="text-xs text-gray-400">
        {getColorType($uiState.selected_color) === 'territory' ? 'Territory' : 'Building'}
      </div>
    </div>

    <!-- Quick Color Selection -->
    <div class="flex gap-1">
      {#each quickColors.slice(0, 4) as color}
        <button
          class="color-swatch"
          class:selected={$uiState.selected_color === color}
          style="background-color: {color}"
          on:click={() => selectColor(color)}
          title="{getColorType(color)} color"
        ></button>
      {/each}
    </div>

    <!-- More Colors Button -->
    <button
      class="game-button text-xs px-2"
      class:active={showColorPicker}
      on:click={toggleColorPicker}
      title="Show all colors"
    >
      More
    </button>
  </div>

  <!-- Extended Color Picker -->
  {#if showColorPicker}
    <div class="absolute bottom-full left-0 mb-2 game-panel p-4 min-w-80 z-30">
      <h3 class="text-sm font-semibold mb-3 text-gray-300">Color Palette</h3>
      
      <!-- Territory Colors (Grayscale) -->
      <div class="mb-4">
        <h4 class="text-xs font-medium mb-2 text-gray-400">Territory (Grayscale)</h4>
        <div class="grid grid-cols-8 gap-2">
          {#each territoryColors as color}
            <button
              class="color-swatch"
              class:selected={$uiState.selected_color === color}
              style="background-color: {color}"
              on:click={() => selectColor(color)}
              title="Territory color"
            ></button>
          {/each}
        </div>
      </div>

      <!-- Building Colors -->
      <div>
        <h4 class="text-xs font-medium mb-2 text-gray-400 flex items-center justify-between">
          Buildings 
          <span class="text-xs text-gray-500">({$availableColors.length}/512)</span>
        </h4>
        
        {#if $availableColors.length > 8}
          <div class="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
            {#each Array.from($availableColors).filter(color => !isGrayscale(color)) as color}
              <button
                class="color-swatch"
                class:selected={$uiState.selected_color === color}
                style="background-color: {color}"
                on:click={() => selectColor(color)}
                title="Building color"
              ></button>
            {/each}
          </div>
        {:else}
          <div class="text-sm text-gray-500 text-center py-4">
            Build Color Factories to unlock more colors!
          </div>
        {/if}
      </div>

      <!-- Color Info -->
      <div class="mt-4 pt-3 border-t border-gray-600 text-xs text-gray-500">
        <div class="flex justify-between">
          <span>Current: {$uiState.selected_color.toUpperCase()}</span>
          <span>{getColorType($uiState.selected_color) === 'territory' ? '🗺️' : '🏗️'}</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Tool Hint -->
{#if $uiState.selected_tool === 'territory'}
  <div class="text-xs text-gray-500 mt-2">
    ✏️ Pixel Paint: Click & drag to paint individual pixels. Grid auto-shows at zoom 14+
  </div>
{:else if $uiState.selected_tool === 'building'}
  <div class="text-xs text-gray-500 mt-2">
    Building mode: Select from toolbar
  </div>
{/if}

<style>
  .palette-container {
    /* Ensure proper stacking */
  }
  
  .color-swatch {
    transition: all 0.15s ease;
  }
  
  .color-swatch:hover {
    transform: scale(1.1);
    z-index: 10;
    position: relative;
  }
</style>
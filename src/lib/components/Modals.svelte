<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  let showRules = false;
  let showChangelog = false;
  let showShortcuts = false;
  let showSettings = false;

  const dispatch = createEventDispatcher();

  function closeModal() {
    showRules = false;
    showChangelog = false;
    showShortcuts = false;
    showSettings = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
    
    // Global shortcuts
    if (event.key === '?') {
      event.preventDefault();
      showShortcuts = true;
    }
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  // Expose functions to parent component
  export function openRules() { showRules = true; }
  export function openChangelog() { showChangelog = true; }
  export function openShortcuts() { showShortcuts = true; }
  export function openSettings() { showSettings = true; }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Help Button (floating) -->
<div class="fixed bottom-4 right-20 z-30">
  <div class="flex gap-2">
    <button
      class="game-button p-3 rounded-full"
      on:click={() => showShortcuts = true}
      title="Keyboard shortcuts (?)"
    >
      ❓
    </button>
    <button
      class="game-button p-3 rounded-full"
      on:click={() => showRules = true}
      title="Game rules"
    >
      📋
    </button>
  </div>
</div>

<!-- Rules Modal -->
{#if showRules}
  <div class="modal-overlay" on:click={handleOverlayClick}>
    <div class="modal-content">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-game-accent">Game Rules</h2>
        <button on:click={closeModal} class="text-gray-400 hover:text-white text-xl">✕</button>
      </div>
      
      <div class="space-y-4 text-sm max-h-96 overflow-y-auto">
        <section>
          <h3 class="font-semibold text-gray-200 mb-2">🎯 Objective</h3>
          <p class="text-gray-300">
            Control 25% of the world map or eliminate all opponents to achieve victory. 
            Build your pixel empire through strategic territory expansion and building construction.
          </p>
        </section>

        <section>
          <h3 class="font-semibold text-gray-200 mb-2">🗺️ Territory Control</h3>
          <ul class="text-gray-300 space-y-1 ml-4">
            <li>• Territory = grayscale pixels only</li>
            <li>• Buildings = colored pixels only</li>
            <li>• Cost = 1 PX per pixel placed</li>
            <li>• Cannot build on enemy territory</li>
          </ul>
        </section>

        <section>
          <h3 class="font-semibold text-gray-200 mb-2">🏗️ Buildings & Tech</h3>
          <ul class="text-gray-300 space-y-1 ml-4">
            <li>• Start with Base (unlocks all T1 buildings)</li>
            <li>• GenPx: Generates pixels over time</li>
            <li>• Storage: Increases pixel capacity</li>
            <li>• ColorFactory: Unlocks new colors</li>
            <li>• Science: Enables research progression</li>
            <li>• Higher tiers require more colors</li>
          </ul>
        </section>

        <section>
          <h3 class="font-semibold text-gray-200 mb-2">💰 Resources</h3>
          <ul class="text-gray-300 space-y-1 ml-4">
            <li>• PX: Primary currency for all actions</li>
            <li>• EXP: Experience for tech advancement</li>
            <li>• APX: Anti-pixel for attacking enemies</li>
            <li>• Convert: 10 PX ⇄ 1 EXP ⇄ 8 PX</li>
          </ul>
        </section>

        <section>
          <h3 class="font-semibold text-gray-200 mb-2">⚔️ Combat & APX</h3>
          <ul class="text-gray-300 space-y-1 ml-4">
            <li>• APX attacks can erase enemy pixels</li>
            <li>• Different shapes: point, line, area, building</li>
            <li>• Success depends on enemy defenses</li>
            <li>• Cooldowns prevent spam attacks</li>
          </ul>
        </section>

        <section>
          <h3 class="font-semibold text-gray-200 mb-2">🛡️ Anti-Griefing</h3>
          <ul class="text-gray-300 space-y-1 ml-4">
            <li>• Rate limits per region</li>
            <li>• Minimum distance between bases</li>
            <li>• APX cooldowns and diminishing returns</li>
            <li>• Progressive costs for expansion</li>
          </ul>
        </section>
      </div>
      
      <div class="mt-6 text-center">
        <button class="game-button" on:click={closeModal}>Got it!</button>
      </div>
    </div>
  </div>
{/if}

<!-- Shortcuts Modal -->
{#if showShortcuts}
  <div class="modal-overlay" on:click={handleOverlayClick}>
    <div class="modal-content">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-game-accent">Keyboard Shortcuts</h2>
        <button on:click={closeModal} class="text-gray-400 hover:text-white text-xl">✕</button>
      </div>
      
      <div class="space-y-4 text-sm">
        <section>
          <h3 class="font-semibold text-gray-200 mb-2">🎮 Game Controls</h3>
          <div class="grid grid-cols-2 gap-2 text-gray-300">
            <div><kbd>T</kbd> Territory mode</div>
            <div><kbd>B</kbd> Building mode</div>
            <div><kbd>A</kbd> APX attack mode</div>
            <div><kbd>I</kbd> Inspect mode</div>
            <div><kbd>G</kbd> Toggle grid</div>
            <div><kbd>Tab</kbd> Toggle sidebar</div>
            <div><kbd>M</kbd> Toggle board/leaderboard</div>
            <div><kbd>?</kbd> Show shortcuts</div>
          </div>
        </section>

        <section>
          <h3 class="font-semibold text-gray-200 mb-2">🗺️ Map Controls</h3>
          <div class="grid grid-cols-2 gap-2 text-gray-300">
            <div><kbd>Click</kbd> Place pixel/building</div>
            <div><kbd>Right-click</kbd> Quick APX attack</div>
            <div><kbd>Drag</kbd> Pan map</div>
            <div><kbd>Scroll</kbd> Zoom in/out</div>
            <div><kbd>Double-click</kbd> Zoom to location</div>
            <div><kbd>Esc</kbd> Cancel action/close</div>
          </div>
        </section>

        <section>
          <h3 class="font-semibold text-gray-200 mb-2">💬 Communication</h3>
          <div class="grid grid-cols-2 gap-2 text-gray-300">
            <div><kbd>Enter</kbd> Send board message</div>
            <div><kbd>Shift+Enter</kbd> New line in message</div>
          </div>
        </section>

        <section class="text-xs text-gray-500">
          <p>💡 Tip: Hold <kbd>Shift</kbd> while clicking to place multiple pixels rapidly</p>
        </section>
      </div>
      
      <div class="mt-6 text-center">
        <button class="game-button" on:click={closeModal}>Close</button>
      </div>
    </div>
  </div>
{/if}

<!-- Changelog Modal -->
{#if showChangelog}
  <div class="modal-overlay" on:click={handleOverlayClick}>
    <div class="modal-content">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-game-accent">Changelog</h2>
        <button on:click={closeModal} class="text-gray-400 hover:text-white text-xl">✕</button>
      </div>
      
      <div class="space-y-4 text-sm max-h-96 overflow-y-auto">
        <section>
          <h3 class="font-semibold text-gray-200 mb-2">v1.0.0 - First Playable</h3>
          <ul class="text-gray-300 space-y-1 ml-4">
            <li>• Complete T1 building system</li>
            <li>• Real-time multiplayer pixel placement</li>
            <li>• MapLibre GL integration with OpenFreeMap</li>
            <li>• Resource generation and conversion</li>
            <li>• Basic APX attack system</li>
            <li>• Regional board messaging</li>
            <li>• Leaderboard and statistics</li>
            <li>• PWA support for mobile</li>
            <li>• Anti-griefing rate limiting</li>
            <li>• Keyboard shortcuts</li>
          </ul>
        </section>

        <section>
          <h3 class="font-semibold text-gray-200 mb-2">🚧 Known Limitations</h3>
          <ul class="text-gray-300 space-y-1 ml-4">
            <li>• T2-T5 buildings are data stubs</li>
            <li>• Alliance system is basic</li>
            <li>• No persistent server state</li>
            <li>• Limited mobile optimization</li>
            <li>• Basic AI/NPC opponents</li>
          </ul>
        </section>

        <section>
          <h3 class="font-semibold text-gray-200 mb-2">🔮 Planned Features</h3>
          <ul class="text-gray-300 space-y-1 ml-4">
            <li>• Full T2-T5 building implementation</li>
            <li>• Advanced alliance mechanics</li>
            <li>• Persistent world state</li>
            <li>• Mobile app version</li>
            <li>• Spectator mode</li>
            <li>• Custom game modes</li>
            <li>• Achievement system</li>
          </ul>
        </section>
      </div>
      
      <div class="mt-6 text-center">
        <button class="game-button" on:click={closeModal}>Close</button>
      </div>
    </div>
  </div>
{/if}

<!-- Settings Modal -->
{#if showSettings}
  <div class="modal-overlay" on:click={handleOverlayClick}>
    <div class="modal-content">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-game-accent">Settings</h2>
        <button on:click={closeModal} class="text-gray-400 hover:text-white text-xl">✕</button>
      </div>
      
      <div class="space-y-4 text-sm">
        <section>
          <h3 class="font-semibold text-gray-200 mb-2">🎨 Display</h3>
          <div class="space-y-2">
            <label class="flex items-center gap-2">
              <input type="checkbox" class="rounded" />
              <span class="text-gray-300">Show grid by default</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" class="rounded" />
              <span class="text-gray-300">Show alliance territories</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" class="rounded" />
              <span class="text-gray-300">Smooth zoom transitions</span>
            </label>
          </div>
        </section>

        <section>
          <h3 class="font-semibold text-gray-200 mb-2">🔊 Audio</h3>
          <div class="space-y-2">
            <label class="flex items-center gap-2">
              <input type="checkbox" class="rounded" />
              <span class="text-gray-300">Sound effects</span>
            </label>
            <label class="flex items-center gap-2">
              <input type="checkbox" class="rounded" />
              <span class="text-gray-300">Notification sounds</span>
            </label>
          </div>
        </section>

        <section>
          <h3 class="font-semibold text-gray-200 mb-2">🌐 Language</h3>
          <select class="bg-gray-700 text-white rounded p-2 w-full">
            <option value="en">English</option>
            <option value="pl">Polski</option>
          </select>
        </section>

        <section>
          <h3 class="font-semibold text-gray-200 mb-2">💾 Data</h3>
          <div class="space-y-2">
            <button class="game-button w-full">Export Game Data</button>
            <button class="game-button w-full">Clear Local Cache</button>
          </div>
        </section>
      </div>
      
      <div class="mt-6 text-center space-x-2">
        <button class="game-button" on:click={closeModal}>Save</button>
        <button class="game-button" on:click={closeModal}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style>
  kbd {
    @apply bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs font-mono border border-gray-600;
  }
</style>
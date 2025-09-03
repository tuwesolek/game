<script>
  import '../styles/app.css';
  
  // Accept and ignore the params prop to prevent warnings
  export let params = undefined;
</script>

<main class="h-screen w-screen overflow-hidden bg-game-bg text-gray-100">
  <slot />
</main>

<svelte:head>
  <title>Pixel Dominion - Real-time Pixel RTS</title>
  <meta name="description" content="Real-time pixel-based strategy game with territory control and building mechanics" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <meta name="theme-color" content="#1a1a1a" />
  <link rel="manifest" href="/manifest.webmanifest" />
</svelte:head>
# Pixel Dominion - OpenAI Codex Context

## Codebase Structure for Code Generation

### File Tree Overview
```
pixel-dominion/
├── src/
│   ├── lib/
│   │   ├── game/           # Core game logic
│   │   ├── map/            # Spatial systems  
│   │   ├── components/     # UI components
│   │   ├── store.ts        # State management
│   │   ├── api.ts          # API client
│   │   ├── ws.ts           # WebSocket client
│   │   └── types.ts        # Type definitions
│   ├── routes/
│   │   ├── api/            # Server endpoints
│   │   └── +page.svelte    # Main game UI
│   └── styles/app.css      # Global styles
├── static/                 # Static assets
├── Dockerfile             # Container build
└── package.json           # Dependencies
```

### Key Patterns for Code Generation

#### Type-Safe API Endpoints
```typescript
// Pattern for new API routes
export const POST: RequestHandler = async ({ request }) => {
  try {
    const data = await request.json();
    
    // Validation with zod
    const validation = Schema.safeParse(data);
    if (!validation.success) {
      return json({ success: false, error: validation.error.message });
    }
    
    // Business logic
    const result = await processRequest(validation.data);
    
    return json({ success: true, data: result });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
};
```

#### Svelte Component Pattern
```svelte
<script lang="ts">
  import { store } from '$lib/store.js';
  import type { ComponentProps } from '$lib/types.js';

  export let prop: string;
  
  let localState = '';
  
  // Reactive statements
  $: computedValue = doSomething($store, prop);
  
  function handleAction() {
    // Update store
    store.update(current => ({ ...current, newValue: localState }));
  }
</script>

<div class="component-class">
  <!-- Component template -->
</div>

<style>
  /* Scoped styles */
</style>
```

#### Game Logic Function Pattern
```typescript
// Pure functions for game mechanics
export function calculateSomething(
  input: InputType,
  config: GameConfig
): ResultType {
  // Validation
  if (!isValid(input)) {
    throw new Error('Invalid input');
  }
  
  // Calculation logic
  const result = processLogic(input, config);
  
  // Return typed result
  return {
    success: true,
    value: result,
    cost: calculateCost(input),
    timestamp: Date.now()
  };
}
```

### Common Code Generation Tasks

#### Adding New Building Types
1. **Building Template** (in `/src/lib/game/buildings.ts`):
```typescript
NewBuilding: {
  kind: 'NewBuilding',
  size: { width: 3, height: 3 },
  cost_px: 15,
  min_colors_required: TECH_TIER_REQUIREMENTS[2],
  effects: {
    on_tick: { px_rate: 2 }
  },
  prerequisites: {
    tech_tier: 2,
    deps: ['RequiredBuilding']
  }
}
```

2. **UI Integration** (update building selection menus)
3. **Validation Rules** (update placement validation)

#### Adding New API Endpoints
1. **Create route file**: `/src/routes/api/newroute/+server.ts`
2. **Add zod schema** for request validation
3. **Implement business logic** with error handling
4. **Update API client** in `/src/lib/api.ts`
5. **Add TypeScript types** in `/src/lib/types.ts`

#### Adding New UI Components
1. **Create component**: `/src/components/NewComponent.svelte`
2. **Define props interface** with TypeScript
3. **Import and use stores** for reactive state
4. **Add to parent component** with proper props
5. **Style with Tailwind classes** following existing patterns

### Debugging Patterns

#### Common Issues and Solutions
```typescript
// WebSocket connection issues
if (!ws.connected) {
  console.error('WebSocket not connected');
  // Trigger reconnection
  ws.reconnect();
}

// Map rendering issues  
map.on('load', () => {
  // Ensure map is loaded before adding layers
  addPixelOverlay();
});

// State update issues
store.subscribe(value => {
  console.log('Store updated:', value);
  // Debug state changes
});
```

#### Performance Optimization Points
- **Canvas rendering**: Batch updates, use requestAnimationFrame
- **WebSocket messages**: Throttle/debounce rapid updates
- **Component updates**: Use reactive statements efficiently
- **Memory leaks**: Clean up intervals, event listeners

### Testing Code Generation

#### Unit Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '../src/lib/module.js';

describe('functionToTest', () => {
  it('should handle valid input', () => {
    const result = functionToTest(validInput);
    expect(result.success).toBe(true);
    expect(result.value).toBe(expectedValue);
  });
  
  it('should reject invalid input', () => {
    expect(() => functionToTest(invalidInput)).toThrow();
  });
});
```

#### Integration Test Pattern
```typescript
// Test API endpoint
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testData)
});

const result = await response.json();
expect(result.success).toBe(true);
```

### Configuration Files

#### Environment Variables
```bash
# .env
PUBLIC_TILE_STYLE_URL=https://tiles.openfreemap.org/styles/bright
PUBLIC_WS_URL=ws://37.60.229.209/ws
PUBLIC_COOLDOWN_SECONDS=30
```

#### Game Constants
```typescript
// Pattern for adding new constants
export const NEW_FEATURE_CONFIG = {
  ENABLED: true,
  MAX_VALUE: 100,
  COOLDOWN_MS: 5000,
  RATE_LIMIT: 10
} as const;
```

### Build and Deploy Commands
```bash
# Development
npm run dev

# Build for production  
npm run build

# Docker build
docker build -t pixel-dominion .

# Run tests
npm test

# Type check
npm run check
```

### Code Style Guidelines
- **Use TypeScript everywhere**: No `any` types
- **Follow existing patterns**: Consistent code structure
- **Validate all inputs**: Use zod for runtime validation
- **Handle errors gracefully**: Return proper error responses
- **Document complex logic**: Add comments for game mechanics
- **Use semantic naming**: Clear variable and function names
- **Keep functions pure**: Avoid side effects in game logic
- **Follow reactive patterns**: Use Svelte stores appropriately

### Quick Reference for Common Tasks
- **Add building effect**: Update `applyBuildingTick` in economy.ts
- **Add validation rule**: Extend functions in rules.ts
- **Add UI component**: Create .svelte file with proper props
- **Add API route**: Create +server.ts with validation
- **Add WebSocket event**: Update ws.ts message handlers
- **Add game constant**: Update constants.ts
- **Add new page**: Create +page.svelte in routes/
- **Add styling**: Use Tailwind classes, follow existing patterns

This context should help generate correct, consistent code that follows the established patterns and maintains the game's architecture integrity.
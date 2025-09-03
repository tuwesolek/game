// MapLibre GL JS theme configuration and style overrides for Pixel Dominion

import type { StyleSpecification, TransformRequestFunction } from 'maplibre-gl';
import { COLORS } from '../game/constants.js';

// CDN pass-through for OpenFreeMap tiles with caching optimization
export const transformRequest: TransformRequestFunction = (url: string, resourceType: string) => {
	// Pass through OpenFreeMap tiles with cache headers for Cloudflare optimization
	if (url.startsWith('https://tiles.openfreemap.org/')) {
		return {
			url,
			headers: {
				'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable'
			}
		};
	}
	return { url };
};

// Custom style optimized for dark theme pixel art gameplay
export const gameMapStyle: StyleSpecification = {
	version: 8,
	name: 'Pixel Dominion - Game Optimized',
	metadata: {
		'mapbox:autocomposite': false,
		'mapbox:type': 'template',
		'pixel-dominion:version': '1.0'
	},
	glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
	sprite: 'https://tiles.openfreemap.org/styles/bright/sprite',
	sources: {
		openmaptiles: {
			type: 'vector',
			url: 'https://tiles.openfreemap.org/planet',
			// Support detailed pixel art editing at high zoom
			maxzoom: 20,
			attribution: '© OpenFreeMap contributors'
		}
	},
	layers: [
		// Dark base optimized for pixel overlay visibility
		{
			id: 'background',
			type: 'background',
			paint: {
				'background-color': '#0f0f0f'
			}
		},
		// Minimal landuse for context without distraction
		{
			id: 'landuse',
			type: 'fill',
			source: 'openmaptiles',
			'source-layer': 'landuse',
			maxzoom: 12, // Hide at high zoom to emphasize pixels
			paint: {
				'fill-color': [
					'match',
					['get', 'class'],
					'park', '#1a3d1a',
					'residential', '#1a1a1a',
					'commercial', '#2a1a1a',
					'industrial', '#3a2a2a',
					'#1a1a1a'
				],
				'fill-opacity': 0.4
			}
		},
		// Water bodies for geographic context
		{
			id: 'water',
			type: 'fill',
			source: 'openmaptiles',
			'source-layer': 'water',
			paint: {
				'fill-color': '#1e3a8a',
				'fill-opacity': 0.6
			}
		},
		// Minimal road network for reference
		{
			id: 'roads-major',
			type: 'line',
			source: 'openmaptiles',
			'source-layer': 'transportation',
			filter: ['in', 'class', 'primary', 'trunk', 'motorway'],
			maxzoom: 14,
			paint: {
				'line-color': '#374151',
				'line-width': [
					'interpolate',
					['linear'],
					['zoom'],
					6, 0.5,
					10, 1,
					14, 2
				],
				'line-opacity': 0.3
			}
		},
		// Country/state boundaries for strategic context
		{
			id: 'boundaries',
			type: 'line',
			source: 'openmaptiles',
			'source-layer': 'boundary',
			filter: ['<=', 'admin_level', 4],
			paint: {
				'line-color': '#6b7280',
				'line-width': [
					'interpolate',
					['linear'],
					['zoom'],
					4, 0.5,
					8, 1,
					12, 2
				],
				'line-opacity': 0.4,
				'line-dasharray': [2, 2]
			}
		},
		// City labels for orientation (fade at high zoom)
		{
			id: 'place-labels',
			type: 'symbol',
			source: 'openmaptiles',
			'source-layer': 'place',
			filter: ['in', 'class', 'city', 'town'],
			maxzoom: 12,
			layout: {
				'text-field': '{name}',
				'text-font': ['Open Sans Regular'],
				'text-size': [
					'interpolate',
					['linear'],
					['zoom'],
					4, 10,
					8, 12,
					12, 14
				],
				'text-anchor': 'center'
			},
			paint: {
				'text-color': '#9ca3af',
				'text-halo-color': '#111827',
				'text-halo-width': 1,
				'text-opacity': [
					'interpolate',
					['linear'],
					['zoom'],
					10, 0.8,
					12, 0.2
				]
			}
		}
	]
};

// Pixel overlay layer configuration
export const pixelLayerConfig = {
	id: 'pixel-overlay',
	type: 'canvas' as const,
	// Canvas source will be added dynamically
};

// Grid overlay for snap-to-grid functionality
export const gridLayerConfig = {
	id: 'grid-overlay', 
	type: 'canvas' as const,
	paint: {
		'canvas-opacity': 0.3
	}
};

// Selection highlight layer
export const selectionLayerConfig = {
	id: 'selection-overlay',
	type: 'canvas' as const,
	paint: {
		'canvas-opacity': 0.8
	}
};

// Map interaction settings optimized for pixel gameplay
export const mapInteractionConfig = {
	// Disable rotation for consistent pixel alignment
	bearing: 0,
	pitch: 0,
	dragRotate: false,
	pitchWithRotate: false,
	touchZoomRotate: false,
	
	// Optimize zoom levels for pixel art editing
	minZoom: 4,   // World view for strategy
	maxZoom: 22,  // Ultra close-up pixel editing
	
	// Smooth transitions but not too slow for RTS gameplay
	easing: (t: number) => t * (2 - t), // easeOutQuad
	
	// Performance optimizations
	renderWorldCopies: false,
	fadeDuration: 150,
	
	// Attribution requirement for OpenFreeMap
	attributionControl: true,
	customAttribution: '© OpenFreeMap contributors | © Pixel Dominion'
};

// Color palette for different game elements on map
export const mapColors = {
	neutral: COLORS.NEUTRAL_TILE,
	territory: COLORS.TERRITORY_GRAY,
	selection: COLORS.SELECTION_HIGHLIGHT,
	
	// Building type indicators
	base: '#8b5cf6',
	generator: '#f59e0b', 
	storage: '#06b6d4',
	factory: '#10b981',
	science: '#3b82f6',
	military: '#ef4444',
	
	// Overlay states
	valid_placement: '#22c55e',
	invalid_placement: '#ef4444',
	under_attack: '#f97316',
	allied_territory: '#06b6d4'
} as const;
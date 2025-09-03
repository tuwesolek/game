// MapLibre GL JS theme configuration and style overrides for Pixel Dominion

import type { StyleSpecification, TransformRequestFunction } from 'maplibre-gl';
import { COLORS } from '../game/constants.js';
import style from '../../../config/maplibre-style.json';

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

// Use the imported style and cast it to StyleSpecification
export const gameMapStyle: StyleSpecification = style as StyleSpecification;

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
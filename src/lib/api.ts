// API client with zod validation for all server communication

import { z } from 'zod';
import type { ApiResponse, PlaceActionRequest, ConvertResourcesRequest, LeaderboardEntry, TileCoord, BuildingType, ColorHex } from './types.js';

// Zod schemas for request validation
const TileCoordSchema = z.object({
	lat_idx: z.number().int(),
	lon_idx: z.number().int()
});

const PlaceActionSchema = z.object({
	action: z.enum(['draw_territory', 'place_building']),
	tiles: z.array(TileCoordSchema),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
	building_type: z.string().optional()
});

const ConvertResourcesSchema = z.object({
	from: z.enum(['px', 'exp', 'apx']),
	to: z.enum(['px', 'exp', 'apx']),
	amount: z.number().positive()
});

const PostMessageSchema = z.object({
	text: z.string().max(280), // Twitter-style limit
	region: z.string().optional()
});

// API configuration
const API_BASE = '/api';

// Generic API request wrapper with error handling
async function apiRequest<T = any>(
	endpoint: string, 
	options: RequestInit = {}
): Promise<ApiResponse<T>> {
	try {
		const response = await fetch(`${API_BASE}${endpoint}`, {
			headers: {
				'Content-Type': 'application/json',
				...options.headers
			},
			...options
		});

		if (!response.ok) {
			return {
				success: false,
				error: `HTTP ${response.status}: ${response.statusText}`,
				timestamp: Date.now()
			};
		}

		const data = await response.json();
		return {
			success: true,
			data,
			timestamp: Date.now()
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
			timestamp: Date.now()
		};
	}
}

// Game action APIs
export const gameAPI = {
	// Place pixels (territory or buildings)
	async placePixels(request: PlaceActionRequest): Promise<ApiResponse> {
		// Validate request data
		const validation = PlaceActionSchema.safeParse(request);
		if (!validation.success) {
			return {
				success: false,
				error: `Validation error: ${validation.error.message}`,
				timestamp: Date.now()
			};
		}

		return apiRequest('/place', {
			method: 'POST',
			body: JSON.stringify(request)
		});
	},

	// Convert resources (px <-> exp)
	async convertResources(request: ConvertResourcesRequest): Promise<ApiResponse> {
		const validation = ConvertResourcesSchema.safeParse(request);
		if (!validation.success) {
			return {
				success: false,
				error: `Validation error: ${validation.error.message}`,
				timestamp: Date.now()
			};
		}

		return apiRequest('/convert', {
			method: 'POST',
			body: JSON.stringify(request)
		});
	},

	// Launch APX attack
	async launchApxAttack(shape: 'point' | 'line' | 'area' | 'building', position: TileCoord, targetRegion: string): Promise<ApiResponse> {
		const request = {
			shape,
			position,
			target_region: targetRegion
		};

		return apiRequest('/apx-attack', {
			method: 'POST',
			body: JSON.stringify(request)
		});
	},

	// Alliance operations
	async createAlliance(name: string, policies: any): Promise<ApiResponse> {
		return apiRequest('/alliance/create', {
			method: 'POST',
			body: JSON.stringify({ name, policies })
		});
	},

	async joinAlliance(allianceId: string): Promise<ApiResponse> {
		return apiRequest(`/alliance/${allianceId}/join`, {
			method: 'POST'
		});
	},

	async leaveAlliance(allianceId: string): Promise<ApiResponse> {
		return apiRequest(`/alliance/${allianceId}/leave`, {
			method: 'POST'
		});
	},

	// Research and tech progression
	async researchTech(techPath: string): Promise<ApiResponse> {
		return apiRequest('/research', {
			method: 'POST',
			body: JSON.stringify({ tech_path: techPath })
		});
	},

	// Board messaging
	async postBoardMessage(text: string, region?: string): Promise<ApiResponse> {
		const request = { text, region };
		const validation = PostMessageSchema.safeParse(request);
		
		if (!validation.success) {
			return {
				success: false,
				error: `Message validation failed: ${validation.error.message}`,
				timestamp: Date.now()
			};
		}

		return apiRequest('/board/post', {
			method: 'POST',
			body: JSON.stringify(request)
		});
	},

	// Player trading
	async initiateTrade(targetPlayerId: string, offer: any, request: any): Promise<ApiResponse> {
		return apiRequest('/trade/initiate', {
			method: 'POST',
			body: JSON.stringify({
				target_player_id: targetPlayerId,
				offer,
				request
			})
		});
	}
};

// Data fetching APIs
export const dataAPI = {
	// Get current leaderboard
	async getLeaderboard(timeframe: '24h' | 'all-time' = '24h'): Promise<ApiResponse<LeaderboardEntry[]>> {
		return apiRequest(`/leaderboard?timeframe=${timeframe}`);
	},

	// Get player profile
	async getPlayerProfile(playerId: string): Promise<ApiResponse> {
		return apiRequest(`/player/${playerId}`);
	},

	// Get alliance information
	async getAlliance(allianceId: string): Promise<ApiResponse> {
		return apiRequest(`/alliance/${allianceId}`);
	},

	// Get board messages for a region
	async getBoardMessages(region: string, limit: number = 50): Promise<ApiResponse> {
		return apiRequest(`/board/messages?region=${region}&limit=${limit}`);
	},

	// Get game statistics
	async getGameStats(): Promise<ApiResponse> {
		return apiRequest('/stats');
	},

	// Get player's building catalog
	async getBuildingCatalog(): Promise<ApiResponse> {
		return apiRequest('/buildings');
	},

	// Get tech tree information
	async getTechTree(): Promise<ApiResponse> {
		return apiRequest('/tech-tree');
	}
};

// Real-time status APIs
export const statusAPI = {
	// Get online player count
	async getOnlineCount(): Promise<ApiResponse<{ count: number }>> {
		return apiRequest('/status/online');
	},

	// Get player's active cooldowns
	async getCooldowns(): Promise<ApiResponse> {
		return apiRequest('/status/cooldowns');
	},

	// Check rate limit status
	async getRateLimitStatus(): Promise<ApiResponse> {
		return apiRequest('/status/rate-limits');
	},

	// Health check
	async healthCheck(): Promise<ApiResponse> {
		return apiRequest('/health');
	}
};

// Utility functions for common API patterns
export const apiUtils = {
	// Batch multiple API calls with error handling
	async batch<T>(requests: Promise<ApiResponse<T>>[]): Promise<ApiResponse<T>[]> {
		try {
			return await Promise.all(requests);
		} catch (error) {
			console.error('Batch API request failed:', error);
			return requests.map(() => ({
				success: false,
				error: 'Batch request failed',
				timestamp: Date.now()
			}));
		}
	},

	// Retry API request with exponential backoff
	async retry<T>(
		requestFn: () => Promise<ApiResponse<T>>,
		maxAttempts: number = 3,
		baseDelay: number = 1000
	): Promise<ApiResponse<T>> {
		let lastError: ApiResponse<T> | null = null;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				const result = await requestFn();
				if (result.success) {
					return result;
				}
				lastError = result;
			} catch (error) {
				lastError = {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
					timestamp: Date.now()
				};
			}

			if (attempt < maxAttempts) {
				const delay = baseDelay * Math.pow(2, attempt - 1);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}

		return lastError!;
	},

	// Validate color hex format
	isValidColor(color: string): boolean {
		return /^#[0-9A-Fa-f]{6}$/.test(color);
	},

	// Validate tile coordinates
	isValidTileCoord(coord: any): coord is TileCoord {
		return (
			typeof coord === 'object' &&
			typeof coord.lat_idx === 'number' &&
			typeof coord.lon_idx === 'number' &&
			Number.isInteger(coord.lat_idx) &&
			Number.isInteger(coord.lon_idx)
		);
	},

	// Calculate request hash for deduplication
	requestHash(endpoint: string, data?: any): string {
		const payload = JSON.stringify({ endpoint, data });
		// Simple hash function (use crypto.subtle in production)
		let hash = 0;
		for (let i = 0; i < payload.length; i++) {
			const char = payload.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash.toString(36);
	}
};

// Export all API modules
export default {
	game: gameAPI,
	data: dataAPI,
	status: statusAPI,
	utils: apiUtils
};
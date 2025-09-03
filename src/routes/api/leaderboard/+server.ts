// Leaderboard API endpoint

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ApiResponse, LeaderboardEntry } from '../../../lib/types.js';

// Leaderboard data management
// TODO(prod): Replace with proper database queries
const mockLeaderboardData: LeaderboardEntry[] = [
  {
    player_id: 'player_1',
    faction_name: 'Digital Nomads',
    dominance_score: 0.12,
    territories_count: 245,
    buildings_count: 18,
    tech_level: 3
  },
  {
    player_id: 'player_2', 
    faction_name: 'Pixel Pirates',
    dominance_score: 0.09,
    territories_count: 189,
    buildings_count: 22,
    tech_level: 2
  },
  {
    player_id: 'player_3',
    faction_name: 'Code Crusaders',
    dominance_score: 0.07,
    territories_count: 156,
    buildings_count: 15,
    tech_level: 4
  },
  {
    player_id: 'player_4',
    faction_name: 'Byte Builders', 
    dominance_score: 0.06,
    territories_count: 134,
    buildings_count: 19,
    tech_level: 2
  },
  {
    player_id: 'player_5',
    faction_name: 'Neural Networks',
    dominance_score: 0.05,
    territories_count: 98,
    buildings_count: 12,
    tech_level: 5
  },
  {
    player_id: 'dev-player',
    faction_name: 'Development',
    dominance_score: 0.03,
    territories_count: 67,
    buildings_count: 8,
    tech_level: 1
  }
];

// In a production implementation, this would query a real database:
/*
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getLeaderboardFromDatabase(timeframe: '24h' | 'all-time'): Promise<LeaderboardEntry[]> {
  try {
    const timeFilter = timeframe === '24h' 
      ? { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      : undefined;
      
    const players = await prisma.player.findMany({
      where: {
        lastActivity: timeFilter
      },
      orderBy: {
        dominanceScore: 'desc'
      },
      take: timeframe === '24h' ? 20 : 50
    });
    
    return players.map(player => ({
      player_id: player.id,
      faction_name: player.factionName,
      dominance_score: player.dominanceScore,
      territories_count: player.territoriesCount,
      buildings_count: player.buildingsCount,
      tech_level: player.techLevel
    }));
  } catch (error) {
    console.error('Database error fetching leaderboard:', error);
    return [];
  }
}
*/

// Simulate all-time vs 24h differences
const allTimeMultiplier = 2.5;
const timeVariation = () => Math.random() * 0.3 + 0.85; // 85-115% variation

export const GET: RequestHandler = async ({ url }) => {
  try {
    const timeframe = url.searchParams.get('timeframe') || '24h';
    
    if (!['24h', 'all-time'].includes(timeframe)) {
      return json({
        success: false,
        error: 'Invalid timeframe. Use "24h" or "all-time"',
        timestamp: Date.now()
      } as ApiResponse);
    }
    
    // Generate leaderboard based on timeframe
    let leaderboard = mockLeaderboardData.map(entry => ({
      ...entry,
      dominance_score: timeframe === 'all-time' 
        ? entry.dominance_score * allTimeMultiplier * timeVariation()
        : entry.dominance_score * timeVariation(),
      territories_count: timeframe === 'all-time'
        ? Math.floor(entry.territories_count * allTimeMultiplier * timeVariation())
        : Math.floor(entry.territories_count * timeVariation()),
      buildings_count: timeframe === 'all-time'
        ? Math.floor(entry.buildings_count * allTimeMultiplier * timeVariation())
        : Math.floor(entry.buildings_count * timeVariation())
    }));
    
    // Sort by dominance score (descending)
    leaderboard.sort((a, b) => b.dominance_score - a.dominance_score);
    
    // Add some random variation for demonstration
    if (timeframe === '24h') {
      // Simulate recent activity - add/remove some players
      const activePlayers = leaderboard.filter(() => Math.random() > 0.1);
      
      // Add a few more active players for 24h
      const extraPlayers: LeaderboardEntry[] = [
        {
          player_id: 'active_1',
          faction_name: 'Night Owls',
          dominance_score: 0.04,
          territories_count: 78,
          buildings_count: 6,
          tech_level: 2
        },
        {
          player_id: 'active_2', 
          faction_name: 'Speed Runners',
          dominance_score: 0.02,
          territories_count: 45,
          buildings_count: 3,
          tech_level: 1
        }
      ];
      
      leaderboard = [...activePlayers, ...extraPlayers]
        .sort((a, b) => b.dominance_score - a.dominance_score)
        .slice(0, 20); // Top 20 for 24h
    } else {
      leaderboard = leaderboard.slice(0, 50); // Top 50 for all-time
    }
    
    return json({
      success: true,
      data: leaderboard,
      timestamp: Date.now()
    } as ApiResponse<LeaderboardEntry[]>);
    
  } catch (error) {
    console.error('Leaderboard API error:', error);
    
    return json({
      success: false,
      error: 'Internal server error',
      timestamp: Date.now()
    } as ApiResponse, {
      status: 500
    });
  }
};

// POST endpoint for updating leaderboard (admin only)
export const POST: RequestHandler = async ({ request }) => {
  try {
    // Implement admin authentication
    // TODO(prod): Replace with proper admin authentication
    const authHeader = request.headers.get('authorization');
    const isAdmin = authHeader && authHeader.startsWith('Bearer ') && 
                   authHeader.substring(7) === process.env.ADMIN_SECRET;
    
    if (!isAdmin) {
      return json({
        success: false,
        error: 'Unauthorized: Admin access required',
        timestamp: Date.now()
      } as ApiResponse, {
        status: 401
      });
    }
    
    const data = await request.json();
    
    return json({
      success: false,
      error: 'Leaderboard updates not implemented in development version',
      timestamp: Date.now()
    } as ApiResponse);
  } catch (error) {
    return json({
      success: false,
      error: 'Invalid request',
      timestamp: Date.now()
    } as ApiResponse, {
      status: 400
    });
  }
};
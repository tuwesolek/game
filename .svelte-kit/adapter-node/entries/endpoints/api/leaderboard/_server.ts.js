import { json } from "@sveltejs/kit";
const mockLeaderboardData = [
  {
    player_id: "player_1",
    faction_name: "Digital Nomads",
    dominance_score: 0.12,
    territories_count: 245,
    buildings_count: 18,
    tech_level: 3
  },
  {
    player_id: "player_2",
    faction_name: "Pixel Pirates",
    dominance_score: 0.09,
    territories_count: 189,
    buildings_count: 22,
    tech_level: 2
  },
  {
    player_id: "player_3",
    faction_name: "Code Crusaders",
    dominance_score: 0.07,
    territories_count: 156,
    buildings_count: 15,
    tech_level: 4
  },
  {
    player_id: "player_4",
    faction_name: "Byte Builders",
    dominance_score: 0.06,
    territories_count: 134,
    buildings_count: 19,
    tech_level: 2
  },
  {
    player_id: "player_5",
    faction_name: "Neural Networks",
    dominance_score: 0.05,
    territories_count: 98,
    buildings_count: 12,
    tech_level: 5
  },
  {
    player_id: "dev-player",
    faction_name: "Development",
    dominance_score: 0.03,
    territories_count: 67,
    buildings_count: 8,
    tech_level: 1
  }
];
const allTimeMultiplier = 2.5;
const timeVariation = () => Math.random() * 0.3 + 0.85;
const GET = async ({ url }) => {
  try {
    const timeframe = url.searchParams.get("timeframe") || "24h";
    if (!["24h", "all-time"].includes(timeframe)) {
      return json({
        success: false,
        error: 'Invalid timeframe. Use "24h" or "all-time"',
        timestamp: Date.now()
      });
    }
    let leaderboard = mockLeaderboardData.map((entry) => ({
      ...entry,
      dominance_score: timeframe === "all-time" ? entry.dominance_score * allTimeMultiplier * timeVariation() : entry.dominance_score * timeVariation(),
      territories_count: timeframe === "all-time" ? Math.floor(entry.territories_count * allTimeMultiplier * timeVariation()) : Math.floor(entry.territories_count * timeVariation()),
      buildings_count: timeframe === "all-time" ? Math.floor(entry.buildings_count * allTimeMultiplier * timeVariation()) : Math.floor(entry.buildings_count * timeVariation())
    }));
    leaderboard.sort((a, b) => b.dominance_score - a.dominance_score);
    if (timeframe === "24h") {
      const activePlayers = leaderboard.filter(() => Math.random() > 0.1);
      const extraPlayers = [
        {
          player_id: "active_1",
          faction_name: "Night Owls",
          dominance_score: 0.04,
          territories_count: 78,
          buildings_count: 6,
          tech_level: 2
        },
        {
          player_id: "active_2",
          faction_name: "Speed Runners",
          dominance_score: 0.02,
          territories_count: 45,
          buildings_count: 3,
          tech_level: 1
        }
      ];
      leaderboard = [...activePlayers, ...extraPlayers].sort((a, b) => b.dominance_score - a.dominance_score).slice(0, 20);
    } else {
      leaderboard = leaderboard.slice(0, 50);
    }
    return json({
      success: true,
      data: leaderboard,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return json({
      success: false,
      error: "Internal server error",
      timestamp: Date.now()
    }, {
      status: 500
    });
  }
};
const POST = async ({ request }) => {
  try {
    const authHeader = request.headers.get("authorization");
    const isAdmin = authHeader && authHeader.startsWith("Bearer ") && authHeader.substring(7) === process.env.ADMIN_SECRET;
    if (!isAdmin) {
      return json({
        success: false,
        error: "Unauthorized: Admin access required",
        timestamp: Date.now()
      }, {
        status: 401
      });
    }
    const data = await request.json();
    return json({
      success: false,
      error: "Leaderboard updates not implemented in development version",
      timestamp: Date.now()
    });
  } catch (error) {
    return json({
      success: false,
      error: "Invalid request",
      timestamp: Date.now()
    }, {
      status: 400
    });
  }
};
export {
  GET,
  POST
};

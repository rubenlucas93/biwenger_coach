const fs = require('fs');
let code = fs.readFileSync('src/logic/BiwengerClient.js', 'utf8');

// Update getPlayerData to calculate currentRound
code = code.replace(
    'const allTeams = compData.teams || {};\n\n            cachedAllPlayers = allPlayers;',
    `const allTeams = compData.teams || {};
            
            let currentRound = 30;
            const activeEvents = compData.activeEvents || [];
            if (activeEvents.length > 0 && activeEvents[0].name) {
                const match = activeEvents[0].name.match(/\\d+/);
                if (match) currentRound = parseInt(match[0], 10);
            }
            const remainingMatches = Math.max(0, 38 - currentRound + 1);

            cachedAllPlayers = allPlayers;`
);

// Add points and remaining_matches to mappedPlayer
code = code.replace(
    'price_trend: p.priceIncrement || 0\n                };',
    `price_trend: p.priceIncrement || 0,
                    points: p.points || 0,
                    remaining_matches: remainingMatches
                };`
);

fs.writeFileSync('src/logic/BiwengerClient.js', code);
console.log('BiwengerClient patched successfully');

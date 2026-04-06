const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    const res = await axios.get(`${client.baseUrl}/rounds/league`, { headers: client.headers });
    const standings = res.data.data.league.standings;
    
    const cancelas = standings.find(u => u.name === "Cancelas");
    console.log("Cancelas raw data:");
    console.log(JSON.stringify(cancelas, null, 2));
    
    if (cancelas && cancelas.lineup && cancelas.lineup.players) {
        // Also fetch the global players list to see what points the players have
        const compUrl = `${client.baseUrl}/competitions/la-liga/data?score=2`;
        const compRes = await axios.get(compUrl, { headers: client.headers });
        const allPlayers = compRes.data.data.players;
        
        let roundPoints = 0;
        console.log("\nCancelas players for current round:");
        cancelas.lineup.players.forEach(pid => {
            const pObj = typeof pid === 'object' ? pid : { id: pid };
            const pId = pObj.id;
            const globalP = allPlayers[pId];
            if (globalP) {
                console.log(`- ${globalP.name} (id ${pId}): points=${globalP.points}, played=${pObj.played}, points in lineup object=${pObj.points}`);
                // Is it possible the points are on the player object inside lineup?
            }
        });
    }
}
test();

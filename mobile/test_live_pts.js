const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    const res = await axios.get(`${client.baseUrl}/competitions/la-liga/data?score=5`, { headers: client.headers });
    const allPlayers = res.data.data.players;
    
    const cancelasPlayers = [17482,26276,20969,2253,31027,25127,39941,3159,38289,1995,38962];
    
    let sum = 0;
    cancelasPlayers.forEach(pid => {
        const p = allPlayers[pid];
        if (p) {
            // How do we know the live points?
            // Let's print the fitness and the "playedHome" / "playedAway"
            console.log(`${p.name}: fitness=${p.fitness}, total=${p.points}`);
        }
    });
}
test();

const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    const res = await axios.get(`${client.baseUrl}/rounds/league`, { headers: client.headers });
    const user = res.data.data.league.standings[0];
    console.log("User keys:", Object.keys(user));
    console.log("User lineup keys:", Object.keys(user.lineup));
    
    // Also fetch a specific player to see if they have current round points
    const compUrl = `${client.baseUrl}/competitions/la-liga/data?score=2`;
    const compRes = await axios.get(compUrl, { headers: client.headers });
    const firstPlayerId = user.lineup.players[0];
    console.log(`\nPlayer ${firstPlayerId} data:`);
    console.log(JSON.stringify(compRes.data.data.players[firstPlayerId], null, 2));
}
test();

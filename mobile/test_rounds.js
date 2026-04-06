const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    const res = await axios.get(`${client.baseUrl}/rounds/league`, { headers: client.headers });
    console.log(JSON.stringify(res.data.data.round, null, 2));
    
    // Also let's fetch the competitions/la-liga/data to see the current round.
    const res2 = await axios.get(`${client.baseUrl}/competitions/la-liga/data`, { headers: client.headers });
    console.log("\nCompetition events:");
    const events = res2.data.data.events || [];
    events.slice(0, 5).forEach(e => console.log(e));
}
test();

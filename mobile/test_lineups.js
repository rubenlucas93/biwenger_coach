const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    try {
        const res = await axios.get(`${client.baseUrl}/user?fields=*,lineups`, { headers: client.headers });
        const lineups = res.data.data.lineups;
        console.log(`User has ${lineups.length} lineups.`);
        console.log("Last lineup:", JSON.stringify(lineups[lineups.length - 1], null, 2));
    } catch(e) { console.log(e.message); }
}
test();

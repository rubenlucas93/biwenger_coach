const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    const res = await axios.get(`${client.baseUrl}/user/5397570?fields=*,lineups(round,points,players,score)`, { headers: client.headers });
    const lineups = res.data.data.lineups;
    console.log("Last lineup of Cancelas:", JSON.stringify(lineups[lineups.length-1], null, 2));
}
test();

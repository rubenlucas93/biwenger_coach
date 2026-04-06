const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    try {
        const res = await axios.get(`${client.baseUrl}/rounds/league?fields=*,standings(*)`, { headers: client.headers });
        const cancelas = res.data.data.league.standings.find(u => u.name === "Cancelas");
        console.log("Keys:", Object.keys(cancelas));
        console.log(JSON.stringify(cancelas, null, 2));
    } catch(e) {}
}
test();

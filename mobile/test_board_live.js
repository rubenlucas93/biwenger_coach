const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    // Check if score=5 on rounds/league makes a difference
    try {
        const res = await axios.get(`${client.baseUrl}/rounds/league?score=5`, { headers: client.headers });
        console.log(JSON.stringify(res.data.data.league.standings[0]).substring(0, 300));
    } catch(e) {}
    
    try {
        const res = await axios.get(`${client.baseUrl}/leagues/${client.leagueId}/board?fields=*,round,points`, { headers: client.headers });
        console.log(JSON.stringify(res.data.data).substring(0, 300));
    } catch(e) {}
}
test();

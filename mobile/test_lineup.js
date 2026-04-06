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
    const user = standings[0];
    console.log(JSON.stringify(user, null, 2));
}
test();

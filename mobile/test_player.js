const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    try {
        const res = await axios.get(`${client.baseUrl}/players/la-liga/2253?fields=*`, { headers: client.headers });
        console.log(Object.keys(res.data.data));
        console.log(JSON.stringify(res.data.data.stats || res.data.data, null, 2).substring(0, 500));
    } catch(e) {}
}
test();

const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    const res = await axios.get(`${client.baseUrl}/competitions/la-liga/data?score=5`, { headers: client.headers });
    const events = res.data.data.activeEvents;
    if (events && events.length > 0) {
        console.log(JSON.stringify(events[0], null, 2).substring(0, 1500));
    }
}
test();

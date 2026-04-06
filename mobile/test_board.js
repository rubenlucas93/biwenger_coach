const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    const endpoints = [
        "/league/board",
        "/league?fields=*,board",
        "/user?fields=*,lineups(points)",
        "/rounds/league?fields=*,results"
    ];
    
    for (const ep of endpoints) {
        try {
            const res = await axios.get(`${client.baseUrl}${ep}`, { headers: client.headers });
            console.log(`\nSuccess ${ep}:`, JSON.stringify(res.data.data).substring(0, 300));
        } catch(e) { console.log(`Failed ${ep}`); }
    }
}
test();

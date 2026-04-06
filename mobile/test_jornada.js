const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    const endpoints = [
        "/rounds/4513/board",
        "/league/board",
        "/rounds/league/board",
        "/leagues/1093132/rounds/4513/board"
    ];
    
    for (const ep of endpoints) {
        try {
            const res = await axios.get(`${client.baseUrl}${ep}`, { headers: client.headers });
            console.log(`\nSuccess ${ep}:`, JSON.stringify(res.data).substring(0, 300));
        } catch(e) { console.log(`Failed ${ep}`); }
    }
}
test();

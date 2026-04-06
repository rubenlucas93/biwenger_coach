const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    const res = await axios.get(`${client.baseUrl}/competitions/la-liga/data?score=5`, { headers: client.headers });
    // Let's find players who played in Mallorca vs Real Madrid (id 46415)
    // Mallorca ID = 465, Real Madrid ID = 15
    const players = res.data.data.players;
    let found = false;
    for (const pid in players) {
        if (players[pid].teamID === 15 || players[pid].teamID === 465) {
            console.log(players[pid].name, Object.keys(players[pid]));
            found = true;
            break;
        }
    }
}
test();

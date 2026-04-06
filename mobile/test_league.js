const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    try {
        const res = await axios.get(`${client.baseUrl}/league`, { headers: client.headers });
        console.log("League:", JSON.stringify(res.data.data).substring(0, 1500));
    } catch(e) { console.log("League Error:", e.response ? e.response.status : e.message); }
}
test();

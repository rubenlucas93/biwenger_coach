const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    try {
        const res = await axios.get(`${client.baseUrl}/rounds/4513`, { headers: client.headers });
        console.log("R1", JSON.stringify(res.data));
    } catch(e){ console.log("R1 fail") }
    
    try {
        const res = await axios.get(`${client.baseUrl}/leagues/${client.leagueId}/rounds/4513`, { headers: client.headers });
        console.log("R2", JSON.stringify(res.data));
    } catch(e){ console.log("R2 fail") }
    
    try {
        const res = await axios.get(`${client.baseUrl}/leagues/${client.leagueId}/rounds/league`, { headers: client.headers });
        console.log("R3", JSON.stringify(res.data));
    } catch(e){ console.log("R3 fail") }
    
    try {
        const res = await axios.get(`${client.baseUrl}/rounds`, { headers: client.headers });
        const lastRound = res.data.data.slice(-1)[0];
        console.log("R4 last round:", JSON.stringify(lastRound));
    } catch(e){ console.log("R4 fail") }
}
test();

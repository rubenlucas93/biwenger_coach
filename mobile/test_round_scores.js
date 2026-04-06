const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    try {
        const res = await axios.get(`${client.baseUrl}/leagues/${client.leagueId}/board?round=4513`, { headers: client.headers });
        console.log("A", JSON.stringify(res.data));
    } catch(e){ console.log("A fail") }
    
    try {
        const res = await axios.get(`${client.baseUrl}/rounds/4513/board`, { headers: client.headers });
        console.log("B", JSON.stringify(res.data));
    } catch(e){ console.log("B fail") }

    try {
        const res = await axios.get(`${client.baseUrl}/rounds/league/board`, { headers: client.headers });
        console.log("C", JSON.stringify(res.data));
    } catch(e){ console.log("C fail") }
    
    try {
        const res = await axios.get(`${client.baseUrl}/rounds/4513/standings`, { headers: client.headers });
        console.log("D", JSON.stringify(res.data));
    } catch(e){ console.log("D fail") }
}
test();

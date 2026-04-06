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
        console.log("A", res.data);
    } catch(e){}
    try {
        const res = await axios.get(`${client.baseUrl}/rounds/4513`, { headers: client.headers });
        console.log("B", res.data);
    } catch(e){}
    try {
        const res = await axios.get(`${client.baseUrl}/scores`, { headers: client.headers });
        console.log("C", res.data);
    } catch(e){}
}
test();

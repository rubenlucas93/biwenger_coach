const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    try {
        const res = await axios.get(`${client.baseUrl}/leagues/${client.leagueId}/board`, { headers: client.headers });
        console.log(res.data);
    } catch(e){}
    
    try {
        const res2 = await axios.get(`${client.baseUrl}/rounds/4513/standings`, { headers: client.headers });
        console.log(JSON.stringify(res2.data.data).substring(0, 300));
    } catch(e){}
    
    try {
        const res3 = await axios.get(`${client.baseUrl}/league?fields=*,standings`, { headers: client.headers });
        console.log("League Standings keys:", Object.keys(res3.data.data.standings[0]));
        console.log(res3.data.data.standings.find(s => s.id === 5397570));
    } catch(e){}
    
    try {
        const res4 = await axios.get(`${client.baseUrl}/leagues/${client.leagueId}/board?round=4513`, { headers: client.headers });
        console.log(res4.data);
    } catch(e){}
}
test();

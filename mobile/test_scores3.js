const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');

async function test() {
    const client = new BiwengerClient();
    const auth = await client.login(process.env.BIWENGER_EMAIL, process.env.BIWENGER_PASSWORD);
    
    client.headers["X-User"] = String(client.userId);
    client.headers["X-League"] = String(client.leagueId);
    client.headers["Authorization"] = `Bearer ${client.token}`;
    
    try {
        const res = await axios.get(`${client.baseUrl}/leagues/${client.leagueId}/board?round=4513&score=5`, { headers: client.headers });
        console.log(JSON.stringify(res.data).substring(0, 300));
    } catch(e) { console.log("Fail 1"); }
    
    try {
        const res2 = await axios.get(`${client.baseUrl}/rounds/4513/board?score=5`, { headers: client.headers });
        console.log(JSON.stringify(res2.data).substring(0, 300));
    } catch(e) { console.log("Fail 2"); }
    
    try {
        const res3 = await axios.get(`${client.baseUrl}/rounds/league?fields=*,standings,results,scores`, { headers: client.headers });
        console.log("Success 3:", JSON.stringify(res3.data.data.league.standings[0]).substring(0,300));
    } catch(e) { console.log("Fail 3"); }
}
test();

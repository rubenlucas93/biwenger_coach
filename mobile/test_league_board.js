const BiwengerClient = require('./src/logic/BiwengerClient').default;
const axios = require('axios');
const fs = require('fs');

async function testLeagueBoard() {
    console.log("Testing Biwenger API...");
    // Read auth if available
    let email = process.env.BIWENGER_EMAIL;
    let password = process.env.BIWENGER_PASSWORD;
    
    if (!email || !password) {
        console.error("Please provide BIWENGER_EMAIL and BIWENGER_PASSWORD environment variables.");
        return;
    }

    const client = new BiwengerClient();
    const auth = await client.login(email, password);
    
    if (!auth) {
        console.error("Login failed.");
        return;
    }
    
    console.log("Login successful. Token:", auth.token.substring(0, 10) + "...");
    console.log("User ID:", auth.user_id, "League ID:", auth.league_id);

    try {
        console.log("\nFetching rounds data...");
        // Emulate getLeagueBoard
        client.headers["X-User"] = String(client.userId);
        client.headers["X-League"] = String(client.leagueId);
        client.headers["Authorization"] = `Bearer ${client.token}`;
        
        const res = await axios.get(`${client.baseUrl}/rounds/league`, { headers: client.headers });
        console.log("Rounds API Data received. Structure:");
        console.log(JSON.stringify(res.data, null, 2).substring(0, 500) + "...\n");
        
        const data = res.data.data;
        let activeRound = data;
        if (Array.isArray(data)) {
            activeRound = data.find(r => r.status === 'active' || r.status === 'finished') || data[0];
        }
        
        console.log("Active round data:");
        console.log(JSON.stringify(activeRound, null, 2).substring(0, 1500));
        
        // Let's also check if there's a different endpoint for standings
        console.log("\nTrying to fetch league standings directly...");
        try {
            const stdRes = await axios.get(`${client.baseUrl}/league?fields=*,standings`, { headers: client.headers });
            console.log("Standings API Data received:");
            console.log(JSON.stringify(stdRes.data.data.standings, null, 2).substring(0, 500) + "...\n");
        } catch (e) {
            console.log("Standings endpoint failed:", e.message);
        }
        
    } catch (e) {
        console.error("Error during API requests:", e.message);
        if (e.response) {
            console.error("Response data:", e.response.data);
        }
    }
}

testLeagueBoard();

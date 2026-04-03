const axios = require('./node_modules/axios');

async function debugBarcelona() {
    const url = "https://www.futbolfantasy.com/laliga/equipos/barcelona";
    const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" };
    const res = await axios.get(url, { headers });
    const html = res.data;

    const parts = html.split('class="nombre');
    console.log("--- BARCELONA DEEP DIVE ---");
    for (let i = 1; i < parts.length; i++) {
        const chunk = parts[i].substring(0, 1500); // More context
        const nameMatch = chunk.match(/>([^<]+)<\/span>/);
        if (nameMatch && nameMatch[1].includes("Olmo")) {
            console.log(`PLAYER: ${nameMatch[1]}`);
            console.log("FULL CHUNK:");
            console.log(chunk);
            
            // Check for any percentages
            const allPercents = chunk.match(/\d+%/g);
            console.log("ALL PERCENTAGES FOUND IN THIS CHUNK:", allPercents);
        }
    }
}
debugBarcelona();

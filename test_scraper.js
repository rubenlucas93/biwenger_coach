const axios = require('axios');
const re = require('regex');

class FutbolFantasyScraper {
    constructor() {
        this.baseUrl = "https://www.futbolfantasy.com";
        this.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        };
    }

    async scrapeTeam(slug) {
        const url = `${this.baseUrl}/laliga/equipos/${slug}`;
        console.log(`Testing ${slug}...`);
        try {
            const res = await axios.get(url, { headers: this.headers, timeout: 15000 });
            const html = res.data;
            const playerProbs = {};

            // Block-by-block logic from App
            const blocks = html.split('class="jugador');
            for (let i = 1; i < blocks.length; i++) {
                const block = blocks[i];
                const nameMatch = block.match(/alt="([^"]{3,40})"/) || block.match(/>([^<]{3,40})<\/span>/);
                const probMatch = block.match(/data-probabilidad="([^"]+)"/) || block.match(/(\d+%)/);
                
                if (nameMatch && probMatch) {
                    const name = nameMatch[1].trim();
                    let prob = probMatch[1];
                    if (prob === "Titular") prob = "100%";
                    if (prob === "Suplente") prob = "0%";
                    if (name.length > 2 && !["Barcelona", "Madrid", "Atletico"].includes(name)) {
                        playerProbs[name] = prob;
                    }
                }
            }
            return playerProbs;
        } catch (error) {
            console.error(`Error scraping ${slug}:`, error.message);
            return {};
        }
    }
}

async function runTest() {
    const scraper = new FutbolFantasyScraper();
    const playersToTest = [
        { team: "barcelona", name: "Yamal" },
        { team: "barcelona", name: "Lewandowski" },
        { team: "barcelona", name: "Dani Olmo" },
        { team: "atletico", name: "Lookman" },
        { team: "atletico", name: "Koke" },
        { team: "betis", name: "Abde" }
    ];

    console.log("--- STARTING SCRAPER TEST ---");
    for (const test of playersToTest) {
        const results = await scraper.scrapeTeam(test.team);
        
        // Find best match for the name
        let found = false;
        for (const [name, prob] of Object.entries(results)) {
            if (name.toLowerCase().includes(test.name.toLowerCase())) {
                console.log(`✅ MATCH FOUND: ${name} => ${prob}`);
                found = true;
                break;
            }
        }
        if (!found) {
            console.log(`❌ NOT FOUND: ${test.name} in ${test.team}`);
        }
        // Small delay
        await new Promise(r => setTimeout(r, 500));
    }
}

runTest();

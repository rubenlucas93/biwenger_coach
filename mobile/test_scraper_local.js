const axios = require('./node_modules/axios');

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
        try {
            const res = await axios.get(url, { headers: this.headers, timeout: 15000 });
            const html = res.data;
            const playerProbs = {};
            const blocks = html.split('class="jugador');
            for (let i = 1; i < blocks.length; i++) {
                const chunk = blocks[i];
                const nameMatch = chunk.match(/class="nombre"[^>]*>([^<]+)<\/span>/) || 
                                 chunk.match(/alt="([^"]{3,40})"/) || 
                                 chunk.match(/>([^<]{3,40})<\/span>/);
                const probMatch = chunk.match(/probabilidad[^>]*>[\s\S]*?(\d+%)/);
                if (nameMatch && probMatch) {
                    const name = nameMatch[1].trim();
                    const prob = probMatch[1].trim();
                    playerProbs[name] = prob;
                }
            }
            return playerProbs;
        } catch (error) {
            return {};
        }
    }
}

async function runTest() {
    const scraper = new FutbolFantasyScraper();
    console.log("--- SEARCHING FOR ABDE AND LUIZ JUNIOR ---");
    
    const betis = await scraper.scrapeTeam("betis");
    console.log("\nBetis names found:");
    Object.keys(betis).forEach(n => { if (n.toLowerCase().includes("abde")) console.log(` - ${n} (${betis[n]})`); });

    const villarreal = await scraper.scrapeTeam("villarreal");
    console.log("\nVillarreal names found:");
    Object.keys(villarreal).forEach(n => { if (n.toLowerCase().includes("luiz") || n.toLowerCase().includes("junior")) console.log(` - ${n} (${villarreal[n]})`); });
}
runTest();

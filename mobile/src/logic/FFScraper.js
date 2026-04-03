import axios from 'axios';

class FutbolFantasyScraper {
    constructor() {
        let proxy = "";
        if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
            proxy = "https://cors-anywhere.herokuapp.com/";
        }
        this.baseUrl = `${proxy}https://www.futbolfantasy.com`;
        this.teams = [
            "alaves", "athletic", "atletico", "barcelona", "betis", "celta", "elche",
            "espanyol", "getafe", "girona", "levante", "mallorca", "osasuna",
            "rayo-vallecano", "real-madrid", "real-oviedo", "real-sociedad",
            "sevilla", "valencia", "villarreal"
        ];
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

            // 1. Structural approach (split by card)
            const blocks = html.split('class="jugador');
            for (let i = 1; i < blocks.length; i++) {
                const chunk = blocks[i];
                const nameMatch = chunk.match(/class="nombre"[^>]*>([^<]+)<\/span>/) || 
                                 chunk.match(/alt="([^"]{3,40})"/) || 
                                 chunk.match(/>([^<]{3,40})<\/span>/);
                const probMatch = chunk.match(/probabilidad[^>]*>[\s\S]*?(\d+%)/);

                if (nameMatch && probMatch) {
                    const name = nameMatch[1].trim();
                    const probStr = probMatch[1].trim();
                    const pInt = parseInt(probStr.replace("%", ""));
                    if (name.length > 2 && !["Barcelona", "Madrid", "Atletico", "Getafe", "Villarreal", "Sevilla"].includes(name)) {
                        playerProbs[name] = probStr;
                    }
                }
            }

            // 2. Data-attribute fallback (if still missing some)
            const bits = html.split('data-probabilidad="');
            for (let i = 1; i < bits.length; i++) {
                const chunk = bits[i];
                const probStr = chunk.substring(0, chunk.indexOf('"'));
                let prob = probStr;
                if (prob === "Titular") prob = "100%";
                if (prob === "Suplente") prob = "0%";
                if (prob.includes("%") || prob === "100%") {
                    const searchArea = bits[i-1].slice(-1000);
                    const nameMatch = searchArea.match(/alt="([^"]{3,40})"/) || searchArea.match(/>([^<]{3,40})<\/span>/);
                    if (nameMatch) {
                        const name = nameMatch[1].trim();
                        const pInt = parseInt(prob.replace("%", ""));
                        const existing = playerProbs[name] ? parseInt(playerProbs[name].replace("%", "")) : -1;
                        if (pInt > existing && !["Barcelona", "Madrid", "Atletico", "Getafe", "Villarreal", "Sevilla"].includes(name)) {
                            playerProbs[name] = prob;
                        }
                    }
                }
            }
            return playerProbs;
        } catch (error) { return {}; }
    }

    async getAllLineupData() {
        console.log("[FFScraper] Starting ultra-resilient harvest...");
        const allProbs = {};
        for (const team of this.teams) {
            const teamProbs = await this.scrapeTeam(team);
            Object.assign(allProbs, teamProbs);
            await new Promise(r => setTimeout(r, 200));
        }
        return allProbs;
    }
}

export default FutbolFantasyScraper;

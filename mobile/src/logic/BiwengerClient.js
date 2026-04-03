import axios from 'axios';

let lastFetchTime = 0;
let cachedPlayers = null;

class BiwengerClient {
    constructor(token = null, userId = null, league_id = null) {
        let proxy = "";
        if (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') {
            proxy = "https://cors-anywhere.herokuapp.com/";
        }
        this.baseUrl = proxy ? `${proxy}https://biwenger.as.com/api/v2` : "https://biwenger.as.com/api/v2";
        this.token = token;
        this.userId = userId;
        this.leagueId = league_id;
        this.headers = {
            "Content-Type": "application/json",
            "X-Version": "630",
            "X-Client": "android",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        };
        if (this.token) this.headers["Authorization"] = `Bearer ${this.token}`;
    }

    async login(email, password) {
        try {
            const res = await axios.post(`${this.baseUrl}/auth/login`, { email, password }, { headers: this.headers });
            const data = res.data;
            this.token = data.token || data.data?.token;
            this.headers["Authorization"] = `Bearer ${this.token}`;
            const accRes = await axios.get(`${this.baseUrl}/account`, { headers: this.headers });
            const accData = accRes.data.data || {};
            let userId = accData.id;
            const leagues = accData.leagues || [];
            if (leagues.length > 0) {
                this.leagueId = String(leagues[0].id);
                if (!userId) userId = leagues[0].user?.id;
            }
            if (userId) this.userId = String(userId);
            return { token: this.token, user_id: this.userId, league_id: this.leagueId };
        } catch (error) { return null; }
    }

    async getPlayerData(forceRefresh = false) {
        const now = Date.now();
        if (!forceRefresh && cachedPlayers && (now - lastFetchTime < 60000)) return cachedPlayers;

        try {
            lastFetchTime = now;
            this.headers["X-User"] = String(this.userId);
            this.headers["X-League"] = String(this.leagueId);
            this.headers["Authorization"] = `Bearer ${this.token}`;

            // ESSENTIAL: Includes 'name' in players(*) fields
            const fields = "*,players(*,fitness,team,owner,status,positions,priceIncrement,name),nextRounds(*),team(*),league(*,points,teams)";
            const res = await axios.get(`${this.baseUrl}/user?fields=${fields}`, { headers: this.headers });
            const userData = res.data.data || {};
            const userPlayerIds = new Set((userData.players || []).map(p => p.id));
            const compSlug = userData.league?.competition || "la-liga";

            const compUrl = `${this.baseUrl}/competitions/${compSlug}/data?score=2`;
            const compRes = await axios.get(compUrl, { headers: this.headers });
            const compData = compRes.data.data || {};
            const allPlayers = compData.players || {};
            const allTeams = compData.teams || {};

            const teamNames = {};
            Object.entries(allTeams).forEach(([id, t]) => {
                teamNames[String(id)] = t.name;
            });

            const teamRivals = {};
            Object.entries(allTeams).forEach(([id, t]) => {
                const nextGames = t.nextGames || [];
                if (nextGames.length > 0) {
                    const game = nextGames[0];
                    const h_id = game.home?.id ? String(game.home.id) : null;
                    const a_id = game.away?.id ? String(game.away.id) : null;
                    const current_tid = String(id);
                    if (h_id && a_id) {
                        const isHome = h_id === current_tid;
                        const rivalId = isHome ? a_id : h_id;
                        teamRivals[current_tid] = {
                            rival: teamNames[rivalId] || "Unknown",
                            rivalId: rivalId,
                            location: isHome ? "Home" : "Away"
                        };
                    }
                }
            });

            const playerList = [];
            Object.entries(allPlayers).forEach(([id, p]) => {
                const pid = Number(id);
                if (userPlayerIds.has(pid)) {
                    const tid = String(p.teamID || p.team);
                    const matchInfo = teamRivals[tid] || { rival: "Unknown", rivalId: null, location: "Unknown" };
                    const fitness = p.fitness || [];
                    const num_f = fitness.filter(f => typeof f === 'number');

                    playerList.push({
                        id: pid,
                        name: p.name,
                        position: p.position,
                        positions: [...new Set([p.position, ...(p.altPositions || [])])],
                        status: p.status,
                        fitness: fitness,
                        peaks: num_f.filter(f => f >= 9).length,
                        volatility: num_f.length > 1 ? (Math.max(...num_f) - Math.min(...num_f)) : 0,
                        team_id: tid,
                        team_name: teamNames[tid] || "Unknown",
                        rival_name: matchInfo.rival,
                        rival_id: matchInfo.rivalId,
                        location: matchInfo.location,
                        price_trend: p.priceIncrement || 0
                    });
                }
            });

            cachedPlayers = playerList;
            return playerList;
        } catch (error) {
            if (cachedPlayers) return cachedPlayers;
            throw error;
        }
    }
}

export default BiwengerClient;

import { getDifficultyRating } from './TeamDifficulty';

class LineupOptimizer {
    constructor(biwengerPlayers, ffProbs) {
        this.players = JSON.parse(JSON.stringify(biwengerPlayers));
        this.ffProbs = ffProbs;
        this.positionMap = { 1: "GK", 2: "DF", 3: "MF", 4: "FW" };
        this.formations = [
            { GK: 1, DF: 3, MF: 4, FW: 3 },
            { GK: 1, DF: 3, MF: 5, FW: 2 },
            { GK: 1, DF: 4, MF: 4, FW: 2 },
            { GK: 1, DF: 4, MF: 3, FW: 3 },
            { GK: 1, DF: 4, MF: 5, FW: 1 },
            { GK: 1, DF: 5, MF: 3, FW: 2 },
            { GK: 1, DF: 5, MF: 4, FW: 1 },
        ];
    }

    _normalize(str) {
        if (!str) return "";
        return str.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, "")
            .trim();
    }

    _calculatePlayerScores(p) {
        const prob = parseInt(String(p.ff_prob || "0").replace("%", "")) || 0;
        const scores = (p.fitness || []).map(f => typeof f === 'number' ? f : 0);
        const avgFitness = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const matchup = getDifficultyRating(p.rival_name || "", this.positionMap[p.position] || "MF");
        const matchupBonus = (6 - matchup.score) * 2;
        const safeScore = (prob * 0.5) + (avgFitness * 4) + matchupBonus + (p.price_trend > 0 ? 1 : 0) + (p.location === "Home" ? 1 : 0);
        const riskScore = (prob * 0.3) + (avgFitness * 2) + ((p.peaks || 0) * 10) + ((p.volatility || 0) * 1.5) + matchupBonus;
        
        const formVal = Math.round(avgFitness * 10) / 10;
        let formLabel = "Poor";
        if (formVal >= 7.5) formLabel = "Elite";
        else if (formVal >= 5.5) formLabel = "Great";
        else if (formVal >= 4) formLabel = "Good";
        else if (formVal >= 2) formLabel = "Fair";

        return {
            safe: Math.round(safeScore * 10),
            risk: Math.round(riskScore * 10),
            dvp_label: matchup.label,
            form_label: formLabel,
            form_val: formVal
        };
    }

    matchPlayers() {
        return this.players.map(p => {
            let bestProb = "Unknown";
            let bestProbInt = -1;
            
            const bName = this._normalize(p.name);
            const bParts = bName.split(" ").filter(pt => pt.length > 2);
            
            const isAbde = bName.includes("abde");
            const isLuiz = bName.includes("luiz") && bName.includes("junior");
            const isOlmo = bName.includes("olmo");

            // We iterate through all probs to find the best match
            for (const [ffName, prob] of Object.entries(this.ffProbs)) {
                const fName = this._normalize(ffName);
                const currentProbInt = parseInt(String(prob).replace("%", ""));
                
                let isMatch = false;

                // Priority 1: Special cases
                if (isAbde && fName.includes("abde")) isMatch = true;
                else if (isLuiz && fName.includes("luiz") && fName.includes("junior")) isMatch = true;
                else if (isOlmo && fName.includes("olmo")) isMatch = true;
                // Priority 2: Exact normalized match
                else if (fName === bName) isMatch = true;
                // Priority 3: Cross-containment
                else if (bParts.length > 0 && bParts.every(part => fName.includes(part))) isMatch = true;

                if (isMatch) {
                    if (currentProbInt > bestProbInt) {
                        bestProbInt = currentProbInt;
                        bestProb = prob;
                    }
                }
            }

            const scores = this._calculatePlayerScores({...p, ff_prob: bestProb});
            return {
                ...p,
                ff_prob: bestProb,
                safe_score: scores.safe,
                risk_score: scores.risk,
                dvp_label: scores.dvp_label,
                form_label: scores.form_label,
                form_val: scores.form_val,
                pos_name: this.positionMap[p.position] || "??",
                all_pos_names: (p.positions || [p.position]).map(pos => this.positionMap[pos] || "??")
            };
        });
    }

    solve(players, strategy = "safe") {
        const scoreKey = strategy === "safe" ? "safe_score" : "risk_score";
        for (const threshold of [50, 40, 30, 20, 10, 0]) {
            const validSquad = players.filter(p => {
                const prob = parseInt(String(p.ff_prob || "0").replace("%", "")) || 0;
                return prob >= threshold && p.status !== "injured";
            });
            if (validSquad.length < 11) continue;
            let bestOverallScore = -1;
            let bestLineup = [];
            let bestFormName = "";
            for (const form of this.formations) {
                let available = [...validSquad];
                let potential = [];
                const pick = (role, count) => {
                    const candidates = available
                        .filter(p => p.all_pos_names.includes(role))
                        .sort((a, b) => b[scoreKey] - a[scoreKey])
                        .slice(0, count);
                    if (candidates.length < count) return false;
                    candidates.forEach(c => {
                        potential.push(c);
                        available = available.filter(ap => ap.id !== c.id);
                    });
                    return true;
                };
                if (!pick("GK", 1)) continue;
                if (!pick("DF", form.DF)) continue;
                if (!pick("MF", form.MF)) continue;
                if (!pick("FW", form.FW)) continue;
                const totalScore = potential.reduce((sum, p) => sum + p[scoreKey], 0);
                if (totalScore > bestOverallScore) {
                    bestOverallScore = totalScore;
                    bestLineup = potential;
                    bestFormName = `${form.DF}-${form.MF}-${form.FW}`;
                }
            }
            if (bestLineup.length === 11) return { lineup: bestLineup, formation: bestFormName };
        }
        return { lineup: [], formation: "" };
    }
}

export default LineupOptimizer;

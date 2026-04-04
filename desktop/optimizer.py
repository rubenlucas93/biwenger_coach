from thefuzz import process, fuzz
from team_difficulty import get_difficulty_rating

class LineupOptimizer:
    def __init__(self, biwenger_players, ff_probs_by_team):
        self.players = biwenger_players
        self.ff_probs_by_team = ff_probs_by_team
        self.position_map = {1: "GK", 2: "DF", 3: "MF", 4: "FW"}
        self.formations = [
            {"GK": 1, "DF": 3, "MF": 4, "FW": 3},
            {"GK": 1, "DF": 3, "MF": 3, "FW": 4},
            {"GK": 1, "DF": 3, "MF": 6, "FW": 1},
            {"GK": 1, "DF": 3, "MF": 5, "FW": 2},
            {"GK": 1, "DF": 4, "MF": 4, "FW": 2},
            {"GK": 1, "DF": 4, "MF": 3, "FW": 3},
            {"GK": 1, "DF": 4, "MF": 5, "FW": 1},
            {"GK": 1, "DF": 5, "MF": 3, "FW": 2},
            {"GK": 1, "DF": 5, "MF": 4, "FW": 1},
        ]

    def _calculate_player_scores(self, p):
        prob_str = str(p.get("ff_prob", "0")).replace("%", "")
        try: prob = float(prob_str)
        except: prob = 0
        scores = [f if isinstance(f, (int, float)) else 0 for f in p.get("fitness", [])]
        avg_fitness = sum(scores) / len(scores) if scores else 0
        matchup_bonus = (6 - p.get("dvp_score", 3)) * 2
        trend_bonus = 1 if p.get("trend", 0) > 0 else 0
        loc_bonus = 1 if p.get("match_loc") == "Home" else 0
        
        safe_score = (prob * 0.5) + (avg_fitness * 4) + matchup_bonus + trend_bonus + loc_bonus
        peaks_bonus = p.get("peaks", 0) * 10 
        volatility_bonus = p.get("volatility", 0) * 1.5
        risk_score = (prob * 0.3) + (avg_fitness * 2) + peaks_bonus + volatility_bonus + matchup_bonus
        return round(safe_score, 2), round(risk_score, 2)

    def match_players(self):
        enriched_players = []
        team_slugs = list(self.ff_probs_by_team.keys())

        for p in self.players:
            name = p.get("name")
            team_name = p.get("team_name")
            if not name or not isinstance(name, str): continue

            # 1. Find the correct FF Team Slug
            best_team_slug, team_score = process.extractOne(team_name, team_slugs, scorer=fuzz.token_sort_ratio)
            team_probs = self.ff_probs_by_team.get(best_team_slug, {}) if team_score > 70 else {}

            # 2. Match name within that team (Smart Search)
            found_prob = "Unknown"
            if team_probs:
                ff_names = list(team_probs.keys())
                best_n, score_n = None, 0
                
                # Split Biwenger name into parts: "Ez Abde" -> ["ez", "abde"]
                name_parts = [p.lower() for p in name.split() if len(p) > 2]
                
                for ff_n in ff_names:
                    ff_n_lower = ff_n.lower()
                    # Check if any significant part of the name matches
                    if any(part in ff_n_lower for part in name_parts):
                        best_n = ff_n
                        score_n = 100
                        break
                
                if score_n < 100:
                    best_n, score_n = process.extractOne(name, ff_names, scorer=fuzz.token_sort_ratio)
                
                if score_n > 70:
                    found_prob = team_probs.get(best_n, "Unknown")

            p["ff_prob"] = found_prob
            pos_str = self.position_map.get(p["position"], "MF")
            diff_score, diff_label = get_difficulty_rating(p.get("rival_name", ""), pos_str)
            p["dvp_score"], p["dvp_label"] = diff_score, diff_label
            p["pos_name"] = pos_str
            p["all_pos_names"] = [self.position_map.get(pos, "Unknown") for pos in p.get("positions", [p["position"]])]
            p["safe_score"], p["risk_score"] = self._calculate_player_scores(p)
            enriched_players.append(p)
        
        return enriched_players

    def solve(self, players, strategy="safe"):
        score_key = f"{strategy}_score"
        for threshold in [50, 40, 30, 20, 10, 0]:
            valid_squad = [p for p in players if p["status"] != "injured" and self._get_prob_int(p["ff_prob"]) >= threshold]
            if len(valid_squad) < 11: continue
            best_overall_score, best_lineup, best_form_name = -1, [], ""
            for form in self.formations:
                available = list(valid_squad)
                pot_lineup = []
                # GK
                gks = sorted([p for p in available if "GK" in p["all_pos_names"]], key=lambda x: x[score_key], reverse=True)
                if not gks: continue
                pot_lineup.append(gks[0]); available.remove(gks[0])
                # DF
                dfs = sorted([p for p in available if "DF" in p["all_pos_names"]], key=lambda x: x[score_key], reverse=True)
                if len(dfs) < form["DF"]: continue
                pot_lineup.extend(dfs[:form["DF"]])
                for p in dfs[:form["DF"]]: available.remove(p)
                # MF
                mfs = sorted([p for p in available if "MF" in p["all_pos_names"]], key=lambda x: x[score_key], reverse=True)
                if len(mfs) < form["MF"]: continue
                pot_lineup.extend(mfs[:form["MF"]])
                for p in mfs[:form["MF"]]: available.remove(p)
                # FW
                fws = sorted([p for p in available if "FW" in p["all_pos_names"]], key=lambda x: x[score_key], reverse=True)
                if len(fws) < form["FW"]: continue
                pot_lineup.extend(fws[:form["FW"]])
                t_score = sum(p[score_key] for p in pot_lineup)
                if t_score > best_overall_score:
                    best_overall_score, best_lineup, best_form_name = t_score, pot_lineup, f"{form['DF']}-{form['MF']}-{form['FW']}"
            if best_lineup: return best_lineup, best_form_name
        return [], ""

    def _get_prob_int(self, prob_str):
        try: return int(str(prob_str).replace("%",""))
        except: return 0

    def generate_chat_context(self, players, safe_lineup, safe_form, risk_lineup, risk_form, allow_subs=False):
        context = f"I have two optimized lineups for you:\n\n"
        context += f"LINEUP 1: SAFE & CONSISTENT ({safe_form})\n"
        for p in safe_lineup: context += f"- {p['name']} | Safe Score: {p['safe_score']} | vs {p['rival_name']}\n"
        context += f"\nLINEUP 2: RISK-LOVER & EXPLOSIVE ({risk_form})\n"
        for p in risk_lineup: context += f"- {p['name']} | Risk Score: {p['risk_score']} | vs {p['rival_name']}\n"
        
        lineup_names = [p["name"] for p in risk_lineup]
        bench = [p for p in players if p["name"] not in lineup_names and p["status"] != "injured" and p["safe_score"] > 0]
        
        # Sort bench by match date (Latest first) to find potential late subs
        late_bench = sorted(bench, key=lambda x: x.get("match_date", 0), reverse=True)

        if allow_subs:
            context += "\nSUBSTITUTION STRATEGY ENABLED (1 Sub Allowed):\n"
            context += "Here are the best players on your bench who play LATE in the jornada (potential Super Subs):\n"
            for b in late_bench[:5]:
                context += f"- {b['name']} ({b['pos_name']}) | Score: {b['safe_score']} | Match Date: {b.get('match_date')}\n"
            
            context += "\nTASK: Look for a player in the starting lineup who plays EARLY. If they score poorly, who is the best LATE-playing bench player (from the list above) to sub in? Give me a concrete 'If X fails, sub in Y' plan."
        else:
            context += "\nTASK: Analyze the difference. Provide expert analysis and recommend a captain for both."
        return context

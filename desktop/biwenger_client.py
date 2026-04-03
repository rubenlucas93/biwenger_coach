import requests
import json
import time

class BiwengerClient:
    BASE_URL = "https://biwenger.as.com/api/v2"

    def __init__(self, email, password):
        self.email = email
        self.password = password
        self.session = requests.Session()
        self.token = None
        self.userId = None
        self.leagueId = None
        self.headers = {
            "Content-Type": "application/json",
            "X-Version": "630",
            "X-Client": "android",
            "X-Lang": "es",
            "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        }

    def login(self):
        try:
            login_url = f"{self.BASE_URL}/auth/login"
            payload = {"email": self.email, "password": self.password}
            response = self.session.post(login_url, json=payload, headers=self.headers)
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("token") or data.get("data", {}).get("token")
                self.headers["Authorization"] = f"Bearer {self.token}"
                
                acc_res = self.session.get(f"{self.BASE_URL}/account", headers=self.headers)
                if acc_res.status_code == 200:
                    acc_data = acc_res.json().get("data", {})
                    self.userId = acc_data.get("id")
                    leagues = acc_data.get("leagues", [])
                    if leagues:
                        self.leagueId = str(leagues[0].get("id"))
                        user_node = leagues[0].get("user")
                        if not self.userId and user_node: self.userId = user_node.get("id")
                    if self.userId: self.headers["X-User"] = str(self.userId)
                    if self.leagueId: self.headers["X-League"] = str(self.leagueId)
                return { "token": self.token, "user_id": self.userId, "league_id": self.leagueId }
            return None
        except:
            return None

    def get_player_list(self):
        try:
            fields = "*,players(*,id),league(*)"
            user_res = self.session.get(f"{self.BASE_URL}/user?fields={fields}", headers=self.headers)
            if user_res.status_code != 200: return [], {}
            
            user_json = user_res.json().get("data", {})
            user_player_ids = {p["id"] for p in user_json.get("players", [])}
            comp_slug = user_json.get("league", {}).get("competition", "la-liga")

            comp_url = f"{self.BASE_URL}/competitions/{comp_slug}/data?score=2"
            comp_res = self.session.get(comp_url, headers=self.headers)
            
            if comp_res.status_code != 200:
                return [], {}

            data = comp_res.json().get("data", {})
            all_players = data.get("players", {})
            all_teams = data.get("teams", {})

            team_id_to_name = {int(tid): t.get("name") for tid, t in all_teams.items()}
            team_id_to_match = {}
            
            for tid, t in all_teams.items():
                tid_int = int(tid)
                next_games = t.get("nextGames", [])
                if next_games:
                    game = next_games[0]
                    h_node = game.get("home")
                    a_node = game.get("away")
                    if h_node and a_node:
                        is_h = int(h_node.get("id")) == tid_int
                        rival_id = int(a_node.get("id") if is_h else h_node.get("id"))
                        team_id_to_match[tid_int] = {
                            "rival": team_id_to_name.get(rival_id, f"Team {rival_id}"),
                            "location": "Home" if is_h else "Away",
                            "date": game.get("date", 0)
                        }

            player_list = []
            for pid_str, p in all_players.items():
                pid = int(pid_str)
                if pid in user_player_ids:
                    fitness = p.get("fitness", [])
                    num_f = [f for f in fitness if isinstance(f, (int, float))]
                    peaks = sum(1 for f in num_f if f >= 9)
                    vol = (max(num_f) - min(num_f)) if len(num_f) > 1 else 0
                    
                    t_id = p.get("teamID") or p.get("team")
                    match_info = team_id_to_match.get(t_id, {"rival": "Unknown", "location": "Unknown", "date": 0})

                    player_list.append({
                        "id": pid,
                        "name": p.get("name"),
                        "position": p.get("position"),
                        "positions": [p.get("position")] + p.get("altPositions", []),
                        "status": p.get("status"),
                        "fitness": fitness,
                        "peaks": peaks,
                        "volatility": vol,
                        "team_id": t_id,
                        "team_name": team_id_to_name.get(t_id, "Unknown"),
                        "rival_name": match_info["rival"],
                        "location": match_info["location"],
                        "match_date": match_info["date"],
                        "price_trend": p.get("priceIncrement", 0)
                    })

            return player_list, team_id_to_name
        except:
            return [], {}

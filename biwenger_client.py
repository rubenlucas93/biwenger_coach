import requests
import json

class BiwengerClient:
    BASE_URL = "https://biwenger.as.com/api/v2"

    def __init__(self, email, password):
        self.email = email
        self.password = password
        self.session = requests.Session()
        self.token = None
        self.headers = {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

    def login(self):
        login_url = f"{self.BASE_URL}/auth/login"
        payload = {"email": self.email, "password": self.password}
        response = self.session.post(login_url, json=payload, headers=self.headers)
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token") or data.get("data", {}).get("token")
            self.headers["Authorization"] = f"Bearer {self.token}"
            account_url = f"{self.BASE_URL}/account"
            acc_res = self.session.get(account_url, headers=self.headers)
            if acc_res.status_code == 200:
                acc_data = acc_res.json().get("data", {})
                user_id = acc_data.get("id")
                leagues = acc_data.get("leagues", [])
                if leagues:
                    self.headers["X-League"] = str(leagues[0].get("id"))
                    if not user_id: user_id = leagues[0].get("user", {}).get("id")
                if user_id: self.headers["X-User"] = str(user_id)
            return True
        return False

    def get_user_data(self):
        fields = "*,players(*,fitness,team,owner),nextRounds(*),team(*),league(*,points,customState,board,rules,market,activeOffers,userDraft)"
        user_url = f"{self.BASE_URL}/user?fields={fields}"
        response = self.session.get(user_url, headers=self.headers)
        if response.status_code == 200:
            return response.json().get("data", {})
        return None

    def get_player_list(self):
        data = self.get_user_data()
        if not data: return [], {}
        
        user_players_brief = data.get("players", [])
        user_player_ids = {p["id"] for p in user_players_brief}
        
        league_data = data.get("league", {})
        competition_slug = league_data.get("competition", "la-liga")
        
        comp_url = f"https://cf.biwenger.com/api/v2/competitions/{competition_slug}/data?score=2"
        comp_res = requests.get(comp_url, headers={"User-Agent": self.headers["User-Agent"]})
        if comp_res.status_code != 200:
            comp_res = self.session.get(comp_url, headers=self.headers)
        
        if comp_res.status_code != 200: return [], {}

        comp_json = comp_res.json().get("data", {})
        all_players = comp_json.get("players", {})
        all_teams = comp_json.get("teams", {})
        
        team_id_to_name = {int(tid): tinfo.get("name") for tid, tinfo in all_teams.items()}
        
        # Build team rivals and match location mapping
        team_id_to_match = {}
        for tid, tinfo in all_teams.items():
            tid_int = int(tid)
            next_games = tinfo.get("nextGames", [])
            if next_games:
                game = next_games[0]
                home_id = game.get("home", {}).get("id")
                away_id = game.get("away", {}).get("id")
                
                is_home = (home_id == tid_int)
                rival_id = away_id if is_home else home_id
                match_date = game.get("date", 0)
                
                if rival_id:
                    team_id_to_match[tid_int] = {
                        "rival": team_id_to_name.get(rival_id, f"Team {rival_id}"),
                        "location": "Home" if is_home else "Away",
                        "date": match_date
                    }

        player_list = []
        for p_id_str, p_info in all_players.items():
            p_id = int(p_id_str)
            if p_id in user_player_ids:
                primary_pos = p_info.get("position")
                alt_positions = p_info.get("altPositions", [])
                positions = [primary_pos]
                for pos in alt_positions:
                    if pos not in positions: positions.append(pos)
                
                t_id = p_info.get("teamID") or p_info.get("team")
                match_info = team_id_to_match.get(t_id, {"rival": "Unknown", "location": "Unknown", "date": 0})
                
                # Calculate extra stats for Risk analysis
                fitness = p_info.get("fitness", [])
                numeric_fitness = [f for f in fitness if isinstance(f, (int, float))]
                peaks = sum(1 for f in numeric_fitness if f >= 9)
                volatility = (max(numeric_fitness) - min(numeric_fitness)) if len(numeric_fitness) > 1 else 0
                
                player_list.append({
                    "id": p_id,
                    "name": p_info.get("name"),
                    "position": primary_pos, 
                    "positions": positions,            
                    "status": p_info.get("status"),
                    "fitness": fitness,
                    "peaks": peaks,
                    "volatility": volatility,
                    "team_id": t_id,
                    "team_name": team_id_to_name.get(t_id, "Unknown"),
                    "rival_name": match_info["rival"],
                    "location": match_info["location"],
                    "match_date": match_info["date"],
                    "price_trend": p_info.get("priceIncrement", 0)
                })
        return player_list, team_id_to_name

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
from biwenger_client import BiwengerClient
from ff_scraper import FutbolFantasyScraper
from optimizer import LineupOptimizer
import time

app = FastAPI(title="Biwenger Optimizer API")

# Simple global cache for FF data to avoid re-scraping too often (valid for 1 hour)
ff_cache = {
    "data": None,
    "timestamp": 0
}

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/login")
def login(req: LoginRequest):
    client = BiwengerClient(email=req.email, password=req.password)
    login_info = client.login()
    if not login_info:
        raise HTTPException(status_code=401, detail="Invalid Biwenger credentials")
    return login_info

def get_ff_data():
    current_time = time.time()
    if not ff_cache["data"] or (current_time - ff_cache["timestamp"]) > 3600:
        scraper = FutbolFantasyScraper()
        ff_cache["data"] = scraper.get_all_lineup_data()
        ff_cache["timestamp"] = current_time
    return ff_cache["data"]

@app.get("/squad")
def get_squad(
    token: str = Header(...),
    x_user: str = Header(...),
    x_league: str = Header(...)
):
    client = BiwengerClient(token=token, user_id=x_user, league_id=x_league)
    players, _ = client.get_player_list()
    if not players:
        raise HTTPException(status_code=404, detail="No players found")
    
    ff_probs = get_ff_data()
    optimizer = LineupOptimizer(players, ff_probs)
    enriched_players = optimizer.match_players()
    
    return enriched_players

@app.get("/optimize")
def optimize(
    token: str = Header(...),
    x_user: str = Header(...),
    x_league: str = Header(...)
):
    client = BiwengerClient(token=token, user_id=x_user, league_id=x_league)
    players, _ = client.get_player_list()
    if not players:
        raise HTTPException(status_code=404, detail="No players found")
    
    ff_probs = get_ff_data()
    optimizer = LineupOptimizer(players, ff_probs)
    enriched_players = optimizer.match_players()
    
    safe_lineup, safe_form = optimizer.solve(enriched_players, strategy="safe")
    risk_lineup, risk_form = optimizer.solve(enriched_players, strategy="risk")
    
    return {
        "safe": {"lineup": safe_lineup, "formation": safe_form},
        "risk": {"lineup": risk_lineup, "formation": risk_form},
        "ranking": sorted(enriched_players, key=lambda x: x["safe_score"], reverse=True)
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

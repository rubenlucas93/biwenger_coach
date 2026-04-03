import os
import json
import requests
from biwenger_client import BiwengerClient
from dotenv import load_dotenv

def inspect():
    load_dotenv()
    email = os.getenv("BIWENGER_EMAIL")
    password = os.getenv("BIWENGER_PASSWORD")
    
    client = BiwengerClient(email, password)
    if not client.login():
        print("Login failed")
        return
    
    # Use the client session to ensure headers are correct
    league_data = client.get_user_data().get("league", {})
    comp_slug = league_data.get("competition", "la-liga")
    
    print(f"Fetching competition data for {comp_slug}...")
    comp_url = f"https://cf.biwenger.com/api/v2/competitions/{comp_slug}/data?score=2"
    res = client.session.get(comp_url, headers=client.headers)
    
    if res.status_code != 200:
        print(f"Failed to fetch: {res.status_code}")
        return

    data = res.json().get("data", {})
    players = data.get("players", {})
    
    # Find a player with high points to see their keys
    for p_id, p_info in players.items():
        if p_info.get("points", 0) > 100:
            print(f"\nPLAYER KEYS for {p_info.get('name')}:")
            print(list(p_info.keys()))
            print("\nSAMPLE DATA:")
            print(json.dumps(p_info, indent=2))
            break

if __name__ == "__main__":
    inspect()

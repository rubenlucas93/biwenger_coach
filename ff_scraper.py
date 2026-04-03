import requests
from bs4 import BeautifulSoup
import re

class FutbolFantasyScraper:
    BASE_URL = "https://www.futbolfantasy.com"
    TEAMS = [
        "alaves", "athletic", "atletico", "barcelona", "betis", "celta", "elche",
        "espanyol", "getafe", "girona", "levante", "mallorca", "osasuna",
        "rayo-vallecano", "real-madrid", "real-oviedo", "real-sociedad",
        "sevilla", "valencia", "villarreal"
    ]

    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

    def scrape_team_page(self, team_slug):
        url = f"{self.BASE_URL}/laliga/equipos/{team_slug}"
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code != 200: return {}
            soup = BeautifulSoup(response.content, "html.parser")
            player_probs = {}
            items = soup.find_all(attrs={"data-probabilidad": True})
            for item in items:
                prob = item["data-probabilidad"]
                if prob == "Titular": prob = "100%"
                elif prob == "Suplente": prob = "0%"
                name = None
                img = item.find("img", alt=True)
                if img: name = img["alt"]
                if not name:
                    name_tag = item.find(class_=re.compile(r"truncate-name|nombre", re.I))
                    if name_tag: name = name_tag.get_text(strip=True)
                if name: player_probs[name.strip()] = prob
            
            # Text fallback
            for tag in soup.find_all(string=re.compile(r"\d+%")):
                p = tag.strip()
                parent = tag.find_parent()
                if parent:
                    text = parent.get_text(" ", strip=True).replace(p, "")
                    m = re.search(r"([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)", text)
                    if not m: m = re.search(r"([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{3,})", text)
                    if m:
                        n = m.group(1).strip()
                        if n not in player_probs: player_probs[n] = p
            return player_probs
        except:
            return {}

    def get_all_lineup_data(self):
        print("Scraping FF data team by team...")
        # Dictionary of team_slug -> { player_name: prob }
        all_probs_by_team = {}
        for team in self.TEAMS:
            probs = self.scrape_team_page(team)
            all_probs_by_team[team] = probs
        return all_probs_by_team

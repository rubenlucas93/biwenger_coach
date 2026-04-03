# General points allowed by position for each LaLiga team (2025/26 Season)
# Scale: 1 (Very easy to score points against) to 5 (Extremely hard to score points against)

TEAM_DIFFICULTY = {
    "Athletic": {"GK": 3, "DF": 4, "MF": 3, "FW": 4},
    "Atlético": {"GK": 2, "DF": 5, "MF": 4, "FW": 5},
    "Barcelona": {"GK": 3, "DF": 4, "MF": 5, "FW": 4},
    "Real Madrid": {"GK": 2, "DF": 4, "MF": 5, "FW": 5},
    "Real Sociedad": {"GK": 3, "DF": 4, "MF": 4, "FW": 3},
    "Villarreal": {"GK": 4, "DF": 2, "MF": 3, "FW": 2},
    "Girona": {"GK": 3, "DF": 3, "MF": 3, "FW": 3},
    "Betis": {"GK": 3, "DF": 3, "MF": 3, "FW": 3},
    "Sevilla": {"GK": 4, "DF": 2, "MF": 2, "FW": 2},
    "Valencia": {"GK": 3, "DF": 3, "MF": 2, "FW": 2},
    "Celta": {"GK": 4, "DF": 2, "MF": 3, "FW": 2},
    "Osasuna": {"GK": 3, "DF": 4, "MF": 3, "FW": 3},
    "Getafe": {"GK": 1, "DF": 5, "MF": 4, "FW": 4}, # GK 1 because they force many saves
    "Mallorca": {"GK": 1, "DF": 4, "MF": 3, "FW": 4},
    "Rayo Vallecano": {"GK": 3, "DF": 2, "MF": 2, "FW": 2},
    "Espanyol": {"GK": 3, "DF": 2, "MF": 2, "FW": 2},
    "Alavés": {"GK": 3, "DF": 3, "MF": 3, "FW": 3},
    "Las Palmas": {"GK": 4, "DF": 2, "MF": 3, "FW": 2},
    "Elche": {"GK": 5, "DF": 1, "MF": 1, "FW": 1},      # Easy for attackers
    "Real Oviedo": {"GK": 5, "DF": 1, "MF": 1, "FW": 1}, # Easy for attackers
}

def get_difficulty_rating(team_name, position):
    """Returns a rating 1-5 and a label."""
    # Fuzzy matching helper
    team_data = None
    for name, data in TEAM_DIFFICULTY.items():
        if name.lower() in team_name.lower() or team_name.lower() in name.lower():
            team_data = data
            break
    
    if not team_data:
        return 3, "Moderate"
    
    score = team_data.get(position, 3)
    labels = {1: "Very Easy", 2: "Easy", 3: "Moderate", 4: "Hard", 5: "Extreme"}
    return score, labels.get(score, "Moderate")

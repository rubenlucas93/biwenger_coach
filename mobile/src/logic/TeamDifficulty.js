export const TEAM_DIFFICULTY = {
    "Athletic": {GK: 3, DF: 4, MF: 3, FW: 4},
    "Atlético": {GK: 2, DF: 5, MF: 4, FW: 5},
    "Barcelona": {GK: 3, DF: 4, MF: 5, FW: 4},
    "Real Madrid": {GK: 2, DF: 4, MF: 5, FW: 5},
    "Real Sociedad": {GK: 3, DF: 4, MF: 4, FW: 3},
    "Villarreal": {GK: 4, DF: 2, MF: 3, FW: 2},
    "Girona": {GK: 3, DF: 3, MF: 3, FW: 3},
    "Betis": {GK: 3, DF: 3, MF: 3, FW: 3},
    "Sevilla": {GK: 4, DF: 2, MF: 2, FW: 2},
    "Valencia": {GK: 3, DF: 3, MF: 2, FW: 2},
    "Celta": {GK: 4, DF: 2, MF: 3, FW: 2},
    "Osasuna": {GK: 3, DF: 4, MF: 3, FW: 3},
    "Getafe": {GK: 1, DF: 5, MF: 4, FW: 4},
    "Mallorca": {GK: 1, DF: 4, MF: 3, FW: 4},
    "Rayo Vallecano": {GK: 3, DF: 2, MF: 2, FW: 2},
    "Espanyol": {GK: 3, DF: 2, MF: 2, FW: 2},
    "Alavés": {GK: 3, DF: 3, MF: 3, FW: 3},
    "Las Palmas": {GK: 4, DF: 2, MF: 3, FW: 2},
    "Elche": {GK: 5, DF: 1, MF: 1, FW: 1},
    "Real Oviedo": {GK: 5, DF: 1, MF: 1, FW: 1},
};

export const getDifficultyRating = (teamName, position) => {
    let teamData = null;
    const searchName = teamName.toLowerCase();
    
    for (const [name, data] of Object.entries(TEAM_DIFFICULTY)) {
        if (searchName.includes(name.toLowerCase()) || name.toLowerCase().includes(searchName)) {
            teamData = data;
            break;
        }
    }
    
    if (!teamData) return { score: 3, label: "Moderate" };
    
    const score = teamData[position] || 3;
    const labels = {1: "Very Easy", 2: "Easy", 3: "Moderate", 4: "Hard", 5: "Extreme"};
    return { score, label: labels[score] || "Moderate" };
};

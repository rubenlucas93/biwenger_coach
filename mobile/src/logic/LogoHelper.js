const teamSlugs = {
    'athletic': 'Athletic_Club_logo.png',
    'atletico': 'Atletico_Madrid_2017_logo.png',
    'barcelona': 'FC_Barcelona_(crest).svg.png',
    'betis': 'Real_Betis.png',
    'celta': 'RC_Celta_de_Vigo_logo.png',
    'elche': 'Elche_CF_logo.png',
    'espanyol': 'RCD_Espanyol_Logo.png',
    'getafe': 'Getafe_logo.png',
    'girona': 'Girona_FC_logo.png',
    'mallorca': 'Rcd_mallorca.png',
    'osasuna': 'Osasuna_logo.png',
    'rayo': 'Rayo_Vallecano_logo.png',
    'real madrid': 'Real_Madrid_CF.svg.png',
    'real sociedad': 'Real_Sociedad_logo.png',
    'sevilla': 'Sevilla_fc_crest.png',
    'valencia': 'Valencia_Cf_logo.png',
    'villarreal': 'Villarreal_CF_logo.png',
    'alaves': 'Deportivo_Alaves_logo.png'
};

export const getLogoUrl = (name) => {
    if (!name) return null;
    const lower = name.toLowerCase();
    for (const key in teamSlugs) {
        if (lower.includes(key)) {
            return `https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/${teamSlugs[key]}/200px-${teamSlugs[key]}`;
        }
    }
    // Fallback to a very simple placeholder service
    return `https://ui-avatars.com/api/?name=${name[0]}&background=random&color=fff`;
};

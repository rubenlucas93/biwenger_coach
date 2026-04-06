const fs = require('fs');
let code = fs.readFileSync('src/logic/Translations.js', 'utf8');

code = code.replace(
    'total_exp: "TOTAL ESP"\n    },',
    `total_exp: "TOTAL ESP",
        projection: "PROYECCIÓN",
        recent_avg: "MEDIA RECIENTE",
        projected_pts: "PROYECTADOS"
    },`
);

code = code.replace(
    'total_exp: "TOTAL EXP"\n    }\n};',
    `total_exp: "TOTAL EXP",
        projection: "PROJECTION",
        recent_avg: "RECENT AVG",
        projected_pts: "PROJECTED PTS"
    }
};`
);

fs.writeFileSync('src/logic/Translations.js', code);
console.log('Translations patched successfully');

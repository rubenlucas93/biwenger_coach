const fs = require('fs');
let code = fs.readFileSync('src/logic/Optimizer.js', 'utf8');

code = code.replace(
    'const formVal = Math.round(avgFitness * 10) / 10;',
    `const formVal = Math.round(avgFitness * 10) / 10;
        
        // Projection calculation
        const currentPoints = p.points || 0;
        const remaining = p.remaining_matches || 8;
        const last5Avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const projected_pts = Math.round(currentPoints + (last5Avg * remaining));`
);

code = code.replace(
    'form_label: formLabel,\n            form_val: formVal\n        };',
    `form_label: formLabel,
            form_val: formVal,
            projected_pts: projected_pts,
            current_pts: currentPoints,
            last5_avg: Math.round(last5Avg * 10) / 10
        };`
);

code = code.replace(
    'form_label: scores.form_label,\n                form_val: scores.form_val,',
    `form_label: scores.form_label,
                form_val: scores.form_val,
                projected_pts: scores.projected_pts,
                current_pts: scores.current_pts,
                last5_avg: scores.last5_avg,`
);

fs.writeFileSync('src/logic/Optimizer.js', code);
console.log('Optimizer patched successfully');

const fs = require('fs');
const path = require('path');

const localesDir = path.join('/root/YokaizenCampus/AI Labs FULL project/yokaizen-ai-labs/locales');
const languages = fs.readdirSync(localesDir).filter(f => fs.statSync(path.join(localesDir, f)).isDirectory());

const keysToRemove = [
    'game.aethelred_gambit.title',
    'game.veritas_falls.title',
    'game.lazarus_vector.title'
];

for (const lang of languages) {
    const gamePath = path.join(localesDir, lang, 'game.ts');
    if (fs.existsSync(gamePath)) {
        let lines = fs.readFileSync(gamePath, 'utf8').split('\n');
        
        let foundKeys = new Set();
        let newLines = [];
        
        for (let line of lines) {
            let isDuplicate = false;
            for (let key of keysToRemove) {
                if (line.includes(`'${key}'`)) {
                    if (foundKeys.has(key)) {
                        isDuplicate = true; // Skip this line
                    } else {
                        foundKeys.add(key); // Keep the first occurrence
                    }
                }
            }
            if (!isDuplicate) {
                newLines.push(line);
            }
        }
        
        fs.writeFileSync(gamePath, newLines.join('\n'));
    }
}
console.log('Duplicates removed.');

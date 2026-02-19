const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../locales');
const enDir = path.join(localesDir, 'en');
const targetLangs = ['ja', 'ko', 'id', 'th', 'ca', 'eu', 'de', 'fr', 'nl', 'pl', 'pt'];

const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.ts'));

targetLangs.forEach(lang => {
    const langDir = path.join(localesDir, lang);
    if (!fs.existsSync(langDir)) {
        fs.mkdirSync(langDir, { recursive: true });
    }

    enFiles.forEach(file => {
        const enFilePath = path.join(enDir, file);
        const targetFilePath = path.join(langDir, file);
        let content = fs.readFileSync(enFilePath, 'utf-8');

        if (file === 'index.ts') {
            content = content.replace(/export const EN =/g, `export const ${lang.toUpperCase()} =`);
            fs.writeFileSync(targetFilePath, content);
            return;
        }

        // Extremely simple AST replacement using Regex for object properties
        // Matches properties like `games.neondrift.title`: "Neon Drift",
        // and nested objects if they are strings.
        let newContent = content.replace(/(['"]?.+['"]?\s*:\s*)(["'])(.+?)\2(,|\n)/g, (match, p1, quote, internalStr, p4) => {
            // Check if it's already translated or just an exported const name
            if (p1.includes('export const')) return match;
            return `${p1}${quote}[${lang.toUpperCase()}] ${internalStr}${quote}${p4}`;
        });

        fs.writeFileSync(targetFilePath, newContent);
    });
    console.log(`Cloned and prefixed localization for: ${lang.toUpperCase()}`);
});

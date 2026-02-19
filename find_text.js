import fs from 'fs';
import path from 'path';

const gamesDir = '/root/YokaizenCampus/AI Labs FULL project/yokaizen-ai-labs/components/games';
const files = fs.readdirSync(gamesDir).filter(f => f.endsWith('.tsx'));

const results = {};

for (const file of files) {
    const filePath = path.join(gamesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Find text between > and <
    const textMatches = [...content.matchAll(/>([^<{}]+)</g)];

    let strings = [];
    for (const match of textMatches) {
        let text = match[1].trim();
        if (text.length > 1 && /[A-Za-z]/.test(text) && !text.includes('import ') && !text.includes('export ')) {
            strings.push(text);
        }
    }

    if (strings.length > 0) {
        results[file] = [...new Set(strings)];
    }
}

console.log(JSON.stringify(results, null, 2));

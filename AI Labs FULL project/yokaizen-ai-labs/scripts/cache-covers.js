import fs from 'fs';
import https from 'https';
import path from 'path';

const constantsPath = path.resolve('./constants.ts');
const coversDir = path.resolve('./public/assets/aaa/covers');

if (!fs.existsSync(coversDir)) {
    fs.mkdirSync(coversDir, { recursive: true });
}

const content = fs.readFileSync(constantsPath, 'utf-8');
const lines = content.split('\n');

const games = [];
for (const line of lines) {
    if (line.includes('title:') && line.includes('visualPrompt:')) {
        const idMatch = line.match(/id:\s*'([^']+)'/);
        const promptMatch = line.match(/visualPrompt:\s*'([^']+)'/);
        if (idMatch && promptMatch) {
            games.push({ id: idMatch[1], prompt: promptMatch[1] });
        }
    }
}

console.log(`Found ${games.length} games to process.`);

async function downloadImage(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                const file = fs.createWriteStream(dest);
                res.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            } else if (res.statusCode === 301 || res.statusCode === 302) {
                downloadImage(res.headers.location, dest).then(resolve).catch(reject);
            } else {
                reject(new Error(`Failed with status code: ${res.statusCode}`));
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

function getEpicPrompt(visualPrompt) {
    return `${visualPrompt}, epic AAA game cover masterpiece, 8k resolution, highly detailed volumetric lighting, brutalist cyberpunk dark aesthetics, trending on artstation`;
}

async function processGames() {
    for (let i = 0; i < games.length; i++) {
        const game = games[i];
        const epicPrompt = getEpicPrompt(game.prompt);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(epicPrompt)}?width=480&height=270&nologo=true&seed=${game.id}`;
        const dest = path.join(coversDir, `${game.id}.png`);

        console.log(`[${i + 1}/${games.length}] Downloading ${game.id}.png...`);
        try {
            await downloadImage(url, dest);
            console.log(`   -> Success: ${game.id}.png`);
        } catch (e) {
            console.error(`   -> Error downloading ${game.id}: ${e.message}`);
        }
    }
    console.log('All downloads finished!');
}

processGames();

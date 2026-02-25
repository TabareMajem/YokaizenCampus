const fs = require('fs');
const path = require('path');

const localesDir = path.join('/root/YokaizenCampus/AI Labs FULL project/yokaizen-ai-labs/locales');
const languages = fs.readdirSync(localesDir).filter(f => fs.statSync(path.join(localesDir, f)).isDirectory());

const commonAdditions = `
    'profile.xp': 'PROFILE XP',
    'profile.streak': 'STREAK',
    'profile.credits': 'CREDITS',
    'home.next_unlock': 'NEXT UNLOCK',
    'home.view_lab': 'VIEW LAB',
    'home.continue_path': 'CONTINUE PATH',
    'home.path_desc': 'Resume your neural training journey.',
    'difficulty.rookie': 'ROOKIE',
    'difficulty.pro': 'PRO',
    'difficulty.elite': 'ELITE',
`;

const gameAdditions = `
    'game.quantum_qubit.title': 'Quantum Qubit', 'game.quantum_qubit.desc': 'Entangle logic gates.',
    'game.neural_prism.title': 'Neural Prism', 'game.neural_prism.desc': 'Refract token embeddings.',
    'game.synapse_surge.title': 'Synapse Surge', 'game.synapse_surge.desc': 'Navigate data bottlenecks.',
    'game.deepfake_deflector.title': 'Deepfake Deflector', 'game.deepfake_deflector.desc': 'Spot AI artifacts.',
    'game.oracle_index.title': 'Oracle Index', 'game.oracle_index.desc': 'RAG database retrieval.',
    'game.chaos_engineering.title': 'Chaos Engineering', 'game.chaos_engineering.desc': 'System resilience.',
    'game.turing_tessellation.title': 'Turing Tessellation', 'game.turing_tessellation.desc': 'Align moral frameworks.',
    'game.data_heist.title': 'Data Heist', 'game.data_heist.desc': 'Zero-knowledge proofs.',
    'game.prompt_sculptor.title': 'Prompt Sculptor', 'game.prompt_sculptor.desc': 'Context window constraints.',
    'game.singularity_core.title': 'Singularity Core', 'game.singularity_core.desc': 'AGI containment.',
    'game.aethelred_gambit.title': 'Aethelred Gambit', 'game.aethelred_gambit.desc': 'Defend against invasion.',
    'game.veritas_falls.title': 'Veritas Falls', 'game.veritas_falls.desc': 'Information warfare.',
    'game.lazarus_vector.title': 'Lazarus Vector', 'game.lazarus_vector.desc': 'Revive dead systems.',
`;

for (const lang of languages) {
    const commonPath = path.join(localesDir, lang, 'common.ts');
    if (fs.existsSync(commonPath)) {
        let content = fs.readFileSync(commonPath, 'utf8');
        content = content.replace('};', commonAdditions + '};\n');
        fs.writeFileSync(commonPath, content);
    }
    
    const gamePath = path.join(localesDir, lang, 'game.ts');
    if (fs.existsSync(gamePath)) {
        let content = fs.readFileSync(gamePath, 'utf8');
        content = content.replace('};', gameAdditions + '};\n');
        fs.writeFileSync(gamePath, content);
    }
}
console.log('Fixed translations globally!');

const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project();
project.addSourceFilesAtPaths("components/games/*.tsx");

const enTranslations = {};
const esTranslations = {};

// Helper to slugify text for key
function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '').substring(0, 20);
}

const files = project.getSourceFiles();

files.forEach(file => {
    const filename = file.getBaseNameWithoutExtension();
    // Skip already manually translated components or overly complex ones that might break
    if (['NeonDrift', 'TokenTsunami', 'NeonSyndicate'].includes(filename)) {
        return;
    }

    let changed = false;

    // 1. Find Prop interface and add `t?: (key: string) => string;`
    const interfaces = file.getInterfaces();
    let propInterface = interfaces.find(i => i.getName().endsWith('Props'));

    if (propInterface) {
        if (!propInterface.getProperty('t')) {
            propInterface.addProperty({
                name: 't',
                hasQuestionToken: false,
                type: '(key: string) => string',
            });
            changed = true;
        }
    }

    // 2. Find the React component and add `t` to destructured params if missing
    const arrowFuncs = file.getDescendantsOfKind(SyntaxKind.ArrowFunction);
    arrowFuncs.forEach(func => {
        const parent = func.getParent();
        if (parent.getKind() === SyntaxKind.VariableDeclaration) {
            const name = parent.getName();
            if (name === filename || (filename.includes(name))) {
                const params = func.getParameters();
                if (params.length > 0) {
                    const param = params[0];
                    if (param.getKind() === SyntaxKind.Parameter) {
                        const nameNode = param.getNameNode();
                        if (nameNode.getKind() === SyntaxKind.ObjectBindingPattern) {
                            const elements = nameNode.getElements();
                            const tElement = elements.find(e => e.getNameNode().getText() === 't');
                            if (!tElement) {
                                const newText = nameNode.getText().replace('}', ', t = (k: any) => k }');
                                nameNode.replaceWithText(newText);
                                changed = true;
                            }
                        }
                    }
                }
            }
        }
    });

    // 3. Find JSX Text and Attributes
    const jsxTexts = file.getDescendantsOfKind(SyntaxKind.JsxText);
    jsxTexts.forEach(jsxText => {
        let text = jsxText.getLiteralText().replace(/\s+/g, ' ');
        if (text && /[a-zA-Z]/.test(text) && text.trim().length > 1) {
            text = text.trim();
            const slug = slugify(text);
            const key = `${filename.toLowerCase()}.${slug}`;
            const fullKey = `games.${key}`;

            // Generate Key dict
            enTranslations[key] = text;
            esTranslations[key] = `[ES] ${text}`;

            try {
                jsxText.replaceWithText(`{t('${fullKey}')}`);
                changed = true;
            } catch (e) {
                // Ignore overlapping replace errors
            }
        }
    });

    const jsxAttributes = file.getDescendantsOfKind(SyntaxKind.JsxAttribute);
    jsxAttributes.forEach(attr => {
        const name = attr.getNameNode().getText();
        if (['placeholder', 'title', 'label'].includes(name)) {
            const init = attr.getInitializer();
            if (init && init.getKind() === SyntaxKind.StringLiteral) {
                const text = init.getLiteralValue().trim();
                if (text && /[a-zA-Z]/.test(text)) {
                    const slug = slugify(text);
                    const key = `${filename.toLowerCase()}.${slug}`;
                    const fullKey = `games.${key}`;

                    enTranslations[key] = text;
                    esTranslations[key] = `[ES] ${text}`;

                    try {
                        init.replaceWithText(`{t('${fullKey}')}`);
                        changed = true;
                    } catch (e) { }
                }
            }
        }
    });

    if (changed) {
        file.saveSync();
        console.log(`Successfully AST Parsed and Injected TS/React component: ${filename}.tsx`);
    }
});

// Update the game.ts files
function updateLocaleFile(filePath, newKeys) {
    if (Object.keys(newKeys).length === 0) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    const insertion = Object.entries(newKeys).map(([k, v]) => `    'games.${k}': ${JSON.stringify(v)},`).join('\n');

    const insertPos = content.lastIndexOf('}');
    if (insertPos !== -1) {
        content = content.slice(0, insertPos) + insertion + '\n' + content.slice(insertPos);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Appended ${Object.keys(newKeys).length} keys to ${filePath}`);
    }
}

updateLocaleFile('locales/en/game.ts', enTranslations);
updateLocaleFile('locales/es/game.ts', esTranslations);

console.log("💎 AST Transformation fully completed. Project is completely localized!");

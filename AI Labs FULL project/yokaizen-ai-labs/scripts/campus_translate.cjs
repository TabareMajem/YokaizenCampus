const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const project = new Project();
const filePath = path.resolve(__dirname, '../../../yokaizen-campus_-post-code-orchestrator/translations.ts');
project.addSourceFileAtPath(filePath);
const file = project.getSourceFile('translations.ts');

const missingLangs = ['CA', 'EU', 'DE', 'FR', 'NL', 'PL', 'ID', 'TH'];

let termsDecl;
file.getVariableDeclarations().forEach(decl => {
    if (decl.getName() === 'TERMS') {
        termsDecl = decl;
    }
});

const termsObj = termsDecl.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);

const esProp = termsObj.getProperty(`[Language.ES]`);
const esText = esProp.getText();

const match = esText.match(/createLang\(([\s\S]+)\)/);
const innerObjText = match[1];

missingLangs.forEach(lang => {
    const existingProp = termsObj.getProperty(`[Language.${lang}]`);
    if (existingProp) {
        existingProp.remove();
    }
    
    // Find strings and replace with [LANG] String
    let localizedObjText = innerObjText.replace(/(['"]?[a-zA-Z0-9_]+['"]?\s*:\s*)(["'])(.+?)\2/g, (m, p1, q, p3) => {
        // Check if it's already translated or just an exported const name
        if (p3 === 'Language.EN' || p3 === 'Language.ES') return m;
        return `${p1}${q}[${lang}] ${p3}${q}`;
    });
    
    termsObj.addPropertyAssignment({
        name: `[Language.${lang}]`,
        initializer: `createLang(${localizedObjText})`
    });
    console.log(`Overwrote Language.${lang} in Campus translations.ts`);
});

file.saveSync();
console.log("Successfully updated Campus translations.ts");

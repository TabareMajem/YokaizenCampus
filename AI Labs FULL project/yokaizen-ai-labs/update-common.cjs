const fs = require('fs');
const path = require('path');

const localesDir = path.join('/root/YokaizenCampus/AI Labs FULL project/yokaizen-ai-labs/locales');
const languages = fs.readdirSync(localesDir).filter(f => fs.statSync(path.join(localesDir, f)).isDirectory());

const translations = {
    en: "    'settings.title': 'SETTINGS', 'settings.language': 'Language', 'settings.audio': 'Audio', 'settings.haptics': 'Haptics', 'settings.test': 'TEST', 'settings.toggle': 'TOGGLE', 'settings.admin_console': 'ADMIN CONSOLE', 'settings.close': 'CLOSE', 'nav.growth': 'Growth',",
    es: "    'settings.title': 'CONFIGURACIÓN', 'settings.language': 'Idioma', 'settings.audio': 'Audio', 'settings.haptics': 'Vibración', 'settings.test': 'PROBAR', 'settings.toggle': 'ALTERNAR', 'settings.admin_console': 'CONSOLA ADMIN', 'settings.close': 'CERRAR', 'nav.growth': 'Crecimiento',",
    ja: "    'settings.title': 'システム設定', 'settings.language': '言語', 'settings.audio': '音声', 'settings.haptics': '触覚', 'settings.test': 'テスト', 'settings.toggle': '切替', 'settings.admin_console': '管理コンソール', 'settings.close': '閉じる', 'nav.growth': '成長',",
    ko: "    'settings.title': '설정', 'settings.language': '언어', 'settings.audio': '오디오', 'settings.haptics': '햅틱', 'settings.test': '테스트', 'settings.toggle': '전환', 'settings.admin_console': '관리자 콘솔', 'settings.close': '닫기', 'nav.growth': '성장',",
    th: "    'settings.title': 'การตั้งค่า', 'settings.language': 'ภาษา', 'settings.audio': 'เสียง', 'settings.haptics': 'การสั่น', 'settings.test': 'ทดสอบ', 'settings.toggle': 'สลับ', 'settings.admin_console': 'คอนโซล', 'settings.close': 'ปิด', 'nav.growth': 'การเติบโต',",
    fr: "    'settings.title': 'PARAMÈTRES', 'settings.language': 'Langue', 'settings.audio': 'Audio', 'settings.haptics': 'Haptique', 'settings.test': 'TESTER', 'settings.toggle': 'BASCULER', 'settings.admin_console': 'CONSOLE ADMIN', 'settings.close': 'FERMER', 'nav.growth': 'Croissance',",
    de: "    'settings.title': 'EINSTELLUNGEN', 'settings.language': 'Sprache', 'settings.audio': 'Audio', 'settings.haptics': 'Haptik', 'settings.test': 'TESTEN', 'settings.toggle': 'UMSCHALTEN', 'settings.admin_console': 'ADMIN-KONSOLE', 'settings.close': 'SCHLIEßEN', 'nav.growth': 'Wachstum',",
    pt: "    'settings.title': 'CONFIGURAÇÕES', 'settings.language': 'Idioma', 'settings.audio': 'Áudio', 'settings.haptics': 'Vibração', 'settings.test': 'TESTAR', 'settings.toggle': 'ALTERNAR', 'settings.admin_console': 'CONSOLE ADMIN', 'settings.close': 'FECHAR', 'nav.growth': 'Crescimento',",
    pl: "    'settings.title': 'USTAWIENIA', 'settings.language': 'Język', 'settings.audio': 'Dźwięk', 'settings.haptics': 'Wibracje', 'settings.test': 'TEST', 'settings.toggle': 'PRZEŁĄCZ', 'settings.admin_console': 'KONSOLA ADMIN', 'settings.close': 'ZAMKNIJ', 'nav.growth': 'Wzrost',",
    nl: "    'settings.title': 'INSTELLINGEN', 'settings.language': 'Taal', 'settings.audio': 'Audio', 'settings.haptics': 'Haptiek', 'settings.test': 'TEST', 'settings.toggle': 'SCHAKELEN', 'settings.admin_console': 'ADMIN-CONSOLE', 'settings.close': 'SLUITEN', 'nav.growth': 'Groei',",
    ca: "    'settings.title': 'CONFIGURACIÓ', 'settings.language': 'Idioma', 'settings.audio': 'Àudio', 'settings.haptics': 'Vibració', 'settings.test': 'PROVAR', 'settings.toggle': 'ALTERNAR', 'settings.admin_console': 'CONSOLA ADMIN', 'settings.close': 'TANCAR', 'nav.growth': 'Creixement',",
    eu: "    'settings.title': 'EZARPENAK', 'settings.language': 'Hizkuntza', 'settings.audio': 'Audioa', 'settings.haptics': 'Bibratzea', 'settings.test': 'PROBATU', 'settings.toggle': 'ALDATU', 'settings.admin_console': 'ADMIN KONTSOLA', 'settings.close': 'ITXI', 'nav.growth': 'Hazkuntza',",
    id: "    'settings.title': 'PENGATURAN', 'settings.language': 'Bahasa', 'settings.audio': 'Audio', 'settings.haptics': 'Haptic', 'settings.test': 'UJI', 'settings.toggle': 'ALIH', 'settings.admin_console': 'KONSOL ADMIN', 'settings.close': 'TUTUP', 'nav.growth': 'Pertumbuhan',"
};

for (const lang of languages) {
    const commonPath = path.join(localesDir, lang, 'common.ts');
    if (fs.existsSync(commonPath) && translations[lang]) {
        let content = fs.readFileSync(commonPath, 'utf8');

        // We inject it right before the final };
        const index = content.lastIndexOf("};");

        if (index !== -1 && !content.includes('settings.language')) {
            const before = content.substring(0, index);
            const newContent = before + translations[lang] + "\n};\n";
            fs.writeFileSync(commonPath, newContent);
            console.log("Injected common keys for " + lang);
        } else {
            console.log("Already has keys or failed: " + lang);
        }
    } else {
        console.log("Skipping " + lang);
    }
}

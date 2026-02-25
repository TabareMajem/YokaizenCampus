const { chromium } = require('playwright');
const { exec } = require('child_process');

(async () => {
    const server = exec('npx vite preview --port 4175', { cwd: '/root/YokaizenCampus/AI Labs FULL project/yokaizen-ai-labs' });
    await new Promise(r => setTimeout(r, 2000));
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    try {
        await page.goto('http://localhost:4175/');
        await page.waitForTimeout(3000);
    } catch(e) {
        console.error(e);
    }
    
    await browser.close();
    server.kill();
})();

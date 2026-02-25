const { chromium } = require('playwright');
const { exec } = require('child_process');

(async () => {
    const server = exec('npx vite preview --port 4176', { cwd: '/root/YokaizenCampus/AI Labs FULL project/yokaizen-ai-labs' });
    await new Promise(r => setTimeout(r, 2000));
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto('http://localhost:4176/');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'screenshot_labs.png' });
        console.log("Screenshot taken.");
    } catch(e) {
        console.error(e);
    }
    
    await browser.close();
    server.kill();
})();

import { chromium } from 'playwright';
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    console.log('Navigating...');
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 15000 }).catch(e => console.log(e));
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
})();

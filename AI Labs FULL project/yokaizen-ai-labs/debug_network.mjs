import { chromium } from 'playwright';
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('request', req => console.log('REQ:', req.url()));
    page.on('response', res => console.log('RES:', res.url(), res.status()));
    
    console.log('Navigating...');
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 15000 }).catch(e => console.log(e));
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
})();

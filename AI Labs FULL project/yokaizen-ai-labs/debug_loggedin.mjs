import { chromium } from 'playwright';
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('pageerror', err => console.error('[PAGE ERROR]', err.message, err.stack));
    page.on('console', msg => {
        if (msg.type() === 'error') console.error('[CONSOLE ERROR]', msg.text());
    });
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 15000 }).catch(e => console.log(e));
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Attempting to click GUEST login...');
    try {
        await page.click('text=GUEST', { timeout: 3000 });
        console.log('Clicked GUEST. Waiting 5s...');
        await new Promise(r => setTimeout(r, 5000));
    } catch(e) {
        console.log('Could not find/click GUEST button', e.message);
    }
    console.log('Done.');
    await browser.close();
})();

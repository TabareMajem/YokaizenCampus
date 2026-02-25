import { chromium } from 'playwright';
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    console.log('Navigating to http://localhost:3000...');
    try {
        await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 15000 }).catch(e => console.log(e));
        console.log('Waiting 15 seconds to pass auth screen animations...');
        await new Promise(r => setTimeout(r, 15000));
        await page.screenshot({ path: 'local_screenshot_auth.png' });
        console.log('Screenshot saved to local_screenshot_auth.png');
    } catch(e) {
        console.error('Error:', e.message);
    } finally {
        await browser.close();
    }
})();

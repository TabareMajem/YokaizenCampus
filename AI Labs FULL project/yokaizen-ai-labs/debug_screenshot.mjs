import { chromium } from 'playwright';
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 }).catch(e => console.log(e));
    await page.screenshot({ path: 'local_screenshot.png' });
    console.log('Screenshot saved.');
    await browser.close();
})();

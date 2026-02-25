const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

    await page.goto('https://ai.yokaizencampus.com', { waitUntil: 'domcontentloaded' });

    // Wait a bit more for React to mount and fetch data
    await new Promise(r => setTimeout(r, 5000));

    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log("BODY HTML PREVIEW:", bodyHTML.substring(0, 1500));

    await browser.close();
})();

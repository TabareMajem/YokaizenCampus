import { chromium } from 'playwright';
(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Capture ALL console events
    page.on('console', msg => {
        if (msg.type() === 'error') console.error('[CONSOLE ERROR]', msg.text());
        if (msg.text().includes('Uncaught error') || msg.text().includes('SYSTEM FAILURE') || msg.text().includes('ERROR_LOG')) {
            console.error('[CRITICAL APP ERROR]', msg.text());
        }
    });

    page.on('pageerror', err => console.error('[PAGE ERROR]', err.message, err.stack));

    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 15000 }).catch(e => console.log(e));
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Attempting to click GUEST login...');
    try {
        await page.click('text=GUEST', { timeout: 3000 });
        console.log('Clicked GUEST. Waiting 5s for dashboard to load...');
        await new Promise(r => setTimeout(r, 5000));
        
        // Try to dump the ErrorBoundary text if it exists
        const errorText = await page.evaluate(() => {
            const el = document.querySelector('.text-red-300');
            return el ? el.innerText : 'No ErrorBoundary text found on screen.';
        });
        console.log('ERROR BOUNDARY TEXT:', errorText);

    } catch(e) {
        console.log('Could not click GUEST button', e.message);
    }
    await browser.close();
})();

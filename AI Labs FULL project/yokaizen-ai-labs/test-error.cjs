const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message, error.stack);
  });
  
  try {
    await page.goto('http://localhost:' + 3000, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 6000));
  } catch(e) {
    console.log("Nav failed:", e.message);
  }
  
  await browser.close();
  process.exit(0);
})();

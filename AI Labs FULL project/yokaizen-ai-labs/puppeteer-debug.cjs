const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  // Catch all possible logs
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER_CONSOLE_ERROR:', msg.text());
    } else {
      console.log('BROWSER_LOG:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('BROWSER_PAGE_ERROR:', error.message);
  });

  page.on('requestfailed', request => {
    console.log('BROWSER_REQUEST_FAILED:', request.url(), request.failure()?.errorText);
  });

  await page.exposeFunction('logUnhandledRejection', (message) => {
    console.log('BROWSER_UNHANDLED_REJECTION:', message);
  });

  await page.evaluateOnNewDocument(() => {
    window.addEventListener('unhandledrejection', event => {
      window.logUnhandledRejection(event.reason ? event.reason.toString() : 'Unknown Rejection');
    });
    window.addEventListener('error', event => {
      window.logUnhandledRejection(event.error ? event.error.toString() : event.message);
    });
  });

  console.log("Navigating to https://ai.yokaizencampus.com...");
  await page.goto('https://ai.yokaizencampus.com', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await new Promise(r => setTimeout(r, 6000));

  const rootHtml = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML : 'NO ROOT ELEMENT';
  });

  console.log("ROOT ELEMENT HTML LENGTH:", rootHtml.length);
  if (rootHtml.length < 500) {
    console.log("ROOT ELEMENT HTML:", rootHtml);
  } else {
    console.log("ROOT ELEMENT HTML STARTS WITH:", rootHtml.substring(0, 500));
  }

  await browser.close();
})();

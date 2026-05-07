import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3002', { waitUntil: 'networkidle2', timeout: 30000 });
  
  // Wait a bit, click "World Map", wait again
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Clicking World Map button...");
  const tabs = await page.$$('button');
  for (const tab of tabs) {
    const text = await page.evaluate(el => el.textContent, tab);
    if (text && text.includes('World Map')) {
      await tab.click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 3000));
  
  await page.screenshot({ path: 'screenshot.png' });
  console.log('Screenshot saved to screenshot.png');
  
  await browser.close();
})();

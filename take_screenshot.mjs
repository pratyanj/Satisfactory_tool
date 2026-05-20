import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.setViewport({ width: 1280, height: 1000 });
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle2', timeout: 30000 });
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Finding and clicking Alt Recipes button...");
  const buttons = await page.$$('button');
  let clicked = false;
  for (const button of buttons) {
    const text = await page.evaluate(el => el.textContent, button);
    if (text && (text.includes('None') || text.includes('Active')) && !text.includes('Controls') && !text.includes('Hide') && !text.includes('Calculate')) {
      console.log(`Clicking button with text: "${text.trim()}"`);
      await button.click();
      clicked = true;
      break;
    }
  }
  
  if (!clicked) {
    console.log("Failed to find Alt Recipes button by text. Clicking second element...");
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: 'screenshot.png' });
  console.log('Screenshot saved to screenshot.png');
  
  await browser.close();
})();

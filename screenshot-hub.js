import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1400, height: 900 }
  });

  await page.goto('http://localhost:5173/hub/index.html', {
    waitUntil: 'networkidle'
  });

  // Additional wait to ensure everything is rendered
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '/tmp/hub-screenshot2.png' });

  await browser.close();
  console.log('Screenshot saved to /tmp/hub-screenshot2.png');
})();

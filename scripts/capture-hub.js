import playwright from 'playwright';

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/hub/index.html');

  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');

  // Additional wait for any animations or dynamic content
  await page.waitForTimeout(1000);

  await page.screenshot({ path: '/tmp/hub-screenshot3.png' });

  await browser.close();
  console.log('Screenshot saved to /tmp/hub-screenshot3.png');
})();

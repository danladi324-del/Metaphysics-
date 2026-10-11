// Offline check: after one online load, the app, city list, ephemeris and wasm work with the network off.
const { chromium, devices } = require(process.env.PW);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Chicago' }); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/Metaphysics-/');
  await page.waitForSelector('text=New profile');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); await page.waitForSelector('text=New profile');
  console.log('controlled:', await page.evaluate(() => !!navigator.serviceWorker.controller));
  await ctx.setOffline(true);
  await page.reload(); await page.waitForSelector('text=New profile', { timeout: 10000 });
  await page.fill('input >> nth=0', 'S1'); await page.fill('input[type=date]', '1983-12-15'); await page.fill('input[type=time]', '02:20');
  await page.fill('label:has-text("City") input', 'Denver'); await page.click('button:has-text("Denver")');
  await page.click('button:has-text("Save profile")'); await page.waitForSelector('text=Placements', { timeout: 15000 });
  console.log('OFFLINE chart:', (await page.locator('.table').first().innerText()).split('\n').slice(3, 9).join(' '));
  console.log('errors', errors);
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });

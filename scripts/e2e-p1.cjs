// P1 acceptance in a real browser: create profile, chart, export, wipe, reload, restore, chart again.
// Run: npx vite build && npx vite preview --port 4173 & then PW=<path to playwright> OUT=<dir> node scripts/e2e-p1.cjs
const { chromium, devices } = require(process.env.PW || 'playwright');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Chicago' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4173/Metaphysics-/');
  await page.waitForSelector('text=New profile');
  await page.fill('input >> nth=0', 'Eric');
  await page.fill('input[type=date]', '1974-03-24');
  await page.fill('input[type=time]', '11:15');
  await page.fill('label:has-text("City") input', 'Bossier');
  await page.click('button:has-text("Bossier City")');
  await page.fill('input[aria-label="Name 1"]', 'Eric Garner');
  await page.waitForSelector('text=Resolved to');
  console.log(await page.textContent('[aria-live=polite]'));
  await page.screenshot({ path: (process.env.OUT || '.') + '/01-profile.png', fullPage: true });
  await page.click('button:has-text("Save profile")');
  await page.waitForSelector('text=Placements', { timeout: 15000 });
  await page.screenshot({ path: (process.env.OUT || '.') + '/02-chart.png', fullPage: true });
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  console.log('scrollWidth vs innerWidth', w);
  await page.click('a:has-text("Lab")');
  await page.waitForSelector('text=Ledger');
  await page.screenshot({ path: (process.env.OUT || '.') + '/03-lab.png', fullPage: true });
  // export via download fallback
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Export all records")')]);
  const p = await dl.path();
  const fs = require('fs');
  const json = fs.readFileSync(p, 'utf8');
  console.log('export counts', JSON.parse(json).counts);
  // wipe
  page.once('dialog', (d) => d.accept());
  await page.click('button:has-text("Delete all data")');
  await page.waitForSelector('text=All data on this device was deleted');
  // reload to ensure persisted wipe
  await page.goto('http://localhost:4173/Metaphysics-/#/today');
  await page.reload();
  await page.waitForSelector('text=New profile');
  console.log('after wipe+reload: onboarding shown');
  await page.goto('http://localhost:4173/Metaphysics-/#/lab');
  await page.waitForSelector('text=Ledger');
  page.once('dialog', (d) => d.accept());
  await page.setInputFiles('input[type=file]', p);
  await page.waitForSelector('text=Restored');
  await page.reload();
  await page.goto('http://localhost:4173/Metaphysics-/#/charts');
  await page.waitForSelector('text=Placements', { timeout: 15000 });
  console.log('restored chart sub:', await page.textContent('.sub'));
  console.log('errors:', errors);
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });

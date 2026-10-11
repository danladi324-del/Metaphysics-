// P6 in a real browser: Today blocked by default, then a computed convergence with its chance rate after a themed test pack is approved. Same setup as e2e-p1.cjs.
const { chromium, devices } = require(process.env.PW);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Chicago' }); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4173/Metaphysics-/');
  await page.waitForSelector('text=New profile');
  await page.fill('input >> nth=0', 'R1'); await page.fill('input[type=date]', '1974-03-24'); await page.fill('input[type=time]', '11:15');
  await page.fill('label:has-text("City") input', 'Shreveport'); await page.click('button:has-text("Shreveport")');
  await page.fill('input[aria-label="Name 1"]', 'Eli Kane');
  await page.click('button:has-text("Save profile")'); await page.waitForSelector('text=Placements');
  await page.click('nav a:has-text("Today")'); await page.waitForSelector('text=Where engines agree', { timeout: 15000 });
  console.log('DEFAULT:', (await page.locator('section:has(h2:has-text("Where engines agree"))').innerText()).replace(/\n+/g, ' | '));
  console.log('COMPASS:', (await page.locator('section:has(h2:has-text("Daily Compass"))').innerText()).replace(/\n+/g, ' | '));
  await page.screenshot({ path: (process.env.OUT || '.') + '/p6-today-default.png', fullPage: true });
  await page.click('nav a:has-text("Lab")'); await page.waitForSelector('text=Content');
  await page.setInputFiles('label:has-text("Import a content pack") input', 'tests/fixtures/themepack.json');
  await page.waitForSelector('text=Imported');
  for (let i = 0; i < 17; i++) { await page.locator('button:has-text("Approve as a faithful paraphrase")').first().click(); }
  await page.click('nav a:has-text("Today")'); await page.waitForSelector('text=Where engines agree');
  console.log('THEMED:', (await page.locator('section:has(h2:has-text("Where engines agree"))').innerText()).replace(/\n+/g, ' | '));
  console.log('COMPASS:', (await page.locator('section:has(h2:has-text("Daily Compass"))').innerText()).replace(/\n+/g, ' | '));
  await page.screenshot({ path: (process.env.OUT || '.') + '/p6-today-themed.png', fullPage: true });
  console.log('widths', await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
  console.log('errors', errors);
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });

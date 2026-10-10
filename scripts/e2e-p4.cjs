// P4 in a real browser: BaZi, Tzolk'in, Vedic, Feng Shui with a manual bearing. Same setup as e2e-p1.cjs.
const { chromium, devices } = require(process.env.PW);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Chicago' }); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4173/Metaphysics-/');
  await page.waitForSelector('text=New profile');
  await page.fill('input >> nth=0', 'Eric'); await page.fill('input[type=date]', '1974-03-24'); await page.fill('input[type=time]', '11:15');
  await page.fill('label:has-text("City") input', 'Bossier'); await page.click('button:has-text("Bossier City")');
  await page.click('button:has-text("Save profile")'); await page.waitForSelector('text=Placements');
  await page.click('nav a:has-text("Readings")');
  await page.click('button:has-text("BaZi")'); await page.waitForSelector('text=Day master', { timeout: 15000 });
  console.log('BAZI:', (await page.locator('main .card').allInnerTexts()).map((t) => t.replace(/\n/g, ' ')).join(' | '));
  console.log('SPLITS:', await page.locator('section:has(h2:has-text("Where conventions split"))').innerText().catch(() => 'none'));
  await page.screenshot({ path: (process.env.OUT || '.') + '/p4-bazi.png', fullPage: true });
  await page.click('button:has-text("Tzolk")'); await page.waitForSelector('text=Long Count');
  console.log('TZOLKIN:', await page.locator('main .card').first().innerText());
  await page.click('button:has-text("Vedic")'); await page.waitForSelector('text=Vimshottari');
  console.log('VEDIC:', (await page.locator('.note').first().innerText()), '|', await page.locator('text=traversed at birth').innerText());
  await page.screenshot({ path: (process.env.OUT || '.') + '/p4-vedic.png', fullPage: true });
  await page.click('a:has-text("Feng Shui compass")'); await page.waitForSelector('text=Facing direction');
  await page.fill('label:has-text("Degrees") input', '180'); await page.fill('label:has-text("Year the building") input', '2010');
  await page.waitForSelector('text=Eight Mansions');
  await page.screenshot({ path: (process.env.OUT || '.') + '/p4-fs.png', fullPage: true });
  console.log('FS:', (await page.locator('.table').first().innerText()).replace(/\n/g, ' '));
  console.log('widths', await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
  console.log('errors', errors);
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });

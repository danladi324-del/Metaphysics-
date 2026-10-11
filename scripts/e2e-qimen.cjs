// Qi Men + decisions in a real browser: whole sign default, sex in profile, luck pillars, Qi Men now and birth. Same setup as e2e-p1.cjs.
const { chromium, devices } = require(process.env.PW);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Chicago' }); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4173/Metaphysics-/');
  await page.waitForSelector('text=New profile');
  await page.fill('input >> nth=0', 'R1'); await page.fill('input[type=date]', '1974-03-24'); await page.fill('input[type=time]', '11:15');
  await page.fill('label:has-text("City") input', 'Shreveport'); await page.click('button:has-text("Shreveport")');
  await page.selectOption('label:has-text("Sex") select', 'male');
  await page.fill('input[aria-label="Name 1"]', 'Ada Lovelace');
  await page.click('button:has-text("Save profile")'); await page.waitForSelector('text=Placements');
  console.log('HOUSES DEFAULT:', await page.locator('label:has-text("Houses") select').inputValue());
  await page.click('nav a:has-text("Readings")'); await page.click('button:has-text("Qi Men")');
  await page.waitForSelector('text=South at the top', { timeout: 15000 });
  console.log('NOW:', await page.locator('section:has(.seg) + section .note').first().innerText());
  await page.click('button[role=tab]:has-text("Birth")'); await page.waitForTimeout(400);
  console.log('BIRTH:', await page.locator('p.note:has-text("dun Ju")').first().innerText());
  console.log('SPLIT:', await page.locator('text=Qi Men Ju').count());
  await page.screenshot({ path: (process.env.OUT || '.') + '/qm.png', fullPage: true });
  await page.click('button:has-text("BaZi")'); await page.waitForSelector('text=Luck pillars');
  console.log('LUCK:', (await page.locator('section:has(h2:has-text("Luck pillars")) p.note').first().innerText()));
  console.log('widths', await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
  console.log('errors', errors);
  await b.close();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });

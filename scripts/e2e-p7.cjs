// P7 in a real browser: Shadow pointers, a prompt answered into the journal, the pattern log, and a geomancy cast. Same setup as e2e-p1.cjs.
const { chromium, devices } = require(process.env.PW);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Chicago' }); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:4173/Metaphysics-/');
  await page.waitForSelector('text=New profile');
  await page.fill('input >> nth=0', 'R1'); await page.fill('input[type=date]', '1974-03-24'); await page.fill('input[type=time]', '11:15');
  await page.fill('label:has-text("City") input', 'Shreveport'); await page.click('button:has-text("Shreveport")');
  await page.click('button:has-text("Save profile")'); await page.waitForSelector('text=Placements');
  await page.click('nav a:has-text("Readings")'); await page.click('button:has-text("Shadow")');
  await page.waitForSelector('text=Pattern log');
  console.log('POINTERS:', (await page.locator('section.card h3').allInnerTexts()).join(' | '));
  await page.locator('button:has-text("Questions to write from")').first().click();
  await page.locator('button:has-text("Write about this")').first().click();
  await page.fill('textarea[aria-label="Your answer"]', 'Test answer.'); await page.fill('input[aria-label="Tags (optional, yours)"]', 'work');
  await page.click('button:has-text("Save to journal")');
  console.log('LOG:', (await page.locator('section:has(h2:has-text("Pattern log"))').innerText()).replace(/\n+/g, ' | '));
  await page.click('nav a:has-text("Draw")'); await page.click('button:has-text("Geomancy")'); await page.click('main button:has-text("Cast")');
  await page.waitForSelector('text=Shield chart');
  await page.screenshot({ path: (process.env.OUT || '.') + '/p7-geo.png', fullPage: true });
  console.log('JUDGE:', await page.locator('text=Geomancy: Judge').first().innerText());
  console.log('widths', await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
  console.log('errors', errors);
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });

// Built-in Heindel pack in a real browser: import, filter, source passage, approve, Charts shows Traditional with the house note.
const { chromium, devices } = require(process.env.PW);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'], timezoneId: 'America/Chicago' }); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => d.accept());
  await page.goto('http://localhost:4173/Metaphysics-/');
  await page.waitForSelector('text=New profile');
  await page.fill('input >> nth=0', 'R1'); await page.fill('input[type=date]', '1974-03-24'); await page.fill('input[type=time]', '11:15');
  await page.fill('label:has-text("City") input', 'Shreveport'); await page.click('button:has-text("Shreveport")');
  await page.click('button:has-text("Save profile")'); await page.waitForSelector('text=Placements');
  await page.click('nav a:has-text("Lab")'); await page.waitForSelector('text=Built-in packs');
  await page.click('button:has-text("Import") >> nth=0');
  await page.waitForSelector('text=Imported 216 snippets');
  await page.fill('label:has-text("Filter by key") input', 'natal.sun.');
  await page.waitForSelector('text=Showing 24 of 24', { state: 'detached' }).catch(() => {});
  const cards = page.locator('.card:has-text("natal.sun.")');
  console.log('sun cards shown', await cards.count());
  const aries = page.locator('.card:has-text("natal.sun.sign.aries")');
  await aries.locator('summary').click();
  console.log('PASSAGE:', (await aries.locator('details p').innerText()).slice(0, 120));
  await aries.locator('button:has-text("Approve")').click();
  // Approve every Sun house entry too, so whichever house R1's Sun falls in shows Traditional.
  for (let i = 0; i < 12; i++) {
    const c = page.locator('.card:has-text("natal.sun.house.")').first();
    if (!(await c.count())) break;
    await c.locator('button:has-text("Approve")').click();
  }
  await page.click('nav a:has-text("Charts")'); await page.waitForSelector('text=Placements');
  await page.screenshot({ path: (process.env.OUT || '.') + '/sources-chart.png', fullPage: true });
  const body = await page.locator('main').innerText();
  const i = body.indexOf('Traditional. Source: heindel1918');
  console.log('CHART:\n' + body.slice(Math.max(0, i - 50), i + 900));
  console.log('house note present', /Written for quadrant houses .* this chart uses Whole sign houses/.test(body));
  console.log('widths', await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]));
  console.log('errors', errors);
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });

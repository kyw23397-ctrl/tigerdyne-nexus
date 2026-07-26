const { chromium } = require('playwright');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

(async () => {
  let browser;
  try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForTimeout(250);

  const initialHero = await page.locator('.hero-title .gold').textContent();
  await page.locator('#langBtn').click();
  const englishHero = await page.locator('.hero-title .gold').textContent();
  const languagePressed = await page.locator('#langBtn').getAttribute('aria-pressed');
  if (initialHero === englishHero || languagePressed !== 'true') throw new Error('Language toggle did not update visible content and ARIA state.');

  const toggle = page.locator('.nav-drop-toggle').first();
  await toggle.focus();
  await page.keyboard.press('ArrowDown');
  if (await toggle.getAttribute('aria-expanded') !== 'true') throw new Error('ArrowDown did not open dropdown.');
  await page.keyboard.press('Escape');
  if (await toggle.getAttribute('aria-expanded') !== 'false') throw new Error('Escape did not close dropdown.');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) throw new Error('Desktop layout has horizontal overflow.');
  const mailto = await page.locator('.contact-action a[href^="mailto:"]').count();
  const forms = await page.locator('form').count();
  if (mailto !== 1 || forms !== 0) throw new Error('Contact action does not expose exactly one truthful mailto path.');
  await page.screenshot({ path: path.resolve(__dirname, '..', 'tests', 'homepage-remediation-desktop.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#hamburger').click();
  if (await page.locator('#hamburger').getAttribute('aria-expanded') !== 'true') throw new Error('Mobile menu ARIA state did not open.');
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (mobileOverflow) throw new Error('Mobile layout has horizontal overflow.');
  await page.screenshot({ path: path.resolve(__dirname, '..', 'tests', 'homepage-remediation-mobile.png'), fullPage: true });
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('Browser interaction, language, keyboard, and overflow checks passed.');
  } finally {
    if (browser) await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

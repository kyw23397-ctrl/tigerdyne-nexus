const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('contact path is a truthful mailto action, not a simulated secure submission', () => {
  assert.match(html, /href="mailto:ykw@tigerdynenexus\.com"/);
  assert.doesNotMatch(html, /ywkim@tigerdynenexus\.com/);
  assert.doesNotMatch(html, /<form\b|onsubmit=|Send Secure Enquiry|encrypted/i);
  assert.doesNotMatch(script, /function handleSubmit|Submitted|Sending\.\.\./);
});

test('hero title preserves Korean word units and carousel has accessible controls', () => {
  assert.match(css, /\.hero-title\s*\{[^}]*word-break:\s*keep-all/s);
  assert.match(html, /class="hero-carousel"[^>]*aria-roledescription="carousel"/);
  assert.equal((html.match(/class="hero-carousel-slide/g) || []).length, 3);
  assert.match(html, /data-carousel-action="previous"/);
  assert.match(html, /data-carousel-action="next"/);
  assert.match(script, /prefers-reduced-motion/);
  assert.match(script, /function initHeroCarousel/);
});

test('local visual assets are optimized, referenced, and have license provenance', () => {
  const assets = [
    'hero-maritime.webp', 'hero-cyber.webp', 'hero-space.webp',
    'insight-deterrence.webp', 'insight-industry.webp', 'insight-indo-pacific.webp',
    'kim-yongwoo.webp',
  ];
  for (const asset of assets) {
    const assetPath = path.join(root, 'assets', 'images', asset);
    assert.ok(fs.existsSync(assetPath), `${asset} is missing`);
    assert.ok(fs.statSync(assetPath).size < 100_000, `${asset} exceeds the performance budget`);
    assert.match(html, new RegExp(`assets/images/${asset}`));
  }
  const credits = fs.readFileSync(path.join(root, 'assets', 'images', 'SOURCES.md'), 'utf8');
  assert.match(credits, /Pexels License/);
  assert.equal((html.match(/class="domain-icon"/g) || []).length, 5);
});

test('founder representation uses an optimized portrait with a truthful fallback', () => {
  assert.match(html, /srcset="assets\/images\/kim-yongwoo\.webp"/);
  assert.match(html, /src="assets\/images\/kim-yongwoo\.jpg"/);
  assert.match(html, /class="leader-photo"[^>]*loading="lazy"/);
  assert.match(html, /onerror="this\.closest\('picture'\)\.remove\(\)/);
  assert.match(html, /leader-photo-fallback" id="photoFallback" hidden/);
  assert.ok(fs.statSync(path.join(root, 'assets', 'images', 'kim-yongwoo.webp')).size < 100_000);
  assert.match(html, /cl-init/);
});

test('navigation disclosures and language/menu controls expose keyboard state', () => {
  assert.match(html, /class="nav-drop-toggle"[^>]*aria-expanded="false"[^>]*aria-controls=/);
  assert.match(html, /id="hamburger"[^>]*aria-expanded="false"[^>]*aria-controls="navLinks"/);
  assert.match(html, /id="langBtn"[^>]*aria-pressed="false"/);
  assert.match(script, /event\.key === 'Escape'/);
  assert.match(script, /setAttribute\('aria-expanded'/);
  assert.match(css, /\.has-drop:focus-within \.dropdown/);
});

test('interactive controls have a visible focus contract and valid button markup', () => {
  assert.match(css, /\.nav-drop-toggle:focus-visible,/);
  assert.match(css, /\.path-btn:focus-visible,/);
  assert.match(css, /\.lang-btn:focus-visible,/);
  assert.match(css, /\.hamburger:focus-visible/);
  assert.doesNotMatch(html, /<button(?![^>]*\btype=)/);
});

test('insight CTAs and public claims do not overstate unavailable content or evidence', () => {
  assert.doesNotMatch(html, /Read More|자세히 보기|View All|전체 보기/);
  assert.doesNotMatch(html, /30<em>|12<em>|100<em>|encrypted|100% Confidentiality/i);
});

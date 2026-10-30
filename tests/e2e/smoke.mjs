// End-to-end smoke test in a real browser (Chromium via Playwright). Run: npm run build && npm run test:e2e
// Checks the page loads without errors, the game plays, sound is actually produced, and sound differs by place.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const PORT = 4173;
const URL = `http://localhost:${PORT}/#debug&pace=instant&at=2026-06-10T09:00:00Z`;
const URL_WALK = (pace) => `http://localhost:${PORT}/#debug&pace=${pace}&at=2026-06-10T09:00:00Z`;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* ignore */ } };
process.on('exit', stop);

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://localhost:${PORT}/`); if (r.ok) return; } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('preview server did not start');
}

let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++; };

try {
  await waitUp();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);

  check(await page.locator('#title').isVisible(), 'title screen is shown first');
  check((await page.locator('#log').textContent()) === '', 'nothing plays or prints before the visitor chooses to enter');
  await page.click('#enter');
  await page.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
  check(!(await page.locator('#title').isVisible()), 'title hides after entering');
  check((await page.locator('#log').textContent()).includes('Ways out'), 'the arrival description lists the ways out');

  await page.fill('#input', 'go west');
  await page.press('#input', 'Enter');
  await page.waitForFunction(() => document.getElementById('log').textContent.includes('First Western Hall'));
  check((await page.locator('#place').textContent()) === 'First Western Hall', 'the header follows you');

  await page.locator('.links button', { hasText: 'listen' }).last().click();
  await page.waitForTimeout(200);
  check((await page.locator('#log').textContent()).length > 1500, 'clicking a link runs the command');

  await page.fill('#input', 'go north 3');
  await page.press('#input', 'Enter');
  await page.fill('#input', 'go south 1');
  await page.press('#input', 'Enter');
  await page.waitForFunction(() => document.getElementById('place').textContent === 'Fourth Western Hall');
  check((await page.locator('#log').textContent()).toLowerCase().includes('dog-fox'), 'the dog-fox route works from the page');

  // --- the map ---
  const before = await page.evaluate(() => window.__house.mapView().visited);
  check(before >= 4, `the map remembers the halls you walked through (${before} explored)`);
  await page.click('#open-map');
  check(await page.locator('#map-panel').isVisible(), 'the Map button opens the map');
  await page.waitForTimeout(300);
  const ink = await page.evaluate(() => {
    const c = document.getElementById('map-canvas'); const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data; const bg = [d[0], d[1], d[2]]; let n = 0;
    for (let i = 0; i < d.length; i += 4 * 7) if (Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]) > 40) n++;
    return n;
  });
  check(ink > 300, `something is drawn on the map canvas (${ink} sampled pixels differ from the background)`);
  const label = await page.locator('#map-canvas').getAttribute('aria-label');
  check(/middle level: \d+ halls explored/.test(label), `the map has a text description for screen readers (${label})`);
  const box = await page.locator('#map-canvas').boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  check((await page.locator('#map-caption').textContent()).includes('you are here'), 'tapping the middle of the map names where you are');
  await page.screenshot({ path: 'tests/e2e/out/map.png' });
  await page.click('.seg button[data-level="2"]');
  check((await page.locator('#map-canvas').getAttribute('aria-label')).includes('upper level: 0 halls explored'), 'the upper level is unexplored, so its map is empty');
  await page.click('.seg button[data-level="1"]');
  await page.keyboard.press('Escape');
  check(!(await page.locator('#map-panel').isVisible()), 'Escape closes the map');
  // typing "map" also opens it
  await page.fill('#input', 'map'); await page.press('#input', 'Enter');
  check(await page.locator('#map-panel').isVisible(), 'typing "map" opens it too');
  await page.click('#map-close');

  // --- sounds through doorways ---
  const door = await page.evaluate(() => {
    const h = window.__house;
    for (const [x, y] of [[-87, 0], [-89, 0], [-88, 1], [-88, -1]]) {
      h.teleport(x, y, 1);
      const p = h.audio().portals.find((q) => q.toName.startsWith('Eighty-Eighth'));
      if (p) return { x, y, mode: p.birds.mode, bearing: p.bearing, pan: p.pan };
    }
    return null;
  });
  check(door !== null && door.mode === 'nesting', `beside the gull colony, a doorway carries nesting gulls (${JSON.stringify(door)})`);
  await page.waitForTimeout(6000);
  const stats = await page.evaluate(() => window.__house.engine.stats());
  check(stats.voices >= 1 && stats.portalEvents > 0, `the engine emits sound through the doorway (${JSON.stringify(stats)})`);
  await page.fill('#input', 'listen');
  await page.press('#input', 'Enter');
  await page.waitForTimeout(300);
  check(/Through the (north|east|south|west) door, (ahead of you|to your right|to your left|behind you), comes/.test(await page.locator('#log').textContent()), '"listen" describes what comes through the doors');

  // --- sound ---
  const sample = async (n = 40) => {
    let sum = 0;
    for (let i = 0; i < n; i++) { sum += await page.evaluate(() => window.__house.engine.level()); await page.waitForTimeout(60); }
    return sum / n;
  };
  await page.evaluate(() => window.__house.teleport(0, 0, 1));
  await page.waitForTimeout(3500);
  const vestibule = await sample();
  check(vestibule > 0.001, `sound is produced in the First Vestibule (rms ${vestibule.toFixed(4)})`);
  await page.evaluate(() => window.__house.teleport(6, 0, 1));
  await page.waitForTimeout(4500);
  const drowned = await sample();
  check(drowned < vestibule * 0.5, `a Drowned Hall is much quieter than a vestibule (${drowned.toFixed(4)} vs ${vestibule.toFixed(4)})`);
  await page.evaluate(() => window.__house.teleport(0, 0, 0));
  await page.waitForTimeout(4000);
  const lower = await sample();
  check(lower > vestibule, `the lower halls are louder with sea than the middle (${lower.toFixed(4)} vs ${vestibule.toFixed(4)})`);

  await page.click('#mute');
  await page.waitForTimeout(800);
  const muted = await sample(15);
  check(muted < 0.0002, `mute silences the output (${muted.toFixed(5)})`);
  await page.click('#mute');

  // --- settings ---
  await page.click('#open-settings');
  await page.uncheck('#s-dead');
  await page.click('#s-save');
  await page.waitForTimeout(300);
  check((await page.locator('#log').textContent()).includes('First Vestibule'), 'changing a world setting restarts at the First Vestibule');

  mkdirSync('tests/e2e/out', { recursive: true });
  await page.evaluate(() => window.__house.teleport(0, 0, 1));
  await page.screenshot({ path: 'tests/e2e/out/screenshot.png' });
  await page.setViewportSize({ width: 390, height: 780 });
  await page.screenshot({ path: 'tests/e2e/out/screenshot-mobile.png' });

  // --- walking takes time ---
  for (const pace of ['real', 'fast']) {
    const w = await browser.newPage({ viewport: { width: 900, height: 700 } });
    w.on('pageerror', (e) => errors.push(String(e)));
    await w.goto(URL_WALK(pace));
    await w.click('#enter');
    await w.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    if (pace === 'fast') {
      // the speed slider tops out at a two-hour marathon
      await w.click('#open-settings');
      const max = await w.evaluate(() => { const s = document.getElementById('s-speed'); s.value = s.max; s.dispatchEvent(new Event('input')); return s.max; });
      check(Math.abs(Number(max) - 21.1) < 0.05, `the speed slider tops out at 21.1 km/h, a two-hour marathon (max=${max})`);
      check((await w.locator('#s-speed-note').textContent()).includes('marathon'), 'the slider says so at the top');
      await w.click('#s-save');
    }
    await w.fill('#input', 'go west');
    await w.press('#input', 'Enter');
    await w.waitForFunction(() => /(set off for|jog for|run for) the west door/.test(document.getElementById('log').textContent));
    check((await w.locator('#place').textContent()) === 'First Vestibule', `[${pace}] you are still where you were while walking`);
    await w.waitForTimeout(1500);
    check((await w.locator('#clock').textContent()).includes('walking'), `[${pace}] the header counts the walk down`);
    if (pace === 'real') {
      check((await w.locator('#place').textContent()) === 'First Vestibule', '[real] a crossing is not instant (still walking after 1.5 s)');
      await w.fill('#input', 'stop');
      await w.press('#input', 'Enter');
      await w.waitForFunction(() => document.getElementById('log').textContent.includes('You stop where you are'));
      check(!(await w.locator('#clock').textContent()).includes('walking'), '[real] stop ends the walk');
    } else {
      await w.waitForFunction(() => document.getElementById('place').textContent === 'First Western Hall', null, { timeout: 45000 });
      check((await w.locator('#log').textContent()).match(/You (break into a jog|run) for the west door/) !== null, '[fast] at marathon pace you run, and arrive when the walk is over');
    }
    await w.close();
  }

  check(errors.length === 0, `no console or page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
} catch (e) {
  console.error('FAIL  e2e crashed:', e);
  failures++;
} finally {
  stop();
}
process.exit(failures ? 1 : 0);

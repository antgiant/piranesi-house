// End-to-end smoke test in a real browser (Chromium via Playwright). Run: npm run build && npm run test:e2e
// Checks the page loads without errors, the game plays, sound is actually produced, and sound differs by place.
import { execFileSync, spawn } from 'node:child_process';
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
  // The House has no map by default, as in the book; most tests use it, so they turn it on.
  const mapOn = () => { try { if (!localStorage.getItem('the-house.settings.v1')) localStorage.setItem('the-house.settings.v1', JSON.stringify({ map: true, narrate: 'off' })); } catch { /* ignore */ } };
  const newPage = async (opts) => { const p = await browser.newPage(opts); await p.addInitScript(mapOn); return p; };
  const page = await newPage({ viewport: { width: 900, height: 900 } });
  // the main tests use the map, which is off by default (as in the book)
  await page.addInitScript(() => { try { if (!localStorage.getItem('the-house.settings.v1')) localStorage.setItem('the-house.settings.v1', JSON.stringify({ map: true, narrate: 'off' })); } catch { /* ignore */ } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL);

  check(await page.locator('#title').isVisible(), 'title screen is shown first');
  check((await page.locator('#log').textContent()) === '', 'nothing plays or prints before the visitor chooses to enter');
  await page.click('#enter');
  await page.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
  check(!(await page.locator('#title').isVisible()), 'title hides after entering');
  check(/([Dd]oors? (open|lead)|There (is|are) |ways on|only way on|single door)/.test(await page.locator('#log').textContent()), 'the arrival description says where the doors lead, in words');

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

  // --- the deep-bass setting: defaults to Standard, is kept, and reaches the sound engine ---
  {
    await page.click('#open-settings');
    check((await page.locator('#s-bass').inputValue()) === 'standard', 'deep bass is Standard by default');
    check((await page.evaluate(() => window.__house.engine.bass)) === 'standard', 'and the engine is on Standard');
    await page.selectOption('#s-bass', 'small');
    await page.click('#s-save');
    await page.waitForTimeout(300);
    check((await page.evaluate(() => window.__house.engine.bass)) === 'small', 'choosing small speakers reaches the engine');
    check((await page.evaluate(() => JSON.parse(localStorage.getItem('the-house.settings.v1')).bass)) === 'small', 'and is saved with the other settings');
    const d = await browser.newPage({ viewport: { width: 900, height: 700 } });
    d.on('pageerror', (e) => errors.push(String(e)));
    await d.addInitScript(() => { try { localStorage.setItem('the-house.settings.v1', JSON.stringify({ map: true, narrate: 'off', bass: 'enormous' })); } catch { /* ignore */ } });
    await d.goto(URL);
    await d.click('#enter');
    await d.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    await d.click('#open-settings');
    check((await d.locator('#s-bass').inputValue()) === 'standard', 'a damaged saved value falls back to Standard');
    check((await d.evaluate(() => window.__house.engine.bass)) === 'standard', 'and the engine is on Standard');
    await d.close();
  }

  mkdirSync('tests/e2e/out', { recursive: true });
  await page.evaluate(() => window.__house.teleport(0, 0, 1));
  await page.screenshot({ path: 'tests/e2e/out/screenshot.png' });
  await page.setViewportSize({ width: 390, height: 780 });
  await page.screenshot({ path: 'tests/e2e/out/screenshot-mobile.png' });

  // --- what earlier visitors left behind ---
  {
    const r = await newPage({ viewport: { width: 900, height: 700 } });
    r.on('pageerror', (e) => errors.push(String(e)));
    await r.goto(URL);
    await r.click('#enter');
    await r.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    const text0 = await r.locator('#log').textContent();
    check(/sleeping bag/.test(text0) && !text0.includes('Left behind by someone'), 'the First Vestibule tells, in a sentence, what earlier visitors left');
    await r.fill('#input', 'examine sleeping bag');
    await r.press('#input', 'Enter');
    await r.waitForFunction(() => document.getElementById('log').textContent.includes('hollow beneath the great stair'));
    await r.fill('#input', 'found');
    await r.press('#input', 'Enter');
    check((await r.locator('#log').textContent()).includes('1. a stiff old sleeping bag'), '"found" lists what you noticed');
    await r.reload();
    await r.click('#enter');
    await r.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    await r.fill('#input', 'found');
    await r.press('#input', 'Enter');
    check((await r.locator('#log').textContent()).includes('1. a stiff old sleeping bag'), 'your private list is still there after a reload (kept on your device only)');
    await r.close();
  }

  // --- a hint of the outside, at a moment computed from the simulation ---
  {
    const iso = execFileSync('npx', ['tsx', '-e', `
      import { createWorld } from './src/world/world';
      import { outsideEventForDay } from './src/sim/outside';
      const w = createWorld('the-house');
      for (let d = 0; d < 400; d++) { const e = outsideEventForDay(w, d); if (e && e.x === 0 && e.y === 0 && e.kind === 'draught') { console.log(new Date(Date.UTC(2026, 0, 1) + Math.floor((e.startMs + e.endMs) / 2)).toISOString()); break; } }
    `], { encoding: 'utf8' }).trim();
    const o = await newPage({ viewport: { width: 900, height: 700 } });
    o.on('pageerror', (e) => errors.push(String(e)));
    await o.goto(`http://localhost:${PORT}/#debug&pace=instant&at=${iso}`);
    await o.click('#enter');
    await o.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    const t = await o.locator('#log').textContent();
    check(/cold draught creeps out of the south-east corner, in the shadow between the two minotaurs/.test(t) && /rain and metal/.test(t), `a draught from the south-east corner is described while it lasts (${iso})`);
    check(!/another world|outside the House/i.test(t.replace(/Rare hints of a world outside/g, '')), 'and is never explained');
    await o.waitForTimeout(2500);
    const scene = await o.evaluate(() => ({ kind: window.__house.audio().outside?.kind ?? null, stats: window.__house.engine.stats() }));
    check(scene.kind === 'draught' && scene.stats.outsideEvents >= 1, `the engine plays it (${JSON.stringify(scene)})`);
    await o.close();
  }

  // --- walking takes time ---
  for (const pace of ['real', 'fast']) {
    const w = await newPage({ viewport: { width: 900, height: 700 } });
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

  // Narration and wander, with the browser's speech stubbed so we can see what would be spoken.
  {
    const n = await newPage({ viewport: { width: 900, height: 900 } });
    await n.addInitScript(() => {
      window.__wake = { held: 0, requests: 0 };
      Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => {
        window.__wake.requests++; window.__wake.held++;
        const l = { released: false, _f: [], addEventListener(_t, f) { this._f.push(f); }, async release() { if (!this.released) { this.released = true; window.__wake.held--; this._f.forEach((f) => f()); } } };
        return l;
      } } });
      window.__spoken = [];
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      Object.defineProperty(window, 'speechSynthesis', { value: {
        speaking: false, getVoices: () => [], addEventListener() {}, cancel() { window.__spoken.push('<cancel>'); },
        speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 10); },
      } });
    });
    n.on('pageerror', (e) => errors.push(String(e)));
    await n.goto(URL);
    await n.click('#enter');
    await n.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    check((await n.evaluate(() => window.__spoken.filter((s) => s !== '<cancel>').length)) === 0, 'narration is off until chosen: nothing is spoken');
    await n.click('#open-settings');
    await n.selectOption('#s-narrate', 'always');
    await n.click('#s-save');
    await n.fill('#input', 'look closely');
    await n.press('#input', 'Enter');
    await n.waitForTimeout(300);
    const said = await n.evaluate(() => window.__spoken.join(' | '));
    check(said.includes('First Vestibule') && !said.includes('['), 'with narration on, the description is read aloud, in words with no list marks');
    const startPlace = await n.locator('#place').textContent();
    await n.click('#wander');
    check((await n.locator('#wander').getAttribute('data-playing')) === 'true', 'wander starts');
    await n.waitForFunction((p) => document.getElementById('place').textContent !== p, startPlace, { timeout: 15000 });
    check(true, 'wander moved to another hall by itself');
    await n.waitForFunction(() => window.__wake.held === 1, null, { timeout: 4000 });
    check(true, 'while wandering, the screen is kept awake');
    await n.fill('#input', 'x');
    check((await n.locator('#wander').getAttribute('data-playing')) === 'false', 'typing anything stops wandering');
    await n.waitForFunction(() => window.__wake.held === 0, null, { timeout: 8000 });
    check(true, 'when wandering stops and nothing is being read, the screen lock is let go');
    await n.close();
  }

  // The audiobook: Play / Pause, Back and Forward, the mute button, and the phone layout.
  {
    const au = await browser.newPage({ viewport: { width: 390, height: 800 } });
    await au.addInitScript(() => {
      try { if (!localStorage.getItem('the-house.settings.v1')) localStorage.setItem('the-house.settings.v1', JSON.stringify({ map: true, narrate: 'play' })); } catch { /* ignore */ }
      window.__spoken = [];
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      Object.defineProperty(window, 'speechSynthesis', { value: {
        speaking: false, getVoices: () => [], addEventListener() {}, cancel() { window.__spoken.push('<cancel>'); },
        speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 10); },
      } });
    });
    au.on('pageerror', (e) => errors.push(String(e)));
    await au.goto(URL);
    await au.click('#enter');
    await au.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    const spokenCount = () => au.evaluate(() => window.__spoken.filter((s) => s !== '<cancel>').length);
    check((await spokenCount()) === 0, '[audiobook] reading aloud is only while playing: nothing is spoken before Play');
    check(await au.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), '[audiobook] on a phone the page does not scroll sideways');
    check(await au.evaluate(() => { const r = document.getElementById('wander').getBoundingClientRect(); return r.width >= 40 && r.height >= 40; }), '[audiobook] the Play button is a comfortable size to tap');
    const start = await au.locator('#place').textContent();
    await au.click('#wander');
    check((await au.locator('#wander').getAttribute('data-playing')) === 'true', '[audiobook] Play starts, and the button becomes Pause');
    check(/Pause/.test((await au.locator('#wander').getAttribute('aria-label')) ?? ''), '[audiobook] and says so to a screen reader');
    await au.waitForFunction((p) => document.getElementById('place').textContent !== p && window.__spoken.length > 3, start, { timeout: 20000 });
    check(true, '[audiobook] it reads and walks on by itself');
    await au.click('#prev');
    check(await au.evaluate(() => document.querySelectorAll('#log p.reading').length === 1), '[audiobook] Back marks the passage being heard again in the log');
    const replayed = await au.evaluate(() => window.__spoken.filter((s) => s !== '<cancel>').slice(-1)[0]);
    check(typeof replayed === 'string' && replayed.length > 10, `[audiobook] and reads it again (${String(replayed).slice(0, 40)})`);
    await au.click('#next');
    await au.waitForTimeout(600);
    await au.click('#wander');
    check((await au.locator('#wander').getAttribute('data-playing')) === 'false', '[audiobook] Pause stops');
    const held = await au.locator('#place').textContent();
    await au.waitForTimeout(2500);
    check((await au.locator('#place').textContent()) === held, '[audiobook] and the House stays where it is while paused');
    // the page going to the background pauses, since nothing in the background could be controlled
    await au.click('#wander');
    check((await au.locator('#wander').getAttribute('data-playing')) === 'true', '[audiobook] playing again');
    await au.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    check((await au.locator('#wander').getAttribute('data-playing')) === 'false', '[audiobook] when the page goes to the background, it pauses');
    check(await au.evaluate(() => window.__spoken.slice(-1)[0] === '<cancel>'), '[audiobook] and the reading is stopped');
    await au.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    // the mute button silences the reading as well as the sound
    await au.click('#mute');
    check((await au.locator('#mute').getAttribute('aria-pressed')) === 'true', '[audiobook] the mute button shows it is muted');
    const before = await spokenCount();
    await au.click('#wander');
    await au.waitForFunction((p) => document.getElementById('place').textContent !== p, held, { timeout: 120000 });
    check((await spokenCount()) === before, '[audiobook] muted, nothing is read aloud, though the wander goes on');
    await au.click('#wander');
    await au.click('#mute');
    // settings are grouped and fill a phone's screen
    await au.click('#open-settings');
    check(await au.evaluate(() => { const r = document.getElementById('settings').getBoundingClientRect(); return r.width >= window.innerWidth - 2 && r.height >= window.innerHeight - 2; }), '[audiobook] settings fill a phone screen');
    check((await au.locator('#settings section.group').count()) >= 5, '[audiobook] and are in labelled groups');
    check(await au.locator('#share').isVisible(), '[audiobook] Share lives in Settings');
    check(!(await au.locator('#bar #share').count()), '[audiobook] and not in the bar');
    await au.click('#s-cancel');
    await au.close();
  }

  // The address bar names the room, and a copied address leads back to it.
  {
    const ad = await newPage({ viewport: { width: 900, height: 900 } });
    ad.on('pageerror', (e) => errors.push(String(e)));
    await ad.goto(URL);
    await ad.click('#enter');
    await ad.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    check((await ad.evaluate(() => location.hash)).includes('room=First+Vestibule'), 'the address names the room you start in');
    await ad.fill('#input', 'travel to the third western hall');
    await ad.press('#input', 'Enter');
    await ad.waitForFunction(() => document.getElementById('place').textContent === 'Third Western Hall', null, { timeout: 15000 });
    const hash = await ad.evaluate(() => location.hash);
    check(hash.includes('room=Third+Western+Hall') && hash.includes('pace=instant'), `the address follows you and keeps other settings (${hash})`);
    check((await ad.evaluate(() => history.length)) <= 3, 'moving does not fill the back button with history');
    await ad.fill('#input', 'up');
    await ad.press('#input', 'Enter');
    await ad.waitForTimeout(300);
    // a link opened in a fresh tab goes to the same room
    const friend = await newPage({ viewport: { width: 900, height: 900 } });
    friend.on('pageerror', (e) => errors.push(String(e)));
    await friend.goto(`http://localhost:${PORT}/${await ad.evaluate(() => location.hash)}`);
    await friend.click('#enter');
    await friend.waitForFunction(() => document.getElementById('log').textContent.includes('suddenly find yourself'));
    check((await friend.locator('#place').textContent()) === (await ad.locator('#place').textContent()), `a shared link leads to the same room (${await friend.locator('#place').textContent()})`);
    check((await friend.locator('#log').textContent()).includes('You suddenly find yourself standing in the Third Western Hall'), 'and says so, as a sudden crossing');
    // editing the address in the same tab moves you
    await friend.evaluate(() => { location.hash = '#debug&pace=instant&room=Second+Western+Hall'; });
    await friend.waitForFunction(() => document.getElementById('place').textContent === 'Second Western Hall', null, { timeout: 5000 });
    check(true, 'changing the address while playing takes you to that room');
    // a link to a room that does not exist is ignored
    const lost = await newPage({ viewport: { width: 900, height: 900 } });
    await lost.goto(`http://localhost:${PORT}/#room=nowhere+at+all`);
    await lost.click('#enter');
    await lost.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    check(true, 'a link to a place that does not exist starts at the First Vestibule');
    await friend.close(); await lost.close(); await ad.close();
  }

  // Reading comfort and sharing.
  {
    const rc = await newPage({ viewport: { width: 390, height: 780 } });
    await rc.addInitScript(() => { window.__shared = null; navigator.share = async (d) => { window.__shared = d; }; });
    rc.on('pageerror', (e) => errors.push(String(e)));
    await rc.goto(URL);
    await rc.click('#enter');
    await rc.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    const before = await rc.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    await rc.click('#open-settings');
    await rc.selectOption('#s-size', '1.45');
    await rc.check('#s-plain');
    await rc.check('#s-contrast');
    await rc.click('#s-save');
    const after = await rc.evaluate(() => ({ fs: parseFloat(getComputedStyle(document.body).fontSize), plain: document.documentElement.hasAttribute('data-plain'), contrast: document.documentElement.hasAttribute('data-contrast') }));
    check(after.fs > before * 1.3 && after.plain && after.contrast, `text size, plain lettering and contrast apply at once (${before}px to ${after.fs}px)`);
    await rc.reload();
    check(await rc.evaluate(() => document.documentElement.hasAttribute('data-plain')), 'and are kept after a reload, even before entering');
    await rc.click('#enter');
    await rc.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    await rc.click('#open-settings');
    await rc.click('#share');
    await rc.waitForFunction(() => window.__shared !== null);
    const shared = await rc.evaluate(() => window.__shared);
    check(shared.url.includes('room=First+Vestibule'), `Share (in Settings) offers the link to the room (${shared.url.slice(-40)})`);
    await rc.click('#s-cancel');
    await rc.close();
  }

  // Polish: first-run introduction, shortcuts, screen-reader announcements, transcript, about, and offline.
  {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, acceptDownloads: true });
    await ctx.addInitScript(mapOn);
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errors.push(String(e)));
    await pg.goto(URL);
    await pg.click('#enter');
    await pg.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    check(await pg.locator('#intro').isVisible(), 'the first time in, a short introduction is shown');
    await pg.click('#intro-ok');
    check(!(await pg.locator('#intro').isVisible()), 'and can be dismissed');
    await pg.reload();
    await pg.click('#enter');
    await pg.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    check(!(await pg.locator('#intro').isVisible()), 'and does not come back');
    // shortcuts
    await pg.locator('body').click({ position: { x: 5, y: 5 } });
    await pg.keyboard.press('m');
    check(await pg.locator('#map-panel').isVisible(), 'the key m opens the map');
    await pg.keyboard.press('Escape');
    await pg.keyboard.press('/');
    check(await pg.evaluate(() => document.activeElement.id === 'input'), 'the key / goes to the command line');
    await pg.keyboard.type('m');
    check(!(await pg.locator('#map-panel').isVisible()), 'and letters typed there are not shortcuts');
    await pg.fill('#input', '');
    await pg.locator('body').click({ position: { x: 5, y: 5 } });
    await pg.keyboard.press('w');
    check((await pg.locator('#wander').getAttribute('data-playing')) === 'true', 'the key w starts wandering');
    await pg.keyboard.press('w');
    // screen reader
    check((await pg.locator('#log').getAttribute('aria-live')) === 'polite', 'new text is announced to a screen reader by default');
    await pg.click('#open-settings');
    await pg.uncheck('#s-shortcuts');
    await pg.click('#s-save');
    await pg.locator('body').click({ position: { x: 5, y: 5 } });
    await pg.keyboard.press('m');
    check(!(await pg.locator('#map-panel').isVisible()), 'shortcuts can be turned off');
    // transcript
    await pg.click('#open-settings');
    const dl = pg.waitForEvent('download');
    await pg.click('#s-transcript');
    const file = await dl;
    check(/^piranesis-house-\d{4}-\d\d-\d\d\.txt$/.test(file.suggestedFilename()), `the transcript can be saved (${file.suggestedFilename()})`);
    // about
    await pg.click('#s-about');
    check(await pg.locator('#about').isVisible() && (await pg.locator('#about').textContent()).includes('sends nothing'), 'the about page states what is and is not kept or sent');
    await pg.click('#about-close');
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
    await ctx.addInitScript(mapOn);
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errors.push(String(e)));
    await pg.addInitScript(() => {
      window.__spoken = [];
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      Object.defineProperty(window, 'speechSynthesis', { value: { speaking: false, getVoices: () => [], addEventListener() {}, cancel() {}, speak(u) { setTimeout(() => u.onend && u.onend(), 10); } } });
    });
    await pg.goto(URL);
    await pg.click('#enter');
    await pg.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    await pg.click('#open-settings');
    await pg.selectOption('#s-narrate', 'always');
    await pg.click('#s-save');
    check((await pg.locator('#log').getAttribute('aria-live')) === 'off', 'while the House is read aloud, the screen reader is not also told (they would talk over each other)');
    await ctx.close();
  }
  {
    // offline: once opened, it opens again with no connection
    const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
    await ctx.addInitScript(mapOn);
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errors.push(String(e)));
    await pg.goto(`http://localhost:${PORT}/#sw`);
    await pg.waitForFunction(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active); }, null, { timeout: 15000 });
    await pg.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    await pg.reload();
    // wait until the files have really been stored
    await pg.waitForFunction(async () => { const c = await caches.open('house-v2'); const keys = (await c.keys()).map((r) => r.url); return keys.some((u) => u.endsWith('/')) && keys.some((u) => u.endsWith('.js')) && keys.some((u) => u.endsWith('.css')) && keys.some((u) => u.endsWith('icon-192.png')) && keys.some((u) => u.endsWith('manifest.webmanifest')); }, null, { timeout: 15000 });
    await ctx.setOffline(true);
    await pg.reload();
    check(await pg.locator('#title').isVisible(), 'with no connection at all, a visited House still opens');
    await pg.click('#enter');
    await pg.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    check(true, 'and can be entered and played offline');
    await ctx.close();
  }

  // No map, as in the book: the button goes and typing "map" says so.
  {
    const nm = await browser.newPage({ viewport: { width: 900, height: 900 } });
    nm.on('pageerror', (e) => errors.push(String(e)));
    await nm.goto(URL);
    await nm.click('#enter');
    await nm.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    check(!(await nm.locator('#open-map').isVisible()), 'there is no map by default, as in the book');
    await nm.click('#open-settings');
    await nm.check('#s-map');
    await nm.click('#s-save');
    check(await nm.locator('#open-map').isVisible(), 'the map can be turned on in Settings');
    await nm.click('#open-settings');
    await nm.uncheck('#s-map');
    await nm.click('#s-save');
    check(!(await nm.locator('#open-map').isVisible()), 'and off again');
    await nm.fill('#input', 'map');
    await nm.press('#input', 'Enter');
    check((await nm.locator('#log').textContent()).includes('There is no map'), 'and the House says there is no map');
    await nm.fill('#input', 'travel to the fifth western hall');
    await nm.press('#input', 'Enter');
    await nm.waitForFunction(() => document.getElementById('log').textContent.includes('going by the names alone'));
    check(true, 'and a hall you have never been to can be tried for by its name alone, with no promise of arriving');
    await nm.close();
  }

  // The journal, a journey that survives sessions, and carrying it to another browser.
  {
    const ctxA = await browser.newContext({ viewport: { width: 900, height: 900 }, acceptDownloads: true });
    await ctxA.addInitScript(mapOn);
    const a = await ctxA.newPage();
    a.on('pageerror', (e) => errors.push(String(e)));
    await a.goto(URL);
    check((await a.locator('#enter').textContent()).includes('Enter'), 'a first visit offers to enter');
    await a.click('#enter');
    await a.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    await a.click('#intro-ok');
    // journal
    await a.click('#open-journal');
    check(await a.locator('#journal-panel').isVisible(), 'the Journal button opens the journal');
    await a.fill('#journal-text', 'The sea was loud tonight.\nI am counting halls.');
    await a.click('#journal-add');
    check((await a.locator('#journal-list li').count()) === 1 && (await a.locator('#journal-list').textContent()).includes('I am counting halls.'), 'an entry written in free text appears, line breaks and all');
    check((await a.locator('#journal-list .when').first().textContent()).includes('First Vestibule'), 'and says where and when in the House it was written');
    await a.fill('#journal-text', 'A second page.');
    await a.press('#journal-text', 'Control+Enter');
    check((await a.locator('#journal-list li').count()) === 2, 'Ctrl+Enter writes it down too');
    await a.locator('#journal-list li').first().getByRole('button', { name: /Change/ }).click();
    await a.locator('#journal-list li textarea').fill('A second page, changed.');
    await a.getByRole('button', { name: 'Keep the change' }).click();
    check((await a.locator('#journal-list').textContent()).includes('A second page, changed.'), 'an entry can be changed');
    await a.locator('#journal-list li').first().getByRole('button', { name: /Tear out/ }).click();
    await a.locator('#journal-list li').first().getByRole('button', { name: /Really/ }).click();
    check((await a.locator('#journal-list li').count()) === 1, 'and torn out, after being asked twice');
    await a.click('#journal-close');
    // a command writes too
    await a.fill('#input', 'write The Faun smiled at ME');
    await a.press('#input', 'Enter');
    await a.press('#input', 'Enter');
    await a.fill('#input', 'travel west 3');
    await a.press('#input', 'Enter');
    await a.waitForFunction(() => /Western Hall/.test(document.getElementById('place').textContent) && document.getElementById('place').textContent !== 'First Western Hall', null, { timeout: 15000 });
    const placeBefore = await a.locator('#place').textContent();
    await a.fill('#input', 'mark the third hall');
    await a.press('#input', 'Enter');
    await a.waitForTimeout(300);
    // a second session: close and open again
    await a.reload();
    check((await a.locator('#enter').textContent()).includes('Return'), 'coming back, the title offers to return');
    check(/you remember visiting (a few|some|one|two) halls?, and you have 2 entries/.test(await a.locator('#title-saved').textContent()), 'and says what is kept, in words (how many halls, and journal entries)');
    await a.click('#enter');
    await a.waitForFunction(() => document.getElementById('log').textContent.includes('where you left off'));
    check((await a.locator('#place').textContent()) === placeBefore, `the journey survives: you are where you left off (${placeBefore})`);
    await a.click('#open-journal');
    check((await a.locator('#journal-list').textContent()).includes('The Faun smiled at ME'), 'and so does the journal, in your own words and case');
    await a.click('#journal-close');
    await a.fill('#input', 'marks');
    await a.press('#input', 'Enter');
    check((await a.locator('#log').textContent()).includes('third hall'), 'and what you marked');
    // carry it to another browser
    await a.click('#open-settings');
    await a.click('#s-carry');
    const dl = a.waitForEvent('download');
    await a.click('#carry-file');
    const file = await dl;
    const path = await file.path();
    check(/^piranesis-house-journey-\d{4}-\d\d-\d\d\.json$/.test(file.suggestedFilename()), `a copy of the journey can be saved (${file.suggestedFilename()})`);
    // a different browser: a fresh context with nothing kept
    const ctxB = await browser.newContext({ viewport: { width: 900, height: 900 } });
    const b = await ctxB.newPage();
    b.on('pageerror', (e) => errors.push(String(e)));
    await b.goto(URL);
    check((await b.locator('#enter').textContent()).includes('Enter'), 'the new browser knows nothing of it');
    await b.click('#enter');
    await b.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    await b.click('#open-settings');
    await b.click('#s-carry');
    await b.setInputFiles('#carry-pick', path);
    await b.waitForFunction(() => document.getElementById('carry-status').textContent.includes('journal entr'));
    check((await b.locator('#carry-status').textContent()).includes('1 journal entry') || (await b.locator('#carry-status').textContent()).includes('2 journal entries'), `the file is read and described before anything changes (${(await b.locator('#carry-status').textContent()).slice(0, 70)}...)`);
    await Promise.all([b.waitForEvent('load'), b.click('#carry-apply')]);
    await b.click('#enter');
    await b.waitForFunction(() => document.getElementById('log').textContent.includes('where you left off'));
    check((await b.locator('#place').textContent()) === placeBefore, 'brought to the new browser, you are where you were');
    await b.click('#open-journal');
    check((await b.locator('#journal-list').textContent()).includes('The Faun smiled at ME'), 'with the journal');
    await b.click('#journal-close');
    await b.fill('#input', 'marks');
    await b.press('#input', 'Enter');
    check((await b.locator('#log').textContent()).includes('third hall'), 'and the marks');
    // damaged copies are refused in plain words
    await b.click('#open-settings');
    await b.click('#s-carry');
    await b.fill('#carry-paste', 'HOUSE1:not-a-journey');
    await b.click('#carry-read');
    check((await b.locator('#carry-status').textContent()).length > 10 && (await b.locator('#carry-apply').isHidden()), 'a damaged copy is refused, and nothing is changed');
    await b.click('#carry-close');
    // the text form works too
    await a.fill('#carry-paste', '');
    await a.click('#carry-code');
    await a.waitForTimeout(200);
    check(((await a.locator('#carry-out').textContent()) ?? '').length > 10, 'a transfer code can be copied as text');
    await a.click('#carry-close');
    // beginning again
    await a.click('#open-settings');
    await a.click('#s-again');
    await a.click('#again-yes');
    await a.waitForFunction(() => document.getElementById('place').textContent === 'First Vestibule');
    await a.fill('#input', 'marks');
    await a.press('#input', 'Enter');
    check((await a.locator('#log').textContent()).includes('not marked anywhere'), 'beginning again forgets the journey');
    await a.click('#open-journal');
    check((await a.locator('#journal-list li').count()) === 2, 'but keeps the journal, unless asked to tear it out');
    await ctxB.close();
    await ctxA.close();
  }

  // Being lost: the place name, the address and Share follow what you believe, not what is true. And the iOS install popover.
  {
    const lp = await newPage({ viewport: { width: 900, height: 900 } });
    lp.on('pageerror', (e) => errors.push(String(e)));
    await lp.goto(URL);
    await lp.click('#enter');
    await lp.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    await lp.fill('#input', 'travel west 2');
    await lp.press('#input', 'Enter');
    await lp.waitForFunction(() => /Western Hall/.test(document.getElementById('place').textContent), null, { timeout: 15000 });
    const truth = await lp.locator('#place').textContent();
    await lp.evaluate(() => { window.__house.game.belief = { kind: 'wrong', dx: 0, dy: 3, dl: 0 }; });
    await lp.waitForFunction((tr) => document.getElementById('place').textContent !== tr, truth, { timeout: 5000 });
    const wrongName = await lp.locator('#place').textContent();
    check(wrongName !== truth && !!wrongName, `astray without knowing, the header names a place that is not where you are (${wrongName} instead of ${truth})`);
    check(((await lp.evaluate(() => location.hash)).replace(/\+/g, ' ')).includes(wrongName.replace(/,/g, '%2C').replace(/ /g, ' ')) || (await lp.evaluate(() => decodeURIComponent(location.hash).replace(/\+/g, ' '))).includes(wrongName), 'and so does the address bar');
    await lp.evaluate(() => { window.__house.game.belief = { kind: 'lost' }; });
    await lp.waitForFunction(() => document.getElementById('place').textContent === 'Somewhere you do not know', null, { timeout: 5000 });
    check(true, 'lost, the header says it does not know');
    check(!(await lp.evaluate(() => location.hash)).includes('room='), 'and the address bar names no room');
    await lp.click('#open-settings');
    await lp.click('#share');
    await lp.click('#s-cancel');
    check((await lp.locator('#log').textContent()).includes('cannot share a place you cannot name'), 'and there is no sharing a place you cannot name');
    // naming the hall rightly puts you right; a wrong name does not
    await lp.fill('#input', 'this is the fifth south-eastern hall');
    await lp.press('#input', 'Enter');
    check((await lp.locator('#log').textContent()).includes('does not feel right') && (await lp.locator('#place').textContent()) === 'Somewhere you do not know', 'a wrong name does not settle');
    await lp.fill('#input', `this is the ${truth}`);
    await lp.press('#input', 'Enter');
    await lp.waitForFunction((tr) => document.getElementById('place').textContent === tr, truth, { timeout: 5000 });
    check((await lp.locator('#log').textContent()).includes('You know where you are'), 'and naming the hall rightly puts you right again');
    await lp.click('#open-settings');
    await lp.click('#s-ios');
    check(await lp.locator('#ios').isVisible() && (await lp.locator('#ios').textContent()).includes('Add to Home Screen'), 'Settings opens instructions for installing on an iPhone or iPad');
    await lp.click('#ios-close');
    await lp.close();
  }

  // Naming things, the narrative names, and the stars in the dark hall.
  {
    const nm = await newPage({ viewport: { width: 900, height: 900 } });
    nm.on('pageerror', (e) => errors.push(String(e)));
    await nm.goto(URL);
    await nm.click('#enter');
    await nm.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    check((await nm.evaluate(() => decodeURIComponent(location.hash).replace(/\+/g, ' '))).includes('as=the Hall of the Minotaurs'), 'the address carries a narrative name beside the plain one');
    await nm.fill('#input', 'look closely');
    await nm.press('#input', 'Enter');
    check((await nm.locator('#log').textContent()).includes('First Vestibule, the Hall of the Minotaurs'), 'and the heading gives it');
    await nm.fill('#input', 'call this hall the Hall of Weeping');
    await nm.press('#input', 'Enter');
    check((await nm.locator('#log').textContent()).includes('“Hall of Weeping”'), 'a hall can be given a name of your own');
    check((await nm.evaluate(() => decodeURIComponent(location.hash).replace(/\+/g, ' '))).includes('as=Hall of Weeping'), 'which the address then carries');
    await nm.fill('#input', 'call the minotaur Old Horns');
    await nm.press('#input', 'Enter');
    await nm.fill('#input', 'names');
    await nm.press('#input', 'Enter');
    const logText = await nm.locator('#log').textContent();
    check(logText.includes('Old Horns') && logText.includes('Hall of Weeping'), 'and so can a statue, and "names" says what you still remember');
    await nm.locator('.links button', { hasText: 'name this place' }).last().click();
    check((await nm.inputValue('#input')).startsWith('call this hall'), 'a button starts the naming for you');
    // the dark hall at night shows what stands in the doorway
    await nm.evaluate(() => window.__house.teleport(-192, 0, 1));
    await nm.waitForTimeout(300);
    await nm.close();
  }

  // Every kind of bird call, and thunder, can be played without error, and each is counted.
  {
    const species = ['sparrow', 'gull', 'rook', 'albatross', 'flock', 'rustle', 'blackbird', 'swift', 'wader', 'dove', 'owl', 'starling', 'chick', 'goose', 'thunder'];
    const before = await page.evaluate(() => window.__house.engine.stats().calls);
    for (const s of species) await page.evaluate((k) => window.__house.engine.demo(k), s);
    const after = await page.evaluate(() => window.__house.engine.stats().calls);
    check(after - before === species.length, `all ${species.length} distinct bird calls and thunder play (${after - before} played)`);
    let base = 0, peak = 0;
    for (let i = 0; i < 6; i++) { base += await page.evaluate(() => window.__house.engine.level()); await page.waitForTimeout(40); }
    base /= 6;
    await page.evaluate(() => window.__house.engine.demo('thunder'));
    for (let i = 0; i < 30; i++) { peak = Math.max(peak, await page.evaluate(() => window.__house.engine.level())); await page.waitForTimeout(60); }
    check(peak > base * 1.15, `thunder is audible over the House (peak ${peak.toFixed(3)} vs ${base.toFixed(3)})`);
  }

  // The visitor's murmuring: `mutter=2` makes it every 2 s so we need not wait minutes.
  {
    const m = await newPage({ viewport: { width: 900, height: 900 } });
    m.on('pageerror', (e) => errors.push(String(e)));
    await m.goto(`${URL}&mutter=2`);
    await m.click('#enter');
    await m.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    await m.waitForFunction(() => document.getElementById('log').textContent.includes('You murmur:'), null, { timeout: 30000 });
    check(true, 'the visitor murmurs now and then, and it is written in the log');
    await m.click('#open-settings');
    await m.uncheck('#s-mutter');
    await m.click('#s-save');
    const n0 = await m.locator('.mutter').count();
    await m.waitForTimeout(6000);
    check((await m.locator('.mutter').count()) === n0, 'with the setting off, there is no more murmuring');
    await m.close();
  }

  // Phone width: the header must not squeeze the place name into a column of single letters.
  {
    const ph = await newPage({ viewport: { width: 360, height: 700 } });
    await ph.goto(URL);
    await ph.click('#enter');
    await ph.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    const m = await ph.evaluate(() => ({ placeW: document.getElementById('place').offsetWidth, barH: document.getElementById('bar').offsetHeight, sw: document.documentElement.scrollWidth }));
    check(m.placeW > 200 && m.barH < 160 && m.sw <= 360, `[phone] the header is laid out sensibly (place ${m.placeW}px wide, bar ${m.barH}px tall, no sideways scroll)`);
    await ph.close();
  }

  // Travel: a named place far away in one command, marks, and the map's "Travel here" button.
  {
    const tr = await newPage({ viewport: { width: 390, height: 780 }, hasTouch: true });
    tr.on('pageerror', (e) => errors.push(String(e)));
    await tr.goto(URL);
    await tr.click('#enter');
    await tr.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    await tr.fill('#input', 'travel to the fifth western hall');
    await tr.press('#input', 'Enter');
    await tr.waitForFunction(() => document.getElementById('place').textContent === 'Fifth Western Hall', null, { timeout: 15000 });
    check((await tr.locator('#log').textContent()).includes('You pass through'), 'travel to a far hall in one command, passing through the halls between');
    await tr.fill('#input', 'mark the far end');
    await tr.press('#input', 'Enter');
    await tr.fill('#input', 'home');
    await tr.press('#input', 'Enter');
    await tr.waitForFunction(() => document.getElementById('place').textContent === 'First Vestibule', null, { timeout: 15000 });
    await tr.reload();
    await tr.click('#enter');
    await tr.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    await tr.fill('#input', 'travel to the far end');
    await tr.press('#input', 'Enter');
    await tr.waitForFunction(() => document.getElementById('place').textContent === 'Fifth Western Hall', null, { timeout: 15000 });
    check(true, 'a mark survives a reload and can be travelled to');
    await tr.click('#open-map');
    await tr.waitForTimeout(300);
    const box = await tr.locator('#map-canvas').boundingBox();
    // tap the middle of the map, then one cell to the east of the centre (a hall we know), and use the button
    await tr.mouse.click(box.x + box.width / 2 + 40, box.y + box.height / 2);
    await tr.waitForTimeout(300);
    const visible = await tr.locator('#map-travel').isVisible();
    check(visible, 'tapping a place on the map offers "Travel here"');
    if (visible) {
      await tr.click('#map-travel');
      await tr.waitForTimeout(1500);
      check(!(await tr.locator('#map-panel').isVisible()), 'the map closes and the journey begins');
    }
    await tr.close();
  }

  // Narrated walking: with narration on, a real-pace walk gives no distance or time, and the setting off is spoken.
  {
    const nw = await newPage({ viewport: { width: 900, height: 900 } });
    await nw.addInitScript(() => {
      window.__spoken = [];
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      Object.defineProperty(window, 'speechSynthesis', { value: { speaking: false, getVoices: () => [], addEventListener() {}, cancel() {}, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 10); } } });
    });
    nw.on('pageerror', (e) => errors.push(String(e)));
    await nw.goto(URL_WALK('real'));
    await nw.click('#enter');
    await nw.waitForFunction(() => document.getElementById('log').textContent.includes('First Vestibule'));
    await nw.fill('#input', 'go west');
    await nw.press('#input', 'Enter');
    await nw.waitForFunction(() => document.getElementById('log').textContent.includes('It will take'));
    check(true, '[not narrated] a walk gives its distance and time');
    await nw.fill('#input', 'stop');
    await nw.press('#input', 'Enter');
    await nw.click('#open-settings');
    await nw.selectOption('#s-narrate', 'always');
    await nw.click('#s-save');
    await nw.fill('#input', 'go west');
    await nw.press('#input', 'Enter');
    await nw.waitForFunction(() => (document.getElementById('log').textContent.match(/You set off for the west door/g) || []).length >= 1);
    const log = await nw.locator('#log').textContent();
    const tail = log.slice(log.lastIndexOf('go west'));
    check(!/It will take|metres away/.test(tail), '[narrated] the walk does not read out its distance or time');
    await nw.close();
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

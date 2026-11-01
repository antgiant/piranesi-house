// The web front end: title screen, text log with clickable links, command line, settings, live events and sound.
// No network use, no external services: everything runs from the page.

import { audioFor } from '../audio/director';
import { AudioEngine } from '../audio/engine';
import { look, newGame, sceneNow, step, tick, walkStatus, type Game, type GameOptions, type Line } from '../game/game';
import { BOOK_KMH, MARATHON_KMH, describeDuration, gait, paceFromKmh, stepsPerSecond } from '../game/walk';
import { formatClock } from '../sim/time';
import { mapView, type MapCell, type MapView } from '../game/mapdata';
import type { Level } from '../world/layout';
import { getHall } from '../world/hall';
import { MapPanel } from './map';
import { Narrator } from './speech';
import { parseRoom, withRoom, withoutRoom } from './urlstate';
import { ScreenWake } from './wakelock';
import { mutterAllowed, mutterDelayS, mutterLine } from '../game/mutter';
import { chooseWander, dwellMs } from '../game/wander';

interface Settings {
  volume: number;
  muted: boolean;
  timeScale: number;
  showDead: boolean;
  diary: boolean;
  relics: boolean;
  outside: boolean;
  /** Read descriptions aloud with the browser's voices. Off until chosen. */
  /** The visitor's own quiet muttering, heard through the hall's acoustics. */
  mutter: boolean;
  mutterCaptions: boolean;
  /** Reading comfort: text scale (1 normal), a plain spaced face, more contrast. */
  textScale: number;
  plainFont: boolean;
  contrast: boolean;
  /** Let a screen reader announce new text (off while it is being read aloud, so the two do not talk over each other). */
  announce: boolean;
  /** Single-key shortcuts when not typing. */
  shortcuts: boolean;
  narrate: boolean;
  voiceURI: string;
  narrateRate: number;
  seed: string;
  /** Walking speed in km/h: from the book's pace up to a two-hour marathon. */
  speedKmh: number;
}
const DEFAULTS: Settings = { volume: 80, muted: false, timeScale: 1, showDead: true, diary: false, relics: true, outside: true, mutter: true, mutterCaptions: true, textScale: 1, plainFont: false, contrast: false, announce: true, shortcuts: true, narrate: false, voiceURI: '', narrateRate: 0.9, seed: 'the-house', speedKmh: Math.round(BOOK_KMH * 10) / 10 };

function speedNote(kmh: number): string {
  const g = gait(paceFromKmh(kmh));
  const label = kmh <= BOOK_KMH + 0.05 ? "the book's pace: a steady walk" : g === 'walk' ? 'a brisk walk' : g === 'jog' ? 'a jog' : kmh >= MARATHON_KMH - 0.05 ? 'a two-hour marathon pace' : 'a run';
  const crossing = Math.round(150 / (kmh / 3.6));
  return `${label}. A 150 m hall takes about ${crossing} seconds.`;
}
const KEY = 'the-house.settings.v1';

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch { /* storage can be blocked; carry on with defaults */ }
  return { ...DEFAULTS };
}
function saveSettings(s: Settings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// Optional developer overrides in the URL hash: #seed=abc&scale=60&at=2034-02-01T08:00:00Z&debug
function hashParams(): URLSearchParams {
  return new URLSearchParams(location.hash.replace(/^#/, ''));
}

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const logEl = $<HTMLElement>('log');
const input = $<HTMLInputElement>('input');
const engine = new AudioEngine();
const narrator = new Narrator();
narrator.onActivity = () => engine.resume();
const screenWake = new ScreenWake();
let settings = loadSettings();
let game: Game | null = null;
const history: string[] = [];
let hist = -1;

function gameOptions(): Partial<GameOptions> {
  const q = hashParams();
  const opts: Partial<GameOptions> = {
    // a link that names a room but no world means the usual world, whatever this browser's settings say
    seed: q.get('seed') ?? (q.has('room') ? DEFAULT_SEED : settings.seed),
    timeScale: Number(q.get('scale') ?? settings.timeScale) || 1,
    showDead: settings.showDead,
    relicDensity: settings.relics ? 1 : 0,
    outsideTraces: settings.outside,
    style: settings.diary ? 'diary' : 'plain',
    // `#pace=instant` is a developer override for tests; the settings panel only offers the book's pace up to a marathon.
    walkPace: q.get('pace') === 'instant' ? Infinity : paceFromKmh(settings.speedKmh),
  };
  const at = q.get('at');
  if (at && !Number.isNaN(Date.parse(at))) opts.startAtWorldMs = Date.parse(at) - Date.UTC(2026, 0, 1);
  return opts;
}

/** Show lines. By default the log scrolls to the start of the new text, so you read a description from its first line. */
function print(lines: Line[], scroll: 'start' | 'end' = 'start'): void {
  const mark = logEl.lastElementChild;
  for (const l of lines) {
    if (l.kind !== 'system') narrator.speak(l.text);
    lastPrintMs = Date.now();
    lastPrintChars += l.text.length;
    const p = document.createElement('p');
    p.className = l.kind;
    p.textContent = l.text;
    logEl.appendChild(p);
    if (l.links?.length) {
      const wrap = document.createElement('div');
      wrap.className = 'links';
      for (const k of l.links) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = k.label;
        b.addEventListener('click', () => submit(k.command));
        wrap.appendChild(b);
      }
      logEl.appendChild(wrap);
    }
  }
  const first = (mark?.nextElementSibling ?? logEl.firstElementChild) as HTMLElement | null;
  if (scroll === 'start' && first) logEl.scrollTop = first.offsetTop - logEl.offsetTop - 8;
  else logEl.scrollTop = logEl.scrollHeight;
}

let lastPrintMs = 0;
let lastPrintChars = 0;

function echo(cmd: string): HTMLElement {
  const p = document.createElement('p');
  p.className = 'echo';
  p.textContent = `> ${cmd}`;
  logEl.appendChild(p);
  return p;
}

/** Keep the address bar naming the room you are in, without adding a history entry for every step. */
let lastRoomKey = '';
function syncAddress(): void {
  if (!game) return;
  const key = `${game.pos.level}:${game.pos.x},${game.pos.y}:${game.opts.seed}`;
  if (key === lastRoomKey) return;
  lastRoomKey = key;
  const hash = withRoom(location.hash, game.world, { x: game.pos.x, y: game.pos.y, level: game.pos.level }, game.opts.seed, DEFAULT_SEED);
  if (hash !== location.hash) window.history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
}

/** Someone pasted a different room into the address bar (or followed a link in this tab): go there. */
window.addEventListener('hashchange', () => {
  if (!game) return;
  // a link to a different world: start over in it
  const wanted = new URLSearchParams(location.hash.replace(/^#/, '')).get('seed') ?? DEFAULT_SEED;
  if (new URLSearchParams(location.hash.replace(/^#/, '')).has('room') && wanted !== game.opts.seed) { location.reload(); return; }
  const spot = parseRoom(game.world, location.hash);
  if (!spot || (spot.x === game.pos.x && spot.y === game.pos.y && spot.level === game.pos.level)) return;
  game.walk = null;
  game.journey = null;
  game.pos = { x: spot.x, y: spot.y, level: spot.level, wall: null, pos: 500 };
  game.said.clear();
  print(look(game, Date.now()));
  lastRoomKey = '';
  refresh();
});

function refresh(): void {
  if (!game) return;
  const now = Date.now();
  const s = sceneNow(game, now);
  const a = audioFor(game.world, s, { facing: game.facing });
  engine.setScene(a);
  if (!$('map-panel').hidden) map.draw();
  $('place').textContent = s.hall.name;
  syncAddress();
  const ws = walkStatus(game, now);
  $('clock').textContent = ws ? `${formatClock(s.clock)} · walking: ${describeDuration(ws.remainingWorldS)} to go` : formatClock(s.clock);
}

function submit(raw: string, auto = false): void {
  if (!game) return;
  const cmd = raw.trim();
  if (/^map$/i.test(cmd)) { toggleMap(); return; }
  if (/^(wander|wander on|ramble)$/i.test(cmd)) { setWandering(true); return; }
  if (/^(wander off|stop wandering)$/i.test(cmd)) { setWandering(false); return; }
  if (!auto) { setWandering(false); narrator.cancel(); }
  lastPrintChars = 0;
  const echoEl = echo(cmd || 'look');
  if (cmd) { history.unshift(cmd); hist = -1; }
  const before = `${game.pos.x},${game.pos.y},${game.pos.level}`;
  const out = step(game, cmd, Date.now());
  print(out);
  logEl.scrollTop = echoEl.offsetTop - logEl.offsetTop - 8;
  saveFound();
  saveMarks();
  refresh();
  // An instant move (pace "instant", or a very short walk) gets a few footsteps; a real walk gets them continuously below.
  const moved = before !== `${game.pos.x},${game.pos.y},${game.pos.level}`;
  if (moved && !game.walk && engine.started) {
    const surface = audioFor(game.world, sceneNow(game, Date.now()), { portals: false }).surface;
    for (let i = 0; i < 4; i++) setTimeout(() => engine.footstep(surface), i * 380);
  }
}

// What you have noticed that earlier visitors left behind is a private note on this device, per world. Never shared.
const foundKey = (seed: string): string => `the-house.found.v1.${seed}`;
function loadFound(g: Game): void {
  try {
    const raw = localStorage.getItem(foundKey(g.opts.seed));
    if (raw) for (const [id, v] of JSON.parse(raw) as [string, { label: string; hall: string }][]) g.found.set(id, v);
  } catch { /* storage can be blocked */ }
}
const marksKey = (seed: string): string => `the-house.marks.v1.${seed}`;
function loadMarks(g: Game): void {
  try {
    const raw = localStorage.getItem(marksKey(g.opts.seed));
    if (raw) for (const [k, v] of JSON.parse(raw) as [string, { x: number; y: number; level: Level; hall: string }][]) g.marks.set(k, v);
  } catch { /* storage can be blocked */ }
}
let savedMarks = '';
function saveMarks(): void {
  if (!game) return;
  const s = JSON.stringify([...game.marks]);
  if (s === savedMarks) return;
  savedMarks = s;
  try { localStorage.setItem(marksKey(game.opts.seed), s); } catch { /* ignore */ }
}
let savedFound = 0;
function saveFound(): void {
  if (!game || game.found.size === savedFound) return;
  savedFound = game.found.size;
  try { localStorage.setItem(foundKey(game.opts.seed), JSON.stringify([...game.found])); } catch { /* ignore */ }
}

const DEFAULT_SEED = 'the-house';
/** Start (or restart). A shared address puts you in the hall it names, on the first start only. */
function startGame(fromHash = false): void {
  game = newGame(gameOptions(), Date.now());
  const shared = fromHash ? parseRoom(game.world, location.hash) : null;
  if (shared) game.pos = { x: shared.x, y: shared.y, level: shared.level, wall: null, pos: 500 };
  syncWalkNarration();
  loadFound(game);
  savedFound = game.found.size;
  loadMarks(game);
  savedMarks = JSON.stringify([...game.marks]);
  logEl.textContent = '';
  // Arriving by a link is a sudden change, as in the stories of crossing into the House: the world stops, the air turns cool and
  // damp, there is the thud of far-off water on stone, and you are simply there.
  if (shared) {
    const name = getHall(game.world, shared.x, shared.y, shared.level).name;
    print([{ kind: 'text', text: `Everything stops. The air turns cooler and damper, and far off you can hear water thudding against stone. You suddenly find yourself standing in the ${name}.` }]);
    print([{ kind: 'system', text: 'Type "help" at any time, or use the buttons under each description.' }]);
  } else {
    print([{ kind: 'system', text: 'You arrive. Type "help" at any time, or use the buttons under each description.' }]);
  }
  print(look(game, Date.now()));
  refresh();
  if (hashParams().has('debug')) {
    const g = game;
    (window as unknown as Record<string, unknown>).__house = {
      game: g, engine,
      teleport(x: number, y: number, level: 0 | 1 | 2) { g.pos = { x, y, level, wall: null, pos: 500 }; print(look(g, Date.now())); refresh(); },
      audio() { return audioFor(g.world, sceneNow(g, Date.now()), { facing: g.facing }); },
      mapView(level: Level = g.pos.level) { return mapView(g, level, Date.now()); },
      relics() { return g.relicsListed; },
      scene() { return sceneNow(g, Date.now()); },
    };
  }
}

async function enter(): Promise<void> {
  $('title').hidden = true;
  $('bar').hidden = false;
  $('cmd').hidden = false;
  engine.setVolume(settings.volume / 100);
  engine.setMuted(settings.muted);
  startGame(true);
  try { await engine.start(); } catch { print([{ kind: 'system', text: 'Sound could not be started in this browser. The House is still here to read.' }]); }
  if (!introSeen()) showIntro();
  if (engine.started && !engine.running) {
    // some browsers wait for another tap before letting the sound play
    print([{ kind: 'system', text: 'Your browser has not yet let the House make sound. Tap or press any key and it will begin.' }]);
    const wake = (): void => { void engine.start().then(() => engine.resume()); };
    document.addEventListener('pointerdown', wake, { once: true });
    document.addEventListener('keydown', wake, { once: true });
  }
  refresh();
  input.focus();
}

// --- the map ----------------------------------------------------------------------------------------------------
const mapEl = $<HTMLElement>('map-panel');
const mapCaption = $('map-caption');
const mapTravel = $<HTMLButtonElement>('map-travel');
let picked: { name: string; level: Level } | null = null;
const map = new MapPanel(
  $<HTMLCanvasElement>('map-canvas'),
  (level: Level): MapView => mapView(game as Game, level, Date.now()),
  (c: MapCell | null, v: MapView) => {
    picked = c && c.state !== 'here' ? { name: c.name, level: v.level } : null;
    mapTravel.hidden = !picked;
    if (picked) mapTravel.textContent = `Travel to ${picked.name}`;
    mapCaption.textContent = c
      ? `${c.name}: ${c.state === 'here' ? 'you are here' : c.state === 'visited' ? 'you have been here' : 'seen through a door, not yet entered'}${c.waterDm > 0 ? `; water ${(c.waterDm / 10).toFixed(1)} m deep` : ''}${c.lake ? '; a still lake' : ''}.`
      : `${v.visited} halls explored, ${v.known} more seen through doors.`;
  },
);
function toggleMap(open?: boolean): void {
  const show = open ?? mapEl.hidden;
  mapEl.hidden = !show;
  $('open-map').setAttribute('aria-expanded', String(show));
  if (show && game) { map.level = game.pos.level; setLevelButtons(); map.centre(); }
}
function setLevelButtons(): void {
  document.querySelectorAll<HTMLButtonElement>('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.level) === map.level)));
}
$('open-map').addEventListener('click', () => toggleMap());
mapTravel.addEventListener('click', () => {
  if (!picked || !game) return;
  const where = `${picked.name} ${(['lower', 'middle', 'upper'] as const)[picked.level]}`;
  toggleMap(false);
  submit(`travel to ${where}`);
});
$('map-close').addEventListener('click', () => toggleMap(false));
$('map-plus').addEventListener('click', () => map.zoom(1.25));
$('map-minus').addEventListener('click', () => map.zoom(1 / 1.25));
$('map-centre').addEventListener('click', () => map.centre());
document.querySelectorAll<HTMLButtonElement>('.seg button').forEach((b) => b.addEventListener('click', () => { map.setLevel(Number(b.dataset.level) as Level); setLevelButtons(); }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !mapEl.hidden) toggleMap(false); });
window.addEventListener('resize', () => { if (!mapEl.hidden) map.draw(); });

function paintMute(): void {
  const b = $<HTMLButtonElement>('mute');
  b.textContent = settings.muted ? 'Sound off' : 'Sound on';
  b.setAttribute('aria-pressed', String(settings.muted));
}

// --- wiring -----------------------------------------------------------------------------------------------------
$('enter').addEventListener('click', () => { void enter(); });
$<HTMLFormElement>('cmd').addEventListener('submit', (e) => { e.preventDefault(); submit(input.value); input.value = ''; });
input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && history.length) { hist = Math.min(history.length - 1, hist + 1); input.value = history[hist] as string; e.preventDefault(); }
  if (e.key === 'ArrowDown') { hist = Math.max(-1, hist - 1); input.value = hist >= 0 ? (history[hist] as string) : ''; e.preventDefault(); }
});
$('mute').addEventListener('click', () => { settings.muted = !settings.muted; saveSettings(settings); engine.setMuted(settings.muted); paintMute(); });

const dlg = $<HTMLDialogElement>('settings');
const aboutDlg = $<HTMLDialogElement>('about');
/** Show a dialog; very old browsers without the dialog element get it opened plainly. */
function openDialog(d: HTMLDialogElement): void {
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
}
function closeDialog(d: HTMLDialogElement): void {
  if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
}
const openAbout = (): void => openDialog(aboutDlg);
$('open-about').addEventListener('click', openAbout);
$('s-about').addEventListener('click', openAbout);
$('about-close').addEventListener('click', (e) => { e.preventDefault(); closeDialog(aboutDlg); });
function fillSettings(): void {
  $<HTMLInputElement>('s-volume').value = String(settings.volume);
  $<HTMLInputElement>('s-dead').checked = settings.showDead;
  $<HTMLInputElement>('s-diary').checked = settings.diary;
  $<HTMLInputElement>('s-relics').checked = settings.relics;
  $<HTMLInputElement>('s-outside').checked = settings.outside;
  $<HTMLInputElement>('s-narrate').checked = settings.narrate;
  $<HTMLSelectElement>('s-size').value = String(settings.textScale);
  $<HTMLInputElement>('s-plain').checked = settings.plainFont;
  $<HTMLInputElement>('s-contrast').checked = settings.contrast;
  $<HTMLInputElement>('s-announce').checked = settings.announce;
  $<HTMLInputElement>('s-shortcuts').checked = settings.shortcuts;
  $<HTMLInputElement>('s-mutter').checked = settings.mutter;
  $<HTMLInputElement>('s-mutter-captions').checked = settings.mutterCaptions;
  fillVoices();
  $<HTMLInputElement>('s-rate').value = String(settings.narrateRate);
  $('s-rate-out').textContent = `${settings.narrateRate.toFixed(1)}×`;
  $<HTMLSelectElement>('s-scale').value = String(settings.timeScale);
  const sp = $<HTMLInputElement>('s-speed');
  sp.value = String(settings.speedKmh);
  $('s-speed-out').textContent = `${settings.speedKmh.toFixed(1)} km/h`;
  $('s-speed-note').textContent = speedNote(settings.speedKmh);
  $<HTMLInputElement>('s-seed').value = settings.seed;
}
$('open-settings').addEventListener('click', () => { fillSettings(); openDialog(dlg); });
$('s-cancel').addEventListener('click', () => closeDialog(dlg));
$<HTMLInputElement>('s-speed').addEventListener('input', (e) => {
  const v = Number((e.target as HTMLInputElement).value);
  $('s-speed-out').textContent = `${v.toFixed(1)} km/h`;
  $('s-speed-note').textContent = speedNote(v);
});
$<HTMLInputElement>('s-volume').addEventListener('input', (e) => engine.setVolume(Number((e.target as HTMLInputElement).value) / 100));
$('s-save').addEventListener('click', (e) => {
  e.preventDefault();
  const next: Settings = {
    volume: Number($<HTMLInputElement>('s-volume').value),
    muted: settings.muted,
    showDead: $<HTMLInputElement>('s-dead').checked,
    diary: $<HTMLInputElement>('s-diary').checked,
    relics: $<HTMLInputElement>('s-relics').checked,
    outside: $<HTMLInputElement>('s-outside').checked,
    narrate: $<HTMLInputElement>('s-narrate').checked,
    textScale: Number($<HTMLSelectElement>('s-size').value) || 1,
    plainFont: $<HTMLInputElement>('s-plain').checked,
    contrast: $<HTMLInputElement>('s-contrast').checked,
    announce: $<HTMLInputElement>('s-announce').checked,
    shortcuts: $<HTMLInputElement>('s-shortcuts').checked,
    mutter: $<HTMLInputElement>('s-mutter').checked,
    mutterCaptions: $<HTMLInputElement>('s-mutter-captions').checked,
    voiceURI: $<HTMLSelectElement>('s-voice').value,
    narrateRate: Number($<HTMLInputElement>('s-rate').value) || 1,
    timeScale: Number($<HTMLSelectElement>('s-scale').value) || 1,
    seed: $<HTMLInputElement>('s-seed').value.trim() || DEFAULTS.seed,
    speedKmh: Math.max(BOOK_KMH, Math.min(MARATHON_KMH, Number($<HTMLInputElement>('s-speed').value) || DEFAULTS.speedKmh)),
  };
  const prevSeed = settings.seed;
  const restart = next.showDead !== settings.showDead || next.timeScale !== settings.timeScale || next.seed !== settings.seed || next.relics !== settings.relics || next.outside !== settings.outside;
  const restyle = next.diary !== settings.diary;
  settings = next;
  saveSettings(settings);
  engine.setVolume(settings.volume / 100);
  applyNarration();
  applyReading();
  if (game && hashParams().get('pace') !== 'instant') game.opts.walkPace = paceFromKmh(settings.speedKmh);
  closeDialog(dlg);
  if (restart || restyle) {
    // starting again at the First Vestibule: forget the old room, and a seed the settings have just replaced
    const q = new URLSearchParams(withoutRoom(location.hash).replace(/^#/, ''));
    if (next.seed !== prevSeed) q.delete('seed');
    window.history.replaceState(null, '', `${location.pathname}${location.search}${q.toString() ? `#${q}` : ''}`);
    startGame();
    input.focus();
  }
});

// --- first-run introduction, shortcuts, transcript, offline, and plain-words errors -------------------------------------
const introEl = $('intro');
const INTRO_KEY = 'the-house.intro.v1';
function introSeen(): boolean { try { return localStorage.getItem(INTRO_KEY) === '1'; } catch { return false; } }
function showIntro(): void { introEl.hidden = false; }
$('intro-ok').addEventListener('click', () => {
  introEl.hidden = true;
  try { localStorage.setItem(INTRO_KEY, '1'); } catch { /* ignore */ }
  input.focus();
});
$('s-intro').addEventListener('click', () => { closeDialog(dlg); showIntro(); introEl.scrollIntoView?.({ block: 'start' }); });

/** Everything read so far, as a plain text file kept on the device: nothing is sent anywhere. */
function saveTranscript(): void {
  const when = new Date();
  const head = `Piranesi’s House: what I have read\nSaved ${when.toLocaleString()}\nWhere I was: ${location.href}\n\n`;
  const body = Array.from(logEl.children).map((el) => (el as HTMLElement).innerText.trim()).filter(Boolean).join('\n\n');
  const blob = new Blob([head, body, '\n'], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `piranesis-house-${when.toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
$('s-transcript').addEventListener('click', saveTranscript);

/** Single-key shortcuts, only when nothing is being typed and no dialog is open. They can be turned off in Settings. */
document.addEventListener('keydown', (e) => {
  if (!settings.shortcuts || e.ctrlKey || e.metaKey || e.altKey || !game) return;
  const el = e.target as HTMLElement | null;
  if (el && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return; // typing: leave the keys alone
  if (dlg.open || aboutDlg.open || !$('title').hidden) return;
  switch (e.key) {
    case '/': e.preventDefault(); input.focus(); break;
    case 'm': toggleMap(); break;
    case 'w': setWandering(!wandering); break;
    case 'r': submit('repeat'); break;
    case 's': $('mute').click(); break;
    case '?': submit('help'); break;
    default: return;
  }
});

/** Say plainly what went wrong, once in a while, instead of failing silently. */
let lastProblemMs = 0;
function problem(text: string): void {
  if (Date.now() - lastProblemMs < 10000) return;
  lastProblemMs = Date.now();
  print([{ kind: 'system', text }], 'end');
}
window.addEventListener('error', () => problem('Something went wrong inside the page. The House is still here; if it stops answering, reload this page. Your marks and notes are kept.'));
window.addEventListener('unhandledrejection', () => problem('Something went wrong inside the page. The House is still here; if it stops answering, reload this page. Your marks and notes are kept.'));

/** Notes for browsers that cannot do everything the House does. */
(function featureNotes(): void {
  const notes: string[] = [];
  const AC = (window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown });
  if (!AC.AudioContext && !AC.webkitAudioContext) notes.push('This browser cannot make the sound the House is built from, so you will have the text only. A recent Chrome, Edge, Firefox or Safari will give you the sound.');
  try { localStorage.setItem('the-house.probe', '1'); localStorage.removeItem('the-house.probe'); } catch { notes.push('This browser is not letting the page keep anything, so your settings, marks and notes will be forgotten when you close it.'); }
  if (typeof HTMLDialogElement === 'undefined') notes.push('This is an old browser: some panels may look plain, but everything still works.');
  if (notes.length) {
    const p = document.createElement('p');
    p.className = 'small';
    p.id = 'title-note';
    p.textContent = notes.join(' ');
    $('enter').before(p);
  }
})();

// Offline: once opened, the House opens again without a connection.
const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && (!isLocal || hashParams().has('sw'))) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('./sw.js').catch(() => undefined); });
}

function fillVoices(): void {
  const sel = $<HTMLSelectElement>('s-voice');
  sel.replaceChildren(new Option('Automatic: calm, British where available', ''));
  for (const v of narrator.voices()) sel.add(new Option(`${v.name} (${v.lang})`, v.voiceURI));
  sel.value = settings.voiceURI;
}
/** Reading comfort applies at once and everywhere, from the first screen. */
function applyReading(): void {
  const r = document.documentElement;
  r.style.setProperty('--scale', String(settings.textScale));
  if (settings.plainFont) r.setAttribute('data-plain', ''); else r.removeAttribute('data-plain');
  if (settings.contrast) r.setAttribute('data-contrast', ''); else r.removeAttribute('data-contrast');
  // A screen reader and the browser's reading voice would talk over each other: only one of them announces new text.
  logEl.setAttribute('aria-live', settings.announce && !narrator.enabled ? 'polite' : 'off');
}
applyReading();

/** Share the link to this room: the device's own share sheet where there is one, otherwise copy it. */
$('share').addEventListener('click', async () => {
  const url = location.href;
  const title = `${game ? sceneNow(game, Date.now()).hall.name : "Piranesi's House"} · Piranesi’s House`;
  try {
    if (navigator.share) { await navigator.share({ title, url }); return; }
  } catch { /* cancelled: nothing to do */ return; }
  try {
    await navigator.clipboard.writeText(url);
    print([{ kind: 'system', text: 'The link to this room is copied. Anyone who opens it will find themselves standing here.' }], 'end');
  } catch {
    print([{ kind: 'system', text: `Copy this link to share the room: ${url}` }], 'end');
  }
});

function applyNarration(): void {
  narrator.enabled = settings.narrate && narrator.supported;
  syncWalkNarration();
  narrator.rate = settings.narrateRate;
  applyReading();
  narrator.voiceURI = settings.voiceURI;
  if (!settings.narrate) narrator.cancel();
}
applyNarration();
if (narrator.supported) window.speechSynthesis.addEventListener('voiceschanged', fillVoices);
if (!narrator.supported) {
  $<HTMLInputElement>('s-narrate').disabled = true;
  $('s-narrate-note').textContent = 'Your browser has no speech voices to offer, so narration is unavailable.';
}
$<HTMLInputElement>('s-rate').addEventListener('input', (e) => { $('s-rate-out').textContent = `${Number((e.target as HTMLInputElement).value).toFixed(1)}×`; });

// Wander: the visitor lets the House carry them. It describes, listens, looks at a statue, and moves on, for ever,
// until any key is typed or the button is pressed again. It waits for the reading to finish (or a reading-time pause).
let wandering = false;
/** Narrated walking (no times, walks described as they go) whenever the House is being read aloud or is wandering on its own. */
function syncWalkNarration(): void {
  if (game) game.opts.walkNarration = narrator.enabled || wandering;
}
function setWandering(on: boolean): void {
  wandering = on && game !== null;
  syncWalkNarration();
  const b = $('wander');
  b.setAttribute('aria-pressed', String(wandering));
  b.textContent = wandering ? 'Wandering…' : 'Wander';
  if (wandering) print([{ kind: 'system', text: 'You let your feet choose. Type anything, or press Wander again, to stop.' }], 'end');
  else narrator.cancel();
}
$('wander').addEventListener('click', () => setWandering(!wandering));
input.addEventListener('input', () => { if (wandering) setWandering(false); });
// Keep the screen awake while wandering or while something is being read aloud.
setInterval(() => screenWake.want(wandering || narrator.busy), 1000);
setInterval(() => {
  if (!wandering || !game || game.walk) return;
  // With narration on, never move until the reading has finished, then leave a breath. Otherwise a reading-time pause.
  if (narrator.enabled) {
    if (narrator.busy || Date.now() - narrator.lastBusyMs < 1800) return;
  } else if (Date.now() - lastPrintMs < dwellMs(lastPrintChars)) return;
  submit(chooseWander(game, Math.random), true);
}, 500);

// The visitor mutters now and then, quietly, rarely, never during a tide, under water or in the dark. The sound goes through
// the same reverb and muffling as the rest of the House. With captions on, what was murmured is also written in the log
// (never read out by the narrator, which would only talk over it).
// `#mutter=5` is a developer override: mutter every 5 seconds, so tests do not have to wait minutes.
const mutterEveryS = Number(hashParams().get('mutter')) || 0;
let nextMutterMs = Date.now() + (mutterEveryS ? mutterEveryS * 1000 : mutterDelayS(Math.random) * 1000);
setInterval(() => {
  if (!game || !engine.started || Date.now() < nextMutterMs) return;
  const gap = (mutterEveryS || mutterDelayS(Math.random)) * 1000;
  nextMutterMs = Date.now() + gap;
  if (!settings.mutter) return;
  const a = audioFor(game.world, sceneNow(game, Date.now()), { facing: game.facing });
  if (!mutterAllowed(a)) return;
  const line = mutterLine(Math.random);
  const secs = engine.mutter(line);
  if (secs > 0 && settings.mutterCaptions) {
    const p = document.createElement('p');
    p.className = 'event mutter';
    p.textContent = `You murmur: ${line}`;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
  }
}, 1000);

paintMute();
setInterval(() => {
  if (!game) return;
  const wasWalking = game.walk !== null;
  const lines = tick(game, Date.now());
  if (lines.length) print(lines, wasWalking && game.walk === null ? 'start' : 'end');
  refresh();
}, 1000);

// While walking, footsteps at a cadence that follows your speed: about 2 a second at the book's pace, 3 at marathon pace.
function stepLoop(): void {
  if (game?.walk && engine.started) engine.footstep(audioFor(game.world, sceneNow(game, Date.now()), { portals: false }).surface);
  const pace = game && Number.isFinite(game.opts.walkPace) ? game.opts.walkPace : 1;
  setTimeout(stepLoop, 1000 / stepsPerSecond(pace));
}
stepLoop();

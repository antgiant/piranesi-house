// The web front end: title screen, text log with clickable links, command line, settings, live events and sound.
// No network use, no external services: everything runs from the page.

import { audioFor } from '../audio/director';
import { AudioEngine } from '../audio/engine';
import { look, newGame, sceneNow, step, tick, walkStatus, type Game, type GameOptions, type Line } from '../game/game';
import { BOOK_KMH, MARATHON_KMH, describeDuration, gait, paceFromKmh, stepsPerSecond } from '../game/walk';
import { formatClock } from '../sim/time';
import { mapView, type MapCell, type MapView } from '../game/mapdata';
import type { Level } from '../world/layout';
import { MapPanel } from './map';
import { Narrator } from './speech';
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
  narrate: boolean;
  voiceURI: string;
  narrateRate: number;
  seed: string;
  /** Walking speed in km/h: from the book's pace up to a two-hour marathon. */
  speedKmh: number;
}
const DEFAULTS: Settings = { volume: 80, muted: false, timeScale: 1, showDead: true, diary: false, relics: true, outside: true, narrate: false, voiceURI: '', narrateRate: 0.9, seed: 'the-house', speedKmh: Math.round(BOOK_KMH * 10) / 10 };

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
let settings = loadSettings();
let game: Game | null = null;
const history: string[] = [];
let hist = -1;

function gameOptions(): Partial<GameOptions> {
  const q = hashParams();
  const opts: Partial<GameOptions> = {
    seed: q.get('seed') ?? settings.seed,
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

function refresh(): void {
  if (!game) return;
  const now = Date.now();
  const s = sceneNow(game, now);
  const a = audioFor(game.world, s, { facing: game.facing });
  engine.setScene(a);
  if (!$('map-panel').hidden) map.draw();
  $('place').textContent = s.hall.name;
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
let savedFound = 0;
function saveFound(): void {
  if (!game || game.found.size === savedFound) return;
  savedFound = game.found.size;
  try { localStorage.setItem(foundKey(game.opts.seed), JSON.stringify([...game.found])); } catch { /* ignore */ }
}

function startGame(): void {
  game = newGame(gameOptions(), Date.now());
  loadFound(game);
  savedFound = game.found.size;
  logEl.textContent = '';
  print([{ kind: 'system', text: 'You arrive. Type "help" at any time, or use the buttons under each description.' }]);
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
  startGame();
  try { await engine.start(); } catch { print([{ kind: 'system', text: 'Sound could not be started in this browser. The House is still here to read.' }]); }
  refresh();
  input.focus();
}

// --- the map ----------------------------------------------------------------------------------------------------
const mapEl = $<HTMLElement>('map-panel');
const mapCaption = $('map-caption');
const map = new MapPanel(
  $<HTMLCanvasElement>('map-canvas'),
  (level: Level): MapView => mapView(game as Game, level, Date.now()),
  (c: MapCell | null, v: MapView) => {
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
function fillSettings(): void {
  $<HTMLInputElement>('s-volume').value = String(settings.volume);
  $<HTMLInputElement>('s-dead').checked = settings.showDead;
  $<HTMLInputElement>('s-diary').checked = settings.diary;
  $<HTMLInputElement>('s-relics').checked = settings.relics;
  $<HTMLInputElement>('s-outside').checked = settings.outside;
  $<HTMLInputElement>('s-narrate').checked = settings.narrate;
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
$('open-settings').addEventListener('click', () => { fillSettings(); dlg.showModal(); });
$('s-cancel').addEventListener('click', () => dlg.close());
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
    voiceURI: $<HTMLSelectElement>('s-voice').value,
    narrateRate: Number($<HTMLInputElement>('s-rate').value) || 1,
    timeScale: Number($<HTMLSelectElement>('s-scale').value) || 1,
    seed: $<HTMLInputElement>('s-seed').value.trim() || DEFAULTS.seed,
    speedKmh: Math.max(BOOK_KMH, Math.min(MARATHON_KMH, Number($<HTMLInputElement>('s-speed').value) || DEFAULTS.speedKmh)),
  };
  const restart = next.showDead !== settings.showDead || next.timeScale !== settings.timeScale || next.seed !== settings.seed || next.relics !== settings.relics || next.outside !== settings.outside;
  const restyle = next.diary !== settings.diary;
  settings = next;
  saveSettings(settings);
  engine.setVolume(settings.volume / 100);
  applyNarration();
  if (game && hashParams().get('pace') !== 'instant') game.opts.walkPace = paceFromKmh(settings.speedKmh);
  dlg.close();
  if (restart || restyle) { startGame(); input.focus(); }
});

function fillVoices(): void {
  const sel = $<HTMLSelectElement>('s-voice');
  sel.replaceChildren(new Option('Automatic: calm, British where available', ''));
  for (const v of narrator.voices()) sel.add(new Option(`${v.name} (${v.lang})`, v.voiceURI));
  sel.value = settings.voiceURI;
}
function applyNarration(): void {
  narrator.enabled = settings.narrate && narrator.supported;
  narrator.rate = settings.narrateRate;
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
function setWandering(on: boolean): void {
  wandering = on && game !== null;
  const b = $('wander');
  b.setAttribute('aria-pressed', String(wandering));
  b.textContent = wandering ? 'Wandering…' : 'Wander';
  if (wandering) print([{ kind: 'system', text: 'You let your feet choose. Type anything, or press Wander again, to stop.' }], 'end');
  else narrator.cancel();
}
$('wander').addEventListener('click', () => setWandering(!wandering));
input.addEventListener('input', () => { if (wandering) setWandering(false); });
setInterval(() => {
  if (!wandering || !game || game.walk) return;
  // With narration on, never move until the reading has finished, then leave a breath. Otherwise a reading-time pause.
  if (narrator.enabled) {
    if (narrator.busy || Date.now() - narrator.lastBusyMs < 1800) return;
  } else if (Date.now() - lastPrintMs < dwellMs(lastPrintChars)) return;
  submit(chooseWander(game, Math.random), true);
}, 500);

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

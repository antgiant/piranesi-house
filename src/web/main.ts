// The web front end: title screen, text log with clickable links, command line, settings, live events and sound.
// No network use, no external services: everything runs from the page.

import { audioFor } from '../audio/director';
import { AudioEngine } from '../audio/engine';
import { believedSpot, deleteEntry, editEntry, look, newGame, sceneNow, shownEpithet, shownName, step, tick, walkStatus, writeEntry, type Game, type GameOptions, type Line } from '../game/game';
import { BOOK_KMH, MARATHON_KMH, describeDuration, gait, paceFromKmh, stepsPerSecond } from '../game/walk';
import { formatClock } from '../sim/time';
import { mapView, type MapCell, type MapView } from '../game/mapdata';
import type { Level } from '../world/layout';
import { getHall } from '../world/hall';
import { MapPanel } from './map';
import { Narrator } from './speech';
import { parseRoom, withRoom, withoutRoom } from './urlstate';
import { journeyNote } from './words';
import { applySave, exportText, importText, toCode, toSave, type JournalEntry } from '../game/save';
import { eraseJournal, eraseSave, readJournal, readLegacy, readSave, readSettingsObject, summary, writeJournal, writeSave, writeSettingsObject } from './store';
import { ScreenWake } from './wakelock';
import { mutterAllowed, mutterDelayS, mutterLine } from '../game/mutter';
import { chooseWander, dwellMs } from '../game/wander';
import { Playlist } from './playlist';

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
  /** Keep a map of where you have been. Off (the default, as in the book): no map; you can get lost, and go back by what you remember. */
  map: boolean;
  /** Let a screen reader announce new text (off while it is being read aloud, so the two do not talk over each other). */
  announce: boolean;
  /** Single-key shortcuts when not typing. */
  shortcuts: boolean;
  /** When to read aloud: never, only while playing (the audiobook), or whenever something new is described. */
  narrate: 'off' | 'play' | 'always';
  /** What the mute button silences. */
  muteAmbient: boolean;
  muteNarration: boolean;
  voiceURI: string;
  narrateRate: number;
  seed: string;
  /** Walking speed in km/h: from the book's pace up to a two-hour marathon. */
  speedKmh: number;
}
const DEFAULTS: Settings = { volume: 80, muted: false, timeScale: 1, showDead: true, diary: false, relics: true, outside: true, mutter: true, mutterCaptions: true, textScale: 1, plainFont: false, contrast: false, announce: true, shortcuts: true, map: false, narrate: 'play', muteAmbient: true, muteNarration: true, voiceURI: '', narrateRate: 0.9, seed: 'the-house', speedKmh: Math.round(BOOK_KMH * 10) / 10 };

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
    if (raw) {
      const s = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings> & { narrate?: unknown }) } as Settings;
      // before the audiobook, reading aloud was on or off
      const n = (JSON.parse(raw) as { narrate?: unknown }).narrate;
      if (n === true) s.narrate = 'always';
      else if (n === false) s.narrate = 'play';
      else if (n !== 'off' && n !== 'play' && n !== 'always') s.narrate = DEFAULTS.narrate;
      return s;
    }
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
narrator.onSpeaking = () => engine.yieldToSpeech(true);
narrator.onSilent = () => engine.yieldToSpeech(false);
const screenWake = new ScreenWake();
let settings = loadSettings();
let game: Game | null = null;
/** Wandering (the Play button is down). */
let wandering = false;
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
    knownOnly: !settings.map,
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
  let firstEl: HTMLElement | null = null;
  const spoken: string[] = [];
  for (const l of lines) {
    if (l.kind !== 'system') narrator.speak(l.text);
    lastPrintMs = Date.now();
    lastPrintChars += l.text.length;
    const p = document.createElement('p');
    p.className = l.kind;
    p.textContent = l.text;
    logEl.appendChild(p);
    if (l.kind !== 'system') { firstEl ??= p; spoken.push(l.text); }
    if (l.links?.length) {
      const wrap = document.createElement('div');
      wrap.className = 'links';
      for (const k of l.links) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = k.label;
        b.addEventListener('click', () => { if (k.command.startsWith('prefill:')) { input.value = k.command.slice(8); input.focus(); } else submit(k.command); });
        wrap.appendChild(b);
      }
      logEl.appendChild(wrap);
    }
  }
  if (firstEl) {
    playlist.record(spoken.join(' '), firstEl);
    passageStartMs = Date.now();
  }
  const first = (mark?.nextElementSibling ?? logEl.firstElementChild) as HTMLElement | null;
  if (scroll === 'start' && first) logEl.scrollTop = first.offsetTop - logEl.offsetTop - 8;
  else logEl.scrollTop = logEl.scrollHeight;
}

let lastPrintMs = 0;
let lastPrintChars = 0;
/** Every passage read so far, for the Back and Forward buttons. */
const playlist = new Playlist<HTMLElement>();
let passageStartMs = 0;

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
  const believed = believedSpot(game);
  const key = `${believed ? `${believed.level}:${believed.x},${believed.y}` : 'lost'}:${game.opts.seed}:${shownEpithet(game, Date.now()) ?? ''}`;
  if (key === lastRoomKey) return;
  lastRoomKey = key;
  // the address says what you believe, as the header does; if you are lost it names nothing
  const hash = believed ? withRoom(location.hash, game.world, believed, game.opts.seed, DEFAULT_SEED, shownEpithet(game, Date.now())) : (withoutRoom(location.hash) || '#');
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
  game.belief = null;
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
  // the name given is what you believe, which, if you have gone astray, is not what is true
  $('place').textContent = shownName(game) ?? 'Somewhere you do not know';
  syncAddress();
  const ws = walkStatus(game, now);
  $('clock').textContent = ws ? `${formatClock(s.clock)} · walking: ${describeDuration(ws.remainingWorldS)} to go` : formatClock(s.clock);
}

function submit(raw: string, auto = false): void {
  if (!game) return;
  const cmd = raw.trim();
  if (/^map$/i.test(cmd)) {
    if (settings.map) toggleMap();
    else print([{ kind: 'text', text: 'There is no map. The House has to be remembered.' }], 'end');
    return;
  }
  if (/^(journal|diary|open journal|open my journal)$/i.test(cmd)) { toggleJournal(true); return; }
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
  if (game.journal.length !== journalCount) { journalCount = game.journal.length; saveJournal(); if (!journalEl.hidden) renderJournal(); }
  saveNow();
  refresh();
  // An instant move (pace "instant", or a very short walk) gets a few footsteps; a real walk gets them continuously below.
  const moved = before !== `${game.pos.x},${game.pos.y},${game.pos.level}`;
  if (moved && !game.walk && engine.started) {
    const surface = audioFor(game.world, sceneNow(game, Date.now()), { portals: false }).surface;
    for (let i = 0; i < 4; i++) setTimeout(() => engine.footstep(surface), i * 380);
  }
}

// --- keeping the journey ---------------------------------------------------------------------------------------------------
// Where you are, what you have found and marked, the way you remember, and your journal are kept in this browser, per world, so the
// journey is here when you come back. Nothing is sent anywhere. (To take it to another browser, see "Take my journey with me".)
let lastSaveSig = '';
let saveFailedNoted = false;
function saveNow(force = false): void {
  if (!game || noSave) return;
  let passes = 0;
  for (const v of game.passes.values()) passes += v;
  const sig = `${game.pos.level}:${game.pos.x},${game.pos.y}|${game.explored.size}|${game.found.size}|${game.marks.size}|${game.trail.length}|${game.recalls}|${passes}`;
  if (!force && sig === lastSaveSig) return;
  lastSaveSig = sig;
  if (!writeSave(game.opts.seed, toSave(game, Date.now())) && !saveFailedNoted) {
    saveFailedNoted = true;
    print([{ kind: 'system', text: 'This browser would not keep your journey, so it will be forgotten when you close the page. You can still save a copy from Settings, “Take my journey with me”.' }], 'end');
  }
}
function saveJournal(): void {
  if (game && !noSave && !writeJournal(game.opts.seed, game.journal) && !saveFailedNoted) {
    saveFailedNoted = true;
    print([{ kind: 'system', text: 'This browser would not keep your journal. Save a copy from Settings, “Take my journey with me”, so that nothing is lost.' }], 'end');
  }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(true); });
window.addEventListener('pagehide', () => saveNow(true));
setInterval(() => saveNow(), 15000);

const DEFAULT_SEED = 'the-house';
/** Start (or restart). A shared address puts you in the hall it names, on the first start only. */
function startGame(fromHash = false, fresh = false): void {
  game = newGame(gameOptions(), Date.now());
  const seed = game.opts.seed;
  // pick up where you left off, unless beginning again
  let resumed = false;
  if (!fresh) {
    const raw = readSave(seed);
    resumed = raw ? applySave(game, raw) : false;
    if (!resumed) {
      // a journey kept by an earlier version of this page
      const old = readLegacy(seed);
      if (Array.isArray(old.found)) for (const e of old.found) if (Array.isArray(e) && typeof e[0] === 'string' && e[1] && typeof e[1].label === 'string') game.found.set(e[0], { label: e[1].label, hall: String(e[1].hall ?? '') });
      if (Array.isArray(old.marks)) for (const e of old.marks) if (Array.isArray(e) && typeof e[0] === 'string' && e[1] && Number.isInteger(e[1].x)) game.marks.set(e[0], e[1]);
    }
  }
  game.journal = readJournal(seed); // beginning again keeps the journal unless it was torn out
  let shared = fromHash ? parseRoom(game.world, location.hash) : null;
  // refreshing the page leaves the address naming the room you are in: that is not a link, it is where you were
  if (shared && resumed && shared.x === game.pos.x && shared.y === game.pos.y && shared.level === game.pos.level) shared = null;
  if (shared) {
    // a link is a crossing, not a walk: you arrive with no memory of the way
    game.pos = { x: shared.x, y: shared.y, level: shared.level, wall: null, pos: 500 };
    game.trail = [];
    game.belief = null;
    game.trailOrigin = { x: shared.x, y: shared.y, level: shared.level };
  }
  game.walk = null;
  game.journey = null;
  syncWalkNarration();
  lastSaveSig = '';
  logEl.textContent = '';
  // Arriving by a link is a sudden change, as in the stories of crossing into the House: the world stops, the air turns cool and
  // damp, there is the thud of far-off water on stone, and you are simply there.
  if (shared) {
    const name = getHall(game.world, shared.x, shared.y, shared.level).name;
    print([{ kind: 'text', text: `Everything stops. The air turns cooler and damper, and far off you can hear water thudding against stone. You suddenly find yourself standing in the ${name}.` }]);
    print([{ kind: 'system', text: 'Type "help" at any time, or use the buttons under each description.' }]);
  } else if (resumed) {
    print([{ kind: 'text', text: 'You are back in the House, where you left off.' }]);
  } else {
    print([{ kind: 'system', text: 'You arrive. Type "help" at any time, or use the buttons under each description.' }]);
  }
  print(look(game, Date.now()));
  saveNow(true);
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
  applyMute();
  startGame(true);
  // ask the browser not to clear the saved journey when it is short of space (it may say no, or ask nothing of you)
  try { void navigator.storage?.persist?.().catch(() => undefined); } catch { /* not offered */ }
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

// --- the journal -----------------------------------------------------------------------------------------------------------
const journalEl = $<HTMLElement>('journal-panel');
const journalText = $<HTMLTextAreaElement>('journal-text');
let journalCount = 0;
const levelWord = ['lower', 'middle', 'upper'] as const;

function toggleJournal(open?: boolean): void {
  const show = open ?? journalEl.hidden;
  journalEl.hidden = !show;
  $('open-journal').setAttribute('aria-expanded', String(show));
  if (show) { renderJournal(); journalText.focus(); } else input.focus();
}

function entryItem(e: JournalEntry): HTMLElement {
  const li = document.createElement('li');
  const when = document.createElement('p');
  when.className = 'when';
  const real = new Date(e.at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  when.textContent = `Written in the ${e.hall}${e.level !== 1 ? `, on the ${levelWord[e.level]} level` : ''}, ${e.when}. (${real}${e.edited ? ', changed later' : ''})`;
  const body = document.createElement('p');
  body.className = 'body';
  body.textContent = e.text;
  const tools = document.createElement('div');
  tools.className = 'tools';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.textContent = 'Change';
  edit.setAttribute('aria-label', `Change the entry written ${real}`);
  edit.addEventListener('click', () => {
    const area = document.createElement('textarea');
    area.value = e.text;
    area.rows = 5;
    area.maxLength = 20000;
    area.setAttribute('aria-label', 'Change this entry');
    const save = document.createElement('button');
    save.type = 'button';
    save.textContent = 'Keep the change';
    save.className = 'primary';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Leave it as it was';
    const row = document.createElement('div');
    row.className = 'tools';
    row.append(save, cancel);
    li.replaceChildren(when, area, row);
    area.focus();
    save.addEventListener('click', () => { if (game && editEntry(game, e.id, area.value, Date.now())) { saveJournal(); } renderJournal(); });
    cancel.addEventListener('click', () => renderJournal());
  });
  const del = document.createElement('button');
  del.type = 'button';
  del.textContent = 'Tear out';
  del.setAttribute('aria-label', `Tear out the entry written ${real}`);
  let armed: number | undefined;
  del.addEventListener('click', () => {
    if (armed === undefined) {
      del.textContent = 'Really tear it out?';
      del.setAttribute('aria-label', `Really tear out the entry written ${real}? Press again to confirm.`);
      armed = window.setTimeout(() => { armed = undefined; del.textContent = 'Tear out'; del.setAttribute('aria-label', `Tear out the entry written ${real}`); }, 4000);
      return;
    }
    clearTimeout(armed);
    if (game) { deleteEntry(game, e.id); saveJournal(); }
    renderJournal();
    journalText.focus();
  });
  tools.append(edit, del);
  li.append(when, body, tools);
  return li;
}

function renderJournal(): void {
  if (!game) return;
  const list = $('journal-list');
  list.replaceChildren(...[...game.journal].reverse().map(entryItem));
  const n = game.journal.length;
  $('journal-count').textContent = n === 0 ? 'Nothing is written yet.' : n === 1 ? 'One entry.' : `${n} entries.`;
  journalCount = n;
}

function addJournalEntry(): void {
  if (!game) return;
  if (!writeEntry(game, journalText.value, Date.now())) { journalText.focus(); return; }
  journalText.value = '';
  saveJournal();
  renderJournal();
  journalText.focus();
}
$('open-journal').addEventListener('click', () => toggleJournal());
$('journal-close').addEventListener('click', () => toggleJournal(false));
$('journal-add').addEventListener('click', addJournalEntry);
journalText.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addJournalEntry(); } });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !journalEl.hidden) toggleJournal(false); });

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

/** The mute button: silences the House's sounds and the reading aloud together (Settings says which of the two it silences). */
function applyMute(): void {
  engine.setMuted(settings.muted && settings.muteAmbient);
  narrator.muted = settings.muted && settings.muteNarration;
  if (narrator.muted) narrator.cancel();
}
function paintMute(): void {
  const b = $<HTMLButtonElement>('mute');
  b.setAttribute('aria-pressed', String(settings.muted));
  const label = settings.muted ? 'Unmute the sound' : 'Mute the sound';
  b.setAttribute('aria-label', label);
  b.title = label;
}

// --- wiring -----------------------------------------------------------------------------------------------------
$('enter').addEventListener('click', () => { void enter(); });
$<HTMLFormElement>('cmd').addEventListener('submit', (e) => { e.preventDefault(); submit(input.value); input.value = ''; });
input.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp' && history.length) { hist = Math.min(history.length - 1, hist + 1); input.value = history[hist] as string; e.preventDefault(); }
  if (e.key === 'ArrowDown') { hist = Math.max(-1, hist - 1); input.value = hist >= 0 ? (history[hist] as string) : ''; e.preventDefault(); }
});
$('mute').addEventListener('click', () => { settings.muted = !settings.muted; saveSettings(settings); applyMute(); paintMute(); });

const dlg = $<HTMLDialogElement>('settings');
const aboutDlg = $<HTMLDialogElement>('about');
const carryDlg = $<HTMLDialogElement>('carry');
const iosDlg = $<HTMLDialogElement>('ios');
const againDlg = $<HTMLDialogElement>('again');
/** Show a dialog; very old browsers without the dialog element get it opened plainly. */
function openDialog(d: HTMLDialogElement): void {
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
}
function closeDialog(d: HTMLDialogElement): void {
  if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
}

// --- taking a journey to another browser, and beginning a new one --------------------------------------------------------------
let noSave = false; // set while a journey is being replaced, so that closing the page does not write the old one over it
let pending: ReturnType<typeof importText> | null = null;
const carryStatus = $('carry-status');
const carryApply = $<HTMLButtonElement>('carry-apply');

$('s-ios').addEventListener('click', () => { closeDialog(dlg); openDialog(iosDlg); });
$('ios-close').addEventListener('click', (e) => { e.preventDefault(); closeDialog(iosDlg); });
$('s-carry').addEventListener('click', () => { closeDialog(dlg); carryStatus.textContent = ''; carryApply.hidden = true; pending = null; $('carry-out').textContent = ''; openDialog(carryDlg); });
$('carry-close').addEventListener('click', (e) => { e.preventDefault(); closeDialog(carryDlg); });

function currentExport(): string | null {
  if (!game) return null;
  saveNow(true);
  return exportText(game, game.journal, readSettingsObject(), Date.now());
}
$('carry-file').addEventListener('click', () => {
  const text = currentExport();
  if (!text) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = `piranesis-house-journey-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  $('carry-out').textContent = 'A copy has been saved as a file. Keep it somewhere you will find it, and choose it in the other browser.';
});
$('carry-code').addEventListener('click', async () => {
  const text = currentExport();
  if (!text) return;
  const code = toCode(text);
  try {
    await navigator.clipboard.writeText(code);
    $('carry-out').textContent = `Copied. It is ${Math.round(code.length / 1024)} KB of text: paste it into the box in the other browser.`;
  } catch {
    $<HTMLTextAreaElement>('carry-paste').value = code;
    $('carry-out').textContent = 'Your browser would not copy it, so it is in the box below: select all of it and copy it.';
  }
});
$<HTMLInputElement>('carry-pick').addEventListener('change', async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  if (f.size > 30_000_000) { carryStatus.textContent = 'That file is far too big to be a journey.'; return; }
  $<HTMLTextAreaElement>('carry-paste').value = await f.text();
  readCarried();
});
function readCarried(): void {
  const text = $<HTMLTextAreaElement>('carry-paste').value;
  pending = importText(text);
  carryApply.hidden = true;
  if (!pending.ok) { carryStatus.textContent = pending.why; return; }
  const s = pending.transfer.save;
  const halls = Array.isArray(s.explored) ? s.explored.length : 0;
  const when = s.savedAt ? ` Saved ${new Date(s.savedAt).toLocaleString()}.` : '';
  carryStatus.textContent = `This is a journey in the world “${s.seed}”: ${halls} halls been through and ${pending.transfer.journal.length} journal ${pending.transfer.journal.length === 1 ? 'entry' : 'entries'}.${when} Bringing it here replaces what this browser keeps for that world.`;
  carryApply.hidden = false;
}
$('carry-read').addEventListener('click', readCarried);
carryApply.addEventListener('click', () => {
  if (!pending || !pending.ok) return;
  const t = pending.transfer;
  noSave = true;
  writeSave(t.save.seed, t.save);
  writeJournal(t.save.seed, t.journal);
  // the new browser behaves as the old one did, in the world the journey was in
  writeSettingsObject({ ...(readSettingsObject() ?? {}), ...(t.settings ?? {}), seed: t.save.seed });
  window.history.replaceState(null, '', `${location.pathname}${location.search}`);
  location.reload();
});

/** Begin again: forget the journey (and, if asked, the journal), and start at the First Vestibule knowing nothing. */
function askBeginAgain(): void { $<HTMLInputElement>('again-journal').checked = false; openDialog(againDlg); }
$('s-again').addEventListener('click', () => { closeDialog(dlg); askBeginAgain(); });
$('begin-again').addEventListener('click', askBeginAgain);
$('again-no').addEventListener('click', () => closeDialog(againDlg));
$('again-yes').addEventListener('click', () => {
  const seed = game ? game.opts.seed : gameOptions().seed ?? settings.seed;
  eraseSave(seed);
  if ($<HTMLInputElement>('again-journal').checked) eraseJournal(seed);
  closeDialog(againDlg);
  const q = new URLSearchParams(withoutRoom(location.hash).replace(/^#/, ''));
  window.history.replaceState(null, '', `${location.pathname}${location.search}${q.toString() ? `#${q}` : ''}`);
  if (game) { startGame(false, true); journalEl.hidden = true; input.focus(); } else paintTitle();
});

/** The title screen says so if there is a journey to go back to. */
function paintTitle(): void {
  const seed = (gameOptions().seed as string) ?? settings.seed;
  const s = summary(seed);
  const note = $('title-saved');
  const resumable = !!s && (s.halls > 0 || s.entries > 0);
  note.hidden = !resumable;
  $('begin-again').hidden = !resumable;
  $('enter').textContent = resumable ? 'Return to Piranesi’s House' : 'Enter Piranesi’s House';
  if (resumable && s) note.textContent = journeyNote(s.halls, s.entries);
}
paintTitle();
$('build').textContent = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';
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
  $<HTMLSelectElement>('s-narrate').value = settings.narrate;
  $<HTMLInputElement>('s-mute-ambient').checked = settings.muteAmbient;
  $<HTMLInputElement>('s-mute-narration').checked = settings.muteNarration;
  $<HTMLSelectElement>('s-size').value = String(settings.textScale);
  $<HTMLInputElement>('s-plain').checked = settings.plainFont;
  $<HTMLInputElement>('s-contrast').checked = settings.contrast;
  $<HTMLInputElement>('s-map').checked = settings.map;
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
    narrate: ($<HTMLSelectElement>('s-narrate').value as Settings['narrate']),
    muteAmbient: $<HTMLInputElement>('s-mute-ambient').checked,
    muteNarration: $<HTMLInputElement>('s-mute-narration').checked,
    textScale: Number($<HTMLSelectElement>('s-size').value) || 1,
    plainFont: $<HTMLInputElement>('s-plain').checked,
    contrast: $<HTMLInputElement>('s-contrast').checked,
    map: $<HTMLInputElement>('s-map').checked,
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
  applyMute();
  paintMute();
  applyNarration();
  applyReading();
  if (game && hashParams().get('pace') !== 'instant') game.opts.walkPace = paceFromKmh(settings.speedKmh);
  closeDialog(dlg);
  if (restart || restyle) {
    // carry on from the journey kept for this world (a different seed has its own): forget the old room, and a seed just replaced
    saveNow(true);
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
  if (dlg.open || aboutDlg.open || carryDlg.open || againDlg.open || iosDlg.open || !$('title').hidden) return;
  switch (e.key) {
    case '/': e.preventDefault(); input.focus(); break;
    case 'm': if (settings.map) toggleMap(); break;
    case 'j': toggleJournal(); break;
    case 'w': setWandering(!wandering); break;
    case ',': skipBack(); break;
    case '.': skipForward(); break;
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
  // no map, as in the book: the button goes, and travelling by name is only to places you know
  $('open-map').hidden = !settings.map;
  if (!settings.map && !mapEl.hidden) toggleMap(false);
  if (game) game.opts.knownOnly = !settings.map;
  if (settings.plainFont) r.setAttribute('data-plain', ''); else r.removeAttribute('data-plain');
  if (settings.contrast) r.setAttribute('data-contrast', ''); else r.removeAttribute('data-contrast');
  // A screen reader and the browser's reading voice would talk over each other: only one of them announces new text.
  logEl.setAttribute('aria-live', settings.announce && !narrator.enabled ? 'polite' : 'off');
}
applyReading();

/** Share the link to this room: the device's own share sheet where there is one, otherwise copy it. */
$('share').addEventListener('click', async () => {
  if (game && believedSpot(game) === null) {
    print([{ kind: 'system', text: 'You cannot share a place you cannot name: you do not know where you are.' }], 'end');
    return;
  }
  const url = location.href;
  const title = `${game ? shownName(game) ?? "Piranesi's House" : "Piranesi's House"} · Piranesi’s House`;
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
  narrator.enabled = (settings.narrate === 'always' || (settings.narrate === 'play' && wandering)) && narrator.supported;
  syncWalkNarration();
  narrator.rate = settings.narrateRate;
  applyReading();
  narrator.voiceURI = settings.voiceURI;
  if (!narrator.enabled) narrator.cancel();
}
applyNarration();
if (narrator.supported) window.speechSynthesis.addEventListener('voiceschanged', fillVoices);
if (!narrator.supported) {
  $<HTMLSelectElement>('s-narrate').disabled = true;
  $('s-narrate-note').textContent = 'Your browser has no speech voices to offer, so narration is unavailable.';
}
$<HTMLInputElement>('s-rate').addEventListener('input', (e) => { $('s-rate-out').textContent = `${Number((e.target as HTMLInputElement).value).toFixed(1)}×`; });

// Wander: the visitor lets the House carry them. It describes, listens, looks at a statue, and moves on, for ever,
// until any key is typed or the button is pressed again. It waits for the reading to finish (or a reading-time pause).
/** Paused in the middle of a reading: pressing Play begins that passage again, as an audiobook does. */
let rereadOnPlay = false;
/** Narrated walking (no times, walks described as they go) whenever the House is being read aloud or is wandering on its own. */
function syncWalkNarration(): void {
  if (game) game.opts.walkNarration = narrator.enabled || wandering;
}
function paintPlay(): void {
  const b = $('wander');
  b.dataset.playing = String(wandering);
  const label = wandering ? 'Pause: stop wandering and reading here' : 'Play: let the House carry you, reading as you go';
  b.setAttribute('aria-label', label);
  b.title = label;
  b.querySelector('.lbl')!.textContent = wandering ? 'Pause' : 'Play';
}
function setWandering(on: boolean): void {
  const was = wandering;
  if (!on && was) rereadOnPlay = narrator.busy;
  wandering = on && game !== null;
  if (wandering) {
    if (!was) {
      rereadOnPlay = rereadOnPlay && playlist.current() !== null;
      print([{ kind: 'system', text: 'You let your feet choose. Press Pause, or type anything, to stop.' }], 'end');
    }
  }
  applyNarration();
  syncWalkNarration();
  paintPlay();
  if (!wandering) narrator.cancel();
  else if (rereadOnPlay) { rereadOnPlay = false; replay(playlist.current(), false); }
  else if (!was && game) {
    // Nothing to wait for: take the first step now, inside the tap, because some browsers (iOS) only let a page start speaking from one.
    lastPrintMs = Date.now() - 1e9;
    if (!game.walk && !playlist.replaying) submit(chooseWander(game, Math.random), true);
  }
}

/** Read an earlier passage again, and show where it is in the log. */
function replay(p: { text: string; tag: HTMLElement } | null, scroll = true): void {
  if (!p) return;
  logEl.querySelectorAll('.reading').forEach((e) => e.classList.remove('reading'));
  p.tag.classList.add('reading');
  if (scroll) logEl.scrollTop = p.tag.offsetTop - logEl.offsetTop - 8;
  passageStartMs = Date.now();
  lastPrintMs = Date.now();
  lastPrintChars = p.text.length;
  narrator.cancel();
  narrator.speak(p.text);
}
function skipBack(): void {
  replay(playlist.back(Date.now() - passageStartMs));
}
function skipForward(): void {
  const next = playlist.forward();
  if (next) { replay(next); return; }
  // at the live end there is nothing already read to go on to: cut the reading short and let the House move on
  logEl.querySelectorAll('.reading').forEach((e) => e.classList.remove('reading'));
  narrator.cancel();
  narrator.lastBusyMs = 0;
  lastPrintMs = Date.now() - 1e9;
  if (game && !game.walk) submit(chooseWander(game, Math.random), true);
}
$('wander').addEventListener('click', () => setWandering(!wandering));
$('prev').addEventListener('click', skipBack);
$('next').addEventListener('click', skipForward);
// The House is heard with the page in front, and the screen kept awake while it plays (the wake lock below). A page that has gone
// to the background cannot be controlled (browsers, iPhones above all, let speech run on with no way to stop it), so going to the
// background pauses: nothing is spoken that cannot be paused.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden') return;
  if (wandering) setWandering(false);
  narrator.cancel();
});
input.addEventListener('input', () => { if (wandering) setWandering(false); });
// Keep the screen awake while wandering or while something is being read aloud.
setInterval(() => screenWake.want(wandering || narrator.busy), 1000);
// If a browser never reports the end of the speech, take the sound back anyway.
setInterval(() => { if (engine.yielding && !narrator.busy) engine.yieldToSpeech(false); }, 1000);
/** Has the current passage been heard out (or, with no voice, given time enough to read)? */
function readingDone(): boolean {
  if (narrator.active) return !narrator.busy && Date.now() - narrator.lastBusyMs >= 1800;
  return Date.now() - lastPrintMs >= dwellMs(lastPrintChars);
}
setInterval(() => {
  if (!game) return;
  // A replayed passage has ended: on to the next, and when the live end is reached, back to the House as it is.
  if (playlist.replaying) {
    if (readingDone()) {
      const next = playlist.finished();
      if (next) replay(next);
      else logEl.querySelectorAll('.reading').forEach((e) => e.classList.remove('reading'));
    }
    return;
  }
  if (!wandering || game.walk) return;
  // With narration on, never move until the reading has finished, then leave a breath. Otherwise a reading-time pause.
  if (!readingDone()) return;
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
paintPlay();
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

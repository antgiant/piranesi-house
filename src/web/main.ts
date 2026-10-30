// The web front end: title screen, text log with clickable links, command line, settings, live events and sound.
// No network use, no external services: everything runs from the page.

import { audioFor } from '../audio/director';
import { AudioEngine } from '../audio/engine';
import { look, newGame, sceneNow, step, tick, walkStatus, type Game, type GameOptions, type Line } from '../game/game';
import { describeDuration } from '../game/walk';
import { formatClock } from '../sim/time';

interface Settings {
  volume: number;
  muted: boolean;
  timeScale: number;
  showDead: boolean;
  diary: boolean;
  seed: string;
  pace: 'real' | 'brisk' | 'fast' | 'instant';
}
const DEFAULTS: Settings = { volume: 80, muted: false, timeScale: 1, showDead: true, diary: false, seed: 'the-house', pace: 'real' };
const PACE = { real: 1, brisk: 4, fast: 20, instant: Infinity } as const;
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
    style: settings.diary ? 'diary' : 'plain',
    walkPace: PACE[(q.get('pace') as keyof typeof PACE) in PACE ? (q.get('pace') as keyof typeof PACE) : settings.pace],
  };
  const at = q.get('at');
  if (at && !Number.isNaN(Date.parse(at))) opts.startAtWorldMs = Date.parse(at) - Date.UTC(2026, 0, 1);
  return opts;
}

/** Show lines. By default the log scrolls to the start of the new text, so you read a description from its first line. */
function print(lines: Line[], scroll: 'start' | 'end' = 'start'): void {
  const mark = logEl.lastElementChild;
  for (const l of lines) {
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
  const a = audioFor(game.world, s);
  engine.setScene(a);
  $('place').textContent = s.hall.name;
  const ws = walkStatus(game, now);
  $('clock').textContent = ws ? `${formatClock(s.clock)} · walking: ${describeDuration(ws.remainingWorldS)} to go` : formatClock(s.clock);
}

function submit(raw: string): void {
  if (!game) return;
  const cmd = raw.trim();
  const echoEl = echo(cmd || 'look');
  if (cmd) { history.unshift(cmd); hist = -1; }
  const before = `${game.pos.x},${game.pos.y},${game.pos.level}`;
  const out = step(game, cmd, Date.now());
  print(out);
  logEl.scrollTop = echoEl.offsetTop - logEl.offsetTop - 8;
  refresh();
  // An instant move (pace "instant", or a very short walk) gets a few footsteps; a real walk gets them continuously below.
  const moved = before !== `${game.pos.x},${game.pos.y},${game.pos.level}`;
  if (moved && !game.walk && engine.started) {
    const surface = audioFor(game.world, sceneNow(game, Date.now())).surface;
    for (let i = 0; i < 4; i++) setTimeout(() => engine.footstep(surface), i * 380);
  }
}

function startGame(): void {
  game = newGame(gameOptions(), Date.now());
  logEl.textContent = '';
  print([{ kind: 'system', text: 'You arrive. Type "help" at any time, or use the buttons under each description.' }]);
  print(look(game, Date.now()));
  refresh();
  if (hashParams().has('debug')) {
    const g = game;
    (window as unknown as Record<string, unknown>).__house = {
      game: g, engine,
      teleport(x: number, y: number, level: 0 | 1 | 2) { g.pos = { x, y, level, wall: null, pos: 500 }; print(look(g, Date.now())); refresh(); },
      audio() { return audioFor(g.world, sceneNow(g, Date.now())); },
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
  $<HTMLSelectElement>('s-scale').value = String(settings.timeScale);
  $<HTMLSelectElement>('s-pace').value = settings.pace;
  $<HTMLInputElement>('s-seed').value = settings.seed;
}
$('open-settings').addEventListener('click', () => { fillSettings(); dlg.showModal(); });
$('s-cancel').addEventListener('click', () => dlg.close());
$<HTMLInputElement>('s-volume').addEventListener('input', (e) => engine.setVolume(Number((e.target as HTMLInputElement).value) / 100));
$('s-save').addEventListener('click', (e) => {
  e.preventDefault();
  const next: Settings = {
    volume: Number($<HTMLInputElement>('s-volume').value),
    muted: settings.muted,
    showDead: $<HTMLInputElement>('s-dead').checked,
    diary: $<HTMLInputElement>('s-diary').checked,
    timeScale: Number($<HTMLSelectElement>('s-scale').value) || 1,
    seed: $<HTMLInputElement>('s-seed').value.trim() || DEFAULTS.seed,
    pace: $<HTMLSelectElement>('s-pace').value as Settings['pace'],
  };
  const restart = next.showDead !== settings.showDead || next.timeScale !== settings.timeScale || next.seed !== settings.seed;
  const restyle = next.diary !== settings.diary;
  settings = next;
  saveSettings(settings);
  engine.setVolume(settings.volume / 100);
  if (game) game.opts.walkPace = PACE[settings.pace];
  dlg.close();
  if (restart || restyle) { startGame(); input.focus(); }
});

paintMute();
setInterval(() => {
  if (!game) return;
  const wasWalking = game.walk !== null;
  const lines = tick(game, Date.now());
  if (lines.length) print(lines, wasWalking && game.walk === null ? 'start' : 'end');
  refresh();
}, 1000);

// While walking, a footstep every half second or so (about 2 steps a second at a stride of 0.75 m).
setInterval(() => {
  if (!game || !game.walk || !engine.started) return;
  engine.footstep(audioFor(game.world, sceneNow(game, Date.now())).surface);
}, 520);

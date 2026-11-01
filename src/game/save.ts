// Keeping a journey: what the visitor has found, marked and written, and where they are, as plain data that can be stored in the
// browser, carried to another browser, and read back. Everything is validated on the way in, since a file or pasted text may be
// damaged or hand-edited; anything that does not fit is dropped, never trusted.

import type { Level, Side } from '../world/layout';
import type { Game, Position } from './game';
import type { TrailEntry } from './lost';
import type { Spot } from './travel';

export const SAVE_VERSION = 1;
export const EXPORT_FORMAT = 'piranesis-house-journey';
const MAX_ENTRY_CHARS = 20_000;
const MAX_ENTRIES = 2_000;

/** A page of the journal. */
export interface JournalEntry {
  id: string;
  /** When it was written, by the clock on the visitor's device (ms). */
  at: number;
  /** When it was written in the House, as words ("about nine in the morning, in summer"), and where. */
  when: string;
  hall: string;
  level: Level;
  text: string;
  /** Set if it was changed afterwards. */
  edited?: number;
}

/** Where you are and what you know. The journal is kept apart (it outlives beginning again). */
export interface SaveData {
  version: number;
  seed: string;
  savedAt: number;
  pos: Position;
  facing: Side;
  explored: string[];
  found: [string, { label: string; hall: string }][];
  marks: [string, { x: number; y: number; level: Level; hall: string }][];
  visits: [string, number][];
  passes: [string, number][];
  trail: TrailEntry[];
  trailOrigin: Spot;
  recalls: number;
  told: [string, string[]][];
}

const SIDES = ['N', 'E', 'S', 'W'];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, lo = -1e6, hi = 1e6): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const isStr = (v: unknown, max = 500): v is string => typeof v === 'string' && v.length <= max;
const isLevel = (v: unknown): v is Level => v === 0 || v === 1 || v === 2;
const isSide = (v: unknown): v is Side => typeof v === 'string' && SIDES.includes(v);

function spot(v: unknown): Spot | null {
  return isObj(v) && isInt(v.x) && isInt(v.y) && isLevel(v.level) ? { x: v.x, y: v.y, level: v.level } : null;
}

export function toSave(g: Game, now: number): SaveData {
  return {
    version: SAVE_VERSION,
    seed: g.opts.seed,
    savedAt: now,
    pos: { ...g.pos },
    facing: g.facing,
    explored: [...g.explored],
    found: [...g.found],
    marks: [...g.marks],
    visits: [...g.visits],
    passes: [...g.passes],
    trail: g.trail.map((t) => ({ ...t })),
    trailOrigin: { ...g.trailOrigin },
    recalls: g.recalls,
    // only the latest of what has been said of each hall is worth keeping
    told: [...g.told].slice(-300).map(([k, v]) => [k, [...v.keys].slice(-40)]),
  };
}

/** Read stored data back into a game, keeping only what is well-formed. Returns false if it is not a usable save at all. */
export function applySave(g: Game, raw: unknown): boolean {
  if (!isObj(raw) || raw.version !== SAVE_VERSION) return false;
  const p = isObj(raw.pos) ? raw.pos : null;
  if (!p || !isInt(p.x) || !isInt(p.y) || !isLevel(p.level)) return false;
  g.pos = { x: p.x, y: p.y, level: p.level, wall: isSide(p.wall) ? p.wall : null, pos: isInt(p.pos, 0, 1000) ? p.pos : 500 };
  if (isSide(raw.facing)) g.facing = raw.facing;
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice(0, 200_000) : []);
  g.explored = new Set(list(raw.explored).filter((k): k is string => isStr(k, 30) && /^[012]:-?\d+,-?\d+$/.test(k)));
  g.found = new Map();
  for (const e of list(raw.found)) if (Array.isArray(e) && isStr(e[0], 80) && isObj(e[1]) && isStr(e[1].label) && isStr(e[1].hall)) g.found.set(e[0], { label: e[1].label, hall: e[1].hall });
  g.marks = new Map();
  for (const e of list(raw.marks)) {
    if (Array.isArray(e) && isStr(e[0], 80) && isObj(e[1]) && isInt(e[1].x) && isInt(e[1].y) && isLevel(e[1].level) && isStr(e[1].hall)) g.marks.set(e[0], { x: e[1].x, y: e[1].y, level: e[1].level, hall: e[1].hall });
  }
  const counts = (v: unknown): Map<string, number> => {
    const m = new Map<string, number>();
    for (const e of list(v)) if (Array.isArray(e) && isStr(e[0], 80) && isInt(e[1], 0, 1e6)) m.set(e[0], e[1]);
    return m;
  };
  const visits = counts(raw.visits);
  if (visits.size) g.visits = visits;
  g.passes = counts(raw.passes);
  g.trail = [];
  for (const t of list(raw.trail)) {
    if (!isObj(t)) continue;
    const from = spot(t.from), to = spot(t.to);
    if (!from || !to || (t.via !== 'door' && t.via !== 'stairs')) continue;
    g.trail.push({ from, to, via: t.via, inSide: isSide(t.inSide) ? t.inSide : undefined, inOrd: isInt(t.inOrd, 0, 1000) ? t.inOrd : undefined, inOf: isInt(t.inOf, 0, 1000) ? t.inOf : undefined, dir: t.dir === 'up' || t.dir === 'down' ? t.dir : undefined });
  }
  g.trailOrigin = spot(raw.trailOrigin) ?? { x: 0, y: 0, level: 1 };
  g.recalls = isInt(raw.recalls, 0, 1e9) ? raw.recalls : 0;
  g.told = new Map();
  for (const e of list(raw.told)) if (Array.isArray(e) && isStr(e[0], 40) && Array.isArray(e[1])) g.told.set(e[0], { keys: new Set(e[1].filter((k): k is string => isStr(k, 200))), at: 0 });
  return true;
}

export function cleanJournal(raw: unknown): JournalEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: JournalEntry[] = [];
  for (const e of raw.slice(0, MAX_ENTRIES)) {
    if (!isObj(e) || !isStr(e.id, 60) || typeof e.at !== 'number' || !isStr(e.text, MAX_ENTRY_CHARS) || !isStr(e.when, 200) || !isStr(e.hall, 200) || !isLevel(e.level)) continue;
    out.push({ id: e.id, at: e.at, when: e.when, hall: e.hall, level: e.level, text: e.text, edited: typeof e.edited === 'number' ? e.edited : undefined });
  }
  return out;
}

// --- carrying a journey to another browser ---------------------------------------------------------------------------------

export interface Transfer {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: number;
  save: SaveData;
  journal: JournalEntry[];
  /** The visitor's settings, so the new browser behaves the same. Not required. */
  settings?: Record<string, unknown>;
}

/** A small checksum, to notice a file that has been cut short or damaged. Not a security measure. */
export function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function exportText(g: Game, journal: JournalEntry[], settings: Record<string, unknown> | undefined, now: number): string {
  const t: Transfer = { format: EXPORT_FORMAT, version: SAVE_VERSION, exportedAt: now, save: toSave(g, now), journal, settings };
  const body = JSON.stringify(t);
  return JSON.stringify({ check: checksum(body), body });
}

export type ImportResult = { ok: true; transfer: Transfer } | { ok: false; why: string };

/** Read a transfer file or code back. Accepts the file's text, or a pasted code (`HOUSE1:` and base64 of the same text). */
export function importText(text: string): ImportResult {
  let s = text.trim();
  if (s.startsWith('HOUSE1:')) {
    try { s = decodeURIComponent(escape(atob(s.slice(7).replace(/\s+/g, '')))); } catch { return { ok: false, why: 'That code is damaged: it could not be read.' }; }
  }
  let outer: unknown;
  try { outer = JSON.parse(s); } catch { return { ok: false, why: 'That does not look like a journey from this House: it could not be read.' }; }
  if (!isObj(outer) || !isStr(outer.body, 50_000_000) || !isStr(outer.check, 16)) return { ok: false, why: 'That does not look like a journey from this House.' };
  if (checksum(outer.body) !== outer.check) return { ok: false, why: 'That copy of a journey is damaged, or was cut short, so it cannot be trusted.' };
  let t: unknown;
  try { t = JSON.parse(outer.body); } catch { return { ok: false, why: 'That journey could not be read.' }; }
  if (!isObj(t) || t.format !== EXPORT_FORMAT) return { ok: false, why: 'That is not a journey from this House.' };
  if (t.version !== SAVE_VERSION) return { ok: false, why: 'That journey was kept by a different version of the House, and cannot be read here.' };
  if (!isObj(t.save) || !isStr(t.save.seed, 80)) return { ok: false, why: 'That journey has no usable record of where you were.' };
  return { ok: true, transfer: { format: EXPORT_FORMAT, version: SAVE_VERSION, exportedAt: typeof t.exportedAt === 'number' ? t.exportedAt : 0, save: t.save as unknown as SaveData, journal: cleanJournal(t.journal), settings: isObj(t.settings) ? t.settings : undefined } };
}

/** The same as a short text a person can copy and paste: for browsers or devices where a file is awkward. */
export function toCode(exported: string): string {
  return `HOUSE1:${btoa(unescape(encodeURIComponent(exported)))}`;
}

// --- the journal itself ----------------------------------------------------------------------------------------------------

export function newEntryId(now: number, n: number): string {
  return `${now.toString(36)}-${n.toString(36)}`;
}
export { MAX_ENTRY_CHARS };

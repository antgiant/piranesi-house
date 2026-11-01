// What the page keeps in the browser's own storage, and nothing else. Every read and write can fail (storage blocked, full, or turned
// off in a private window), so every one is guarded and the page works without it.

import { cleanJournal, type JournalEntry, type SaveData } from '../game/save';

const SAVE = (seed: string): string => `the-house.save.v1.${seed}`;
const JOURNAL = (seed: string): string => `the-house.journal.v1.${seed}`;
const SETTINGS = 'the-house.settings.v1';

export function readSave(seed: string): unknown {
  try { const raw = localStorage.getItem(SAVE(seed)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
/** Returns false if it could not be kept (storage full or blocked). */
export function writeSave(seed: string, data: SaveData): boolean {
  try { localStorage.setItem(SAVE(seed), JSON.stringify(data)); return true; } catch { return false; }
}
export function readJournal(seed: string): JournalEntry[] {
  try { const raw = localStorage.getItem(JOURNAL(seed)); return raw ? cleanJournal(JSON.parse(raw)) : []; } catch { return []; }
}
export function writeJournal(seed: string, entries: JournalEntry[]): boolean {
  try { localStorage.setItem(JOURNAL(seed), JSON.stringify(entries)); return true; } catch { return false; }
}
export function eraseSave(seed: string): void {
  try { localStorage.removeItem(SAVE(seed)); } catch { /* ignore */ }
}
export function eraseJournal(seed: string): void {
  try { localStorage.removeItem(JOURNAL(seed)); } catch { /* ignore */ }
}
/** The old per-seed lists of found things and marks, before they were part of a save. */
export function readLegacy(seed: string): { found: unknown; marks: unknown } {
  const get = (k: string): unknown => { try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; } catch { return null; } };
  return { found: get(`the-house.found.v1.${seed}`), marks: get(`the-house.marks.v1.${seed}`) };
}
export function readSettingsObject(): Record<string, unknown> | undefined {
  try { const raw = localStorage.getItem(SETTINGS); const v = raw ? JSON.parse(raw) : undefined; return v && typeof v === 'object' ? v : undefined; } catch { return undefined; }
}
export function writeSettingsObject(s: Record<string, unknown>): void {
  try { localStorage.setItem(SETTINGS, JSON.stringify(s)); } catch { /* ignore */ }
}

/** A short account of a kept journey, for the title screen. */
export function summary(seed: string): { halls: number; entries: number; savedAt: number } | null {
  const save = readSave(seed) as { explored?: unknown[]; savedAt?: number; version?: number } | null;
  const entries = readJournal(seed).length;
  if (!save || save.version !== 1) return entries ? { halls: 0, entries, savedAt: 0 } : null;
  return { halls: Array.isArray(save.explored) ? save.explored.length : 0, entries, savedAt: typeof save.savedAt === 'number' ? save.savedAt : 0 };
}

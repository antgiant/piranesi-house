// The sounds of the House, one kind at a time, so any of them can be turned off (Settings, "Choose which sounds to hear"). With every one on, nothing changes. With
// some off, the House is a soundscape of what is left: standing in one place and listening to it change over time, or gliding silently through the halls.
//
// The scene the director makes is masked, not the engine's voices: a switched-off kind is a scene in which it is absent, so the narrator (which reads the same scene)
// is not affected, and nothing that is later added needs to know.

import type { AudioScene } from './director';

export const ELEMENTS = ['sea', 'falls', 'rain', 'drips', 'wind', 'thunder', 'birds', 'footsteps', 'doorways'] as const;
export type Element = (typeof ELEMENTS)[number];
export type Elements = Record<Element, boolean>;

export const ELEMENT_LABELS: Record<Element, { label: string; note: string }> = {
  sea: { label: 'The sea and the tides', note: 'waves, foam, the booming of the tide, the sea heard through the walls' },
  falls: { label: 'Falling and running water', note: 'waterfalls, streams, water on the stairs' },
  rain: { label: 'Rain', note: 'on the stone and on the water' },
  drips: { label: 'Drips', note: 'single drops from the ceiling and the statues' },
  wind: { label: 'Wind', note: 'gusts and the whistling in the statues' },
  thunder: { label: 'Thunder', note: '' },
  birds: { label: 'Birds', note: 'calls, wings, flocks' },
  footsteps: { label: 'Your footsteps', note: '' },
  doorways: { label: 'The next halls, heard through the doorways', note: 'what drifts in from beyond' },
};

export const allOn = (): Elements => Object.fromEntries(ELEMENTS.map((e) => [e, true])) as Elements;

/** Merge a stored setting (which may lack newer kinds, or be nonsense) into the full set: anything not said is on. */
export function parseElements(raw: unknown): Elements {
  const out = allOn();
  if (raw && typeof raw === 'object') for (const e of ELEMENTS) { const v = (raw as Record<string, unknown>)[e]; if (typeof v === 'boolean') out[e] = v; }
  return out;
}

/** The scene with the switched-off kinds taken out. Returns the same scene if nothing is off. */
export function maskScene(scene: AudioScene, on: Elements): AudioScene {
  if (ELEMENTS.every((e) => on[e])) return scene;
  const s: AudioScene = { ...scene };
  if (!on.sea) { s.sea = { ...s.sea, gain: 0 }; s.tide = { ...s.tide, kind: 'none', gain: 0 }; }
  if (!on.falls) { s.falls = { ...s.falls, gain: 0, amount: 0 }; s.stream = undefined; s.stairs = { ...s.stairs, flow: 0 }; }
  if (!on.rain) s.rain = { ...s.rain, gain: 0 };
  if (!on.drips) s.leaks = [];
  if (!on.wind) s.wind = { ...s.wind, gain: 0, whistle: 0 };
  if (!on.thunder) s.thunder = 0;
  if (!on.birds) s.birds = { ...s.birds, perMinute: 0 };
  if (!on.doorways) { s.portals = []; s.beds = []; }
  else if (!on.sea || !on.falls || !on.birds) {
    // the halls next door carry the same kinds of sound; the kinds that are off are off there too
    s.portals = s.portals.map((p) => ({ ...p, tide: !on.sea ? { ...p.tide, kind: 'none', gain: 0 } : p.tide, birds: !on.birds ? { ...p.birds, perMinute: 0 } : p.birds, falls: !on.falls ? 0 : p.falls, rain: !on.rain ? 0 : p.rain }));
    s.beds = s.beds.map((b) => ({ ...b, sea: !on.sea ? 0 : b.sea, falls: !on.falls ? 0 : b.falls }));
  }
  return s;
}

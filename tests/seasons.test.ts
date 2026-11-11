import { describe, expect, it } from 'vitest';
import { speciesFor } from '../src/audio/engine';
import { birdSeason } from '../src/sim/seasons';
import { sceneAtWorldTime } from '../src/sim/scene';
import { dailyTempSwing, weatherAt } from '../src/sim/weather';
import { MS, clock, sunTimes } from '../src/sim/time';
import { relicsIn, TIDAL_DAY_MS } from '../src/world/relics';
import { createWorld } from '../src/world/world';
import { getHall } from '../src/world/hall';
import { nearbyVestibules } from '../src/world/tidegeo';
import { lightSentence } from '../src/game/narrator';
import { birdSentence, relicsProse } from '../src/game/narrator';

const w = createWorld('the-house');
const day = (d: number, hour = 12): number => (d - 1) * MS.day + hour * MS.hour;

describe('the year in the birds', () => {
  it('has the swifts arrive in spring, stay for the summer and leave, and the waders the other way round', () => {
    expect(birdSeason(100).swifts).toBe(false);
    expect(birdSeason(160).swifts).toBe(true);
    expect(birdSeason(260).swifts).toBe(false);
    expect(birdSeason(20).waders).toBe(true);
    expect(birdSeason(180).waders).toBe(false);
    expect(birdSeason(300).waders).toBe(true);
  });
  it('has song in spring and early summer, owls in the cold months, and chicks in June and July', () => {
    expect(birdSeason(100).songbirds).toBe(true);
    expect(birdSeason(300).songbirds).toBe(false);
    expect(birdSeason(330).owls).toBe(true);
    expect(birdSeason(180).owls).toBe(false);
    expect(birdSeason(170).chicks).toBe(true);
    expect(birdSeason(250).chicks).toBe(false);
    expect(birdSeason(225).fledglings).toBe(true);
  });
  it('wraps and clamps the day of the year', () => {
    expect(birdSeason(366)).toEqual(birdSeason(1));
    expect(birdSeason(0)).toEqual(birdSeason(365));
  });
  it('puts the right voices in each season', () => {
    const summer = birdSeason(170), winter = birdSeason(330);
    expect(speciesFor('soaring', summer)).toContain('swift');
    expect(speciesFor('soaring', winter)).not.toContain('swift');
    expect(speciesFor('shore', winter)).toContain('wader');
    expect(speciesFor('shore', summer)).not.toContain('wader');
    expect(speciesFor('foraging', summer)).toContain('blackbird');
    expect(speciesFor('foraging', winter)).not.toContain('blackbird');
    expect(speciesFor('roosting', winter)).toContain('owl');
    expect(speciesFor('roosting', summer)).not.toContain('owl');
    expect(speciesFor('nesting', summer)).toContain('chick');
    expect(speciesFor('nesting', birdSeason(100))).toEqual(['gull']);
    expect(speciesFor('foraging', summer)).toContain('chick');
    // something always remains to be heard
    for (const m of ['soaring', 'shore', 'roosting', 'foraging'] as const) expect(speciesFor(m, winter).length).toBeGreaterThan(0);
  });
  it('is carried in the scene: the gull colony has chicks in June and none in October, and the narration says so', () => {
    const colony = (() => { for (let x = -60; x < 60; x++) for (let y = -60; y < 60; y++) { const h = getHall(w, x, y, 1); if (h.tags.includes('gull-colony')) return h; } return null; })();
    if (!colony) return;
    const june = sceneAtWorldTime(w, colony.x, colony.y, 1, day(170, 12));
    const oct = sceneAtWorldTime(w, colony.x, colony.y, 1, day(290, 12));
    if (june.birds.mode === 'nesting') {
      expect(june.birds.season.chicks).toBe(true);
      expect(birdSentence(june)).toMatch(/chicks/);
    }
    expect(oct.birds.mode).not.toBe('nesting');
  });
  it('has the dawn chorus louder than midday in song season', () => {
    let louder = 0, n = 0;
    for (let x = -8; x <= 8; x++) for (let y = -8; y <= 8; y++) {
      const h = getHall(w, x, y, 1);
      if (!h.birdPerches) continue;
      const dawn = sceneAtWorldTime(w, x, y, 1, day(120, 0) + (sunTimes(120).sunrise - 10) * MS.min, { forecast: false });
      const noon = sceneAtWorldTime(w, x, y, 1, day(120, 13), { forecast: false });
      if (dawn.birds.mode === 'foraging' && noon.birds.mode === 'foraging') { n++; if (dawn.birds.loudness > noon.birds.loudness) louder++; }
    }
    expect(n).toBeGreaterThan(0);
    expect(louder).toBe(n);
  });
  void lightSentence;
});

describe('the climate', () => {
  it('is colder at night than in the afternoon, by more in summer than in winter', () => {
    expect(dailyTempSwing(15 * 60, 'summer')).toBeGreaterThan(dailyTempSwing(3 * 60, 'summer'));
    expect(dailyTempSwing(15 * 60, 'summer') - dailyTempSwing(3 * 60, 'summer')).toBeGreaterThan(dailyTempSwing(15 * 60, 'winter') - dailyTempSwing(3 * 60, 'winter'));
    expect(dailyTempSwing(15 * 60, 'winter')).toBe(25);
    expect(dailyTempSwing(3 * 60, 'winter')).toBe(-25);
  });
  it('rains more in autumn and winter than in summer, and thunders in summer, hardly in winter', () => {
    let rainy = { winter: 0, summer: 0, autumn: 0 } as Record<string, number>;
    let thunder = { winter: 0, summer: 0 } as Record<string, number>;
    let samples = 0;
    for (let d = 0; d < 365 * 3; d++) for (const h of [3, 9, 15, 21]) {
      const t = d * MS.day + h * MS.hour;
      const wx = weatherAt(w, t);
      const s = clock(t).season;
      if (wx.rain > 0 && s in rainy) rainy[s]!++;
      if (wx.lightning && s in thunder) thunder[s]!++;
      samples++;
    }
    expect(samples).toBeGreaterThan(4000);
    expect(rainy.autumn! + rainy.winter!).toBeGreaterThan(rainy.summer! * 1.2);
    expect(thunder.summer!).toBeGreaterThanOrEqual(thunder.winter!);
  });
  it('snows only when it is cold, and gets frost on winter nights more than winter afternoons', () => {
    let night = 0, afternoon = 0;
    for (let d = 355; d < 365 + 50; d++) {
      const dd = d % 365;
      if (weatherAt(w, dd * MS.day + 4 * MS.hour).frost) night++;
      if (weatherAt(w, dd * MS.day + 15 * MS.hour).frost) afternoon++;
    }
    expect(night).toBeGreaterThanOrEqual(afternoon);
    for (let t = 0; t < 400 * MS.day; t += 5 * MS.hour) { const x = weatherAt(w, t); if (x.precip === 'snow') expect(x.tempTenths).toBeLessThanOrEqual(10); }
  });
});

describe('the tide rearranges what lies about', () => {
  const near = (() => { for (let x = -6; x <= 6; x++) for (let y = -6; y <= 6; y++) { const h = getHall(w, x, y, 1); if (h.regions.drowned) continue; let r = 9; for (const v of nearbyVestibules(w, x, y)) r = Math.min(r, v.rooms); if (r === 1) return h; } return null; })();
  it('washes up flotsam in halls the water reaches, differently from one tide to the next, and none in dry halls', () => {
    expect(near).not.toBeNull();
    let seen = 0;
    const sigs = new Set<string>();
    for (let e = 1000; e < 1060; e++) {
      const r = relicsIn(w, near!, 6, 1, e);
      if (r.some((x) => x.kind === 'flotsam')) seen++;
      sigs.add(r.map((x) => `${x.id}@${x.wall}${x.pos}`).join('|'));
    }
    expect(seen).toBeGreaterThan(10);
    expect(sigs.size).toBeGreaterThan(20);
    // far from the sea nothing is moved or washed up
    const dry = (() => { for (let x = 30; x < 90; x++) for (let y = 30; y < 90; y++) { const h = getHall(w, x, y, 1); if (h.regions.drowned) continue; let r = 9; for (const v of nearbyVestibules(w, x, y)) r = Math.min(r, v.rooms); if (r > 3) return h; } return null; })();
    expect(dry).not.toBeNull();
    for (let e = 1000; e < 1030; e++) expect(relicsIn(w, dry!, 6, 1, e).filter((x) => x.kind === 'flotsam')).toEqual([]);
  });
  it('is the same for everyone at the same tide, and unchanged when no tide is given', () => {
    expect(relicsIn(w, near!, 6, 1, 1234)).toEqual(relicsIn(w, near!, 6, 1, 1234));
    expect(relicsIn(w, near!, 6, 1).filter((x) => x.kind === 'flotsam')).toEqual([]);
  });
  it('can move or carry off a loose article, but never a chalk mark or the old sleeping bag', () => {
    const first = getHall(w, 0, 0, 1);
    const baseline = relicsIn(w, first, 6, 1).filter((x) => x.kind === 'old-sleeping-bag');
    for (let e = 2000; e < 2040; e++) expect(relicsIn(w, first, 6, 1, e).filter((x) => x.kind === 'old-sleeping-bag')).toEqual(baseline);
  });
  it('says in the prose that the tide left it, not that someone did long ago', () => {
    let said = 0;
    for (let e = 1000; e < 1100; e++) {
      const r = relicsIn(w, near!, 6, 1, e).filter((x) => x.kind === 'flotsam');
      if (!r.length) continue;
      const p = relicsProse(r, () => 0.3);
      expect(p).toMatch(/left by the tide/);
      expect(p).not.toMatch(/very long time ago/);
      said++;
    }
    expect(said).toBeGreaterThan(5);
  });
  it('has a tidal day of about twelve and a half hours', () => {
    expect(TIDAL_DAY_MS / MS.hour).toBeCloseTo(12.42, 1);
  });
});

import { birdLines, plantLines } from '../src/game/nature';

describe('growing things and creatures by season', () => {
  const rnd = (): number => 0.4;
  it('has different growth in each season, and none in the drowned halls or the dark', () => {
    const lines = new Map<string, string>();
    for (const [name, d] of [['spring', 110], ['summer', 190], ['autumn', 290], ['winter', 20]] as const) {
      const sc = sceneAtWorldTime(w, 2, 3, 1, day(d, 12), { forecast: false });
      const l = plantLines(sc.hall, sc, rnd);
      expect(l.length, name).toBeGreaterThan(0);
      lines.set(name, l[0] as string);
    }
    expect(new Set(lines.values()).size).toBe(4);
    const dark = sceneAtWorldTime(w, -192, 0, 1, day(190, 12), { forecast: false });
    expect(plantLines(dark.hall, dark, rnd)).toEqual([]);
  });
  it('never mentions swifts out of season, nor a singing blackbird in autumn', () => {
    for (let d = 1; d <= 365; d += 7) {
      for (const lvl of [1, 2] as const) {
        const sc = sceneAtWorldTime(w, 5, 5, lvl, day(d, 12), { forecast: false });
        for (let i = 0; i < 6; i++) for (const l of birdLines(sc.hall, sc, () => i / 6)) {
          if (!sc.birds.season.swifts) expect(l).not.toMatch(/Swifts/);
          if (!sc.birds.season.songbirds) expect(l).not.toMatch(/blackbird sings/);
          if (!sc.birds.season.waders) expect(l).not.toMatch(/little wader/);
        }
      }
    }
  });
});

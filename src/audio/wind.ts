// Wind (design/wind.md). Not a point source and not a steady hiss: air moving over the House makes noise wherever it meets something, so it is
//   * BROAD AND ALL ROUND: five independent beds (front pair, rear pair, overhead) in the shared ring, each gusting on its own, so a gust sweeps across the
//     listener instead of pumping in the middle of the head;
//   * DEEPER WITH SPEED: a low roar always, a mid rush that opens up as it blows, a hiss that only comes in a strong wind; the loudness rises steeply with
//     speed (aerodynamic noise goes with about the fifth power of it) and the gusting deepens as it blows harder;
//   * GUSTS THAT ARE DEEP, SLOW AND COMMON: measured on a recording from a castle tower in a mistral (design/wind.md), the level swings 13-18 dB between its
//     quiet and its loud moments, in every band together, and takes a few seconds to change; one gust is shared by all the beds, with a smaller share of its own in each;
//   * MOANING IN THE STONE: the openings of a tower or hall ring at fixed low pitches (about 200 and 300 Hz) that swell with the gusts: what the real wind does most;
//   * WHISTLING WHERE IT PASSES EDGES: an edge or a rod sheds vortices at a rate that follows the wind (Strouhal: frequency = 0.2 x speed / thickness),
//     so a statue's whistle rises and falls with each gust. Three of them, each at its own place in the hall.

import { waterBuffer } from './buffers';
import { AROUND, polar, type Vec3 } from './spatial';

export interface WindScene {
  /** Loudness already weighed by shelter: 0 (shut in) .. about 0.55 (a gale in the open). */
  gain: number;
  /** Speed in metres a second, at 10 m: what sets the character and the pitch of the whistles. */
  mps: number;
  /** 0..0.5: how much the statues and edges whistle. */
  whistle: number;
}

/** Where the whistles are (azimuth, elevation) and what thickness makes them, as the pitch at 10 m/s. */
const WHISTLES: readonly { at: number; f10: number }[] = [
  { at: 2, f10: 420 }, { at: 5, f10: 700 }, { at: 7, f10: 1500 },
];
/** The stone's own low notes, and where they come from. */
const MOANS: readonly { at: number; f: number; q: number; k: number }[] = [{ at: 3, f: 195, q: 9, k: 1 }, { at: 4, f: 305, q: 8, k: 1 }, { at: 0, f: 2850, q: 22, k: 0.18 }];
const BEDS = [0, 1, 4, 5, 6];
const TRIM = 0.28;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export class Wind {
  private readonly ctx: BaseAudioContext;
  private sources: AudioScheduledSourceNode[] = [];
  private nodes: AudioNode[] = [];
  private bed: { out: GainNode; body: BiquadFilterNode; bodyG: GainNode; mid: BiquadFilterNode; midG: GainNode; hissG: GainNode }[] = [];
  private moans: { g: GainNode; bp: BiquadFilterNode }[] = [];
  private gustDepth: GainNode[] = [];
  private howl: GainNode | null = null;
  /** The common gust itself (slow, centred on zero), for things the gusts push about: the rain driven against the glass. */
  tap!: GainNode;
  private whistles: { osc: OscillatorNode[]; g: GainNode; f10: number }[] = [];

  constructor(deps: { ctx: BaseAudioContext; spot: (at: Vec3) => AudioNode }) {
    const ctx = (this.ctx = deps.ctx);
    const gain = (v: number): GainNode => { const n = ctx.createGain(); n.gain.value = v; this.nodes.push(n); return n; };
    const filt = (type: BiquadFilterType, f: number, q: number): BiquadFilterNode => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; this.nodes.push(b); return b; };
    const loop = (name: Parameters<typeof waterBuffer>[1], speed = 1): AudioBufferSourceNode => {
      const s = ctx.createBufferSource(); s.buffer = waterBuffer(ctx, name); s.loop = true;
      s.playbackRate.value = speed * (0.95 + Math.random() * 0.1); s.start(0, Math.random() * s.buffer.duration);
      this.sources.push(s); return s;
    };
    // a gust is never negative: its level is the shaped, slow wander of a control signal (a peaky curve, so the loud moments are brief and the quiet ones long)
    const curve = new Float32Array(257);
    for (let i = 0; i < 257; i++) { const v = (i / 256) * 2 - 1; curve[i] = 0.03 + 1.25 * Math.pow(clamp(v * 0.5 + 0.5, 0, 1), 1.7); }
    const shape = (): WaveShaperNode => { const w = ctx.createWaveShaper(); w.curve = curve; this.nodes.push(w); return w; };
    const sharpCurve = new Float32Array(257);
    for (let i = 0; i < 257; i++) { const v = (i / 256) * 2 - 1; sharpCurve[i] = 1.6 * Math.pow(clamp(v * 0.5 + 0.5 - 0.15, 0, 1), 3.2); }
    const sharp = (): WaveShaperNode => { const w = ctx.createWaveShaper(); w.curve = sharpCurve; this.nodes.push(w); return w; };
    const shared = gain(1); // one gust, felt everywhere
    this.tap = shared;
    const sharedDepth = gain(0.3); this.gustDepth.push(sharedDepth);
    loop('ctl', 0.012).connect(sharedDepth).connect(shared);      // a gust lasts seconds, and the next remembers it (real wind: correlation 0.5-0.7 after 2 s)
    loop('ctl', 0.04).connect(gain(0.2)).connect(shared);
    for (const i of BEDS) {
      const at = AROUND[i]!;
      const out = gain(0), wob = gain(0);
      // this bed's gust: the shared one with a share of its own, so a gust sweeps across the listener
      const mixc = gain(1); shared.connect(mixc); loop('ctl', 0.11 + Math.random() * 0.05).connect(gain(0.32)).connect(mixc); mixc.connect(shape()).connect(wob.gain);
      const body = filt('lowpass', 200, -3.01), mid = filt('bandpass', 600, 0.7), midG = gain(0), hissG = gain(0), bodyG = gain(0.5);
      loop('brown').connect(body).connect(bodyG).connect(wob);
      loop('pink').connect(mid).connect(midG).connect(wob);
      loop('white').connect(filt('highpass', 3200, -3.01)).connect(filt('lowpass', 9000, -3.01)).connect(hissG).connect(wob);
      wob.connect(out).connect(deps.spot(polar(at.az, at.el, 6)));
      this.bed.push({ out, body, bodyG, mid, midG, hissG });
    }
    for (const mo of MOANS) {
      const at = AROUND[mo.at]!;
      const g = gain(0), wob = gain(0), mixc = gain(1);
      shared.connect(mixc); loop('ctl', 0.1).connect(gain(0.35)).connect(mixc); mixc.connect(sharp()).connect(wob.gain); // only the gusts' peaks bring it on, and it goes again within a second
      const bp = filt('bandpass', mo.f, mo.q); // the pitch is the stone's: it does not follow the wind (measured: no correlation)
      loop('pink').connect(bp).connect(gain(2.2 * mo.k)).connect(wob);
      wob.connect(g).connect(deps.spot(polar(at.az, at.el, 6)));
      this.moans.push({ g, bp });
    }
    {
      // the howl: a held note that wanders slowly between about 260 and 650 Hz (measured in a recording of wind howling through a building)
      const at = AROUND[2]!;
      const g = gain(0), wob = gain(0), mixc = gain(1);
      shared.connect(mixc); mixc.connect(shape()).connect(wob.gain);
      const bp = filt('bandpass', 430, 28);
      loop('ctl', 0.014).connect(gain(170)).connect(bp.frequency);
      loop('pink').connect(bp).connect(gain(5)).connect(wob);
      wob.connect(g).connect(deps.spot(polar(at.az, at.el, 6)));
      this.howl = g;
    }
    for (const w of WHISTLES) {
      const at = AROUND[w.at]!;
      const g = gain(0), wob = gain(0), mixc = gain(1);
      shared.connect(mixc); mixc.connect(shape()).connect(wob.gain); // the whistle swells and fades with each gust
      const osc: OscillatorNode[] = [];
      for (const k of [1, 1.004]) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = w.f10 * k; o.start();
        // and rises and falls in pitch with it
        loop('ctl', 0.3).connect(gain(w.f10 * 0.06)).connect(o.frequency);
        o.connect(wob); osc.push(o); this.sources.push(o);
      }
      wob.connect(g).connect(deps.spot(polar(at.az, at.el, 7)));
      this.whistles.push({ osc, g, f10: w.f10 });
    }
  }

  set(s: WindScene): void {
    const t = this.ctx.currentTime, tc = 1.5;
    const to = (p: AudioParam, v: number): void => { p.setTargetAtTime(v, t, tc); };
    const level = clamp(s.gain / 0.55, 0, 1);
    const u = clamp(s.mps / 16, 0, 1.2);              // 0 calm .. 1 a 36 mph hourly mean
    const amp = TRIM * Math.pow(level, 1.5);          // loudness rises steeply with how hard it blows
    for (const b of this.bed) {
      to(b.out.gain, amp * 0.5);
      to(b.body.frequency, 160 + 320 * u);
      to(b.bodyG.gain, 0.7);
      to(b.mid.frequency, 330 + 700 * u);
      to(b.midG.gain, 0.4 + 0.5 * u * u);
      to(b.hissG.gain, 0.12 * Math.pow(Math.max(0, u - 0.35), 1.2));
    }
    for (const m of this.moans) to(m.g.gain, 1.8 * Math.pow(clamp((u - 0.15) / 0.85, 0, 1), 1.3) * TRIM);
    if (this.howl) to(this.howl.gain, 1.1 * Math.pow(clamp((u - 0.5) / 0.5, 0, 1), 1.5) * TRIM);
    const f = clamp(s.mps, 2, 22) / 10;
    for (const w of this.whistles) {
      w.osc.forEach((o, i) => to(o.frequency, w.f10 * f * (i ? 1.004 : 1)));
      to(w.g.gain, s.whistle * 0.007);
    }
  }

  dispose(): void {
    for (const x of this.sources) { try { x.stop(); } catch { /* already */ } }
    for (const n of this.nodes) { try { n.disconnect(); } catch { /* already */ } }
    this.sources = []; this.nodes = []; this.bed = []; this.whistles = []; this.moans = []; this.gustDepth = []; this.howl = null;
  }
}

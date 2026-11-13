// Wind (design/wind.md). Not a point source and not a steady hiss: air moving over the House makes noise wherever it meets something, so it is
//   * BROAD AND ALL ROUND: five independent beds (front pair, rear pair, overhead) in the shared ring, each gusting on its own, so a gust sweeps across the
//     listener instead of pumping in the middle of the head;
//   * DEEPER WITH SPEED: a low roar always, a mid rush that opens up as it blows, a hiss that only comes in a strong wind; the loudness rises steeply with
//     speed (aerodynamic noise goes with about the fifth power of it) and the gusting deepens as it blows harder;
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
  { at: 2, f10: 520 }, { at: 5, f10: 790 }, { at: 7, f10: 1240 },
];
const BEDS = [0, 1, 4, 5, 6];
const TRIM = 0.28;
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export class Wind {
  private readonly ctx: BaseAudioContext;
  private sources: AudioScheduledSourceNode[] = [];
  private nodes: AudioNode[] = [];
  private bed: { out: GainNode; body: BiquadFilterNode; mid: BiquadFilterNode; midG: GainNode; hissG: GainNode; wob: GainNode }[] = [];
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
    for (const i of BEDS) {
      const at = AROUND[i]!;
      const out = gain(0), wob = gain(1);
      // the gusting of this bed alone: a slow wander, deeper in a strong wind
      loop('ctl', 0.3 + Math.random() * 0.25).connect(gain(0.5)).connect(wob.gain);
      const body = filt('lowpass', 200, -3.01), mid = filt('bandpass', 600, 0.7), midG = gain(0), hissG = gain(0);
      loop('brown').connect(body).connect(gain(0.12)).connect(wob);
      loop('pink').connect(mid).connect(midG).connect(wob);
      loop('white').connect(filt('highpass', 3200, -3.01)).connect(filt('lowpass', 9000, -3.01)).connect(hissG).connect(wob);
      wob.connect(out).connect(deps.spot(polar(at.az, at.el, 6)));
      this.bed.push({ out, body, mid, midG, hissG, wob });
    }
    for (const w of WHISTLES) {
      const at = AROUND[w.at]!;
      const g = gain(0), wob = gain(0.6);
      loop('ctl', 0.45).connect(gain(0.4)).connect(wob.gain); // the whistle swells and fades with each gust
      const osc: OscillatorNode[] = [];
      for (const k of [1, 1.004]) {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = w.f10 * k; o.start();
        // and rises and falls in pitch with it
        loop('ctl', 0.45).connect(gain(w.f10 * 0.07)).connect(o.frequency);
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
      to(b.body.frequency, 110 + 380 * u);
      to(b.mid.frequency, 330 + 700 * u);
      to(b.midG.gain, 0.5 + 1.4 * u * u);
      to(b.hissG.gain, 0.5 * Math.pow(Math.max(0, u - 0.35), 1.2));
    }
    const f = clamp(s.mps, 2, 22) / 10;
    for (const w of this.whistles) {
      w.osc.forEach((o, i) => to(o.frequency, w.f10 * f * (i ? 1.004 : 1)));
      to(w.g.gain, s.whistle * 0.1);
    }
  }

  dispose(): void {
    for (const x of this.sources) { try { x.stop(); } catch { /* already */ } }
    for (const n of this.nodes) { try { n.disconnect(); } catch { /* already */ } }
    this.sources = []; this.nodes = []; this.bed = []; this.whistles = [];
  }
}

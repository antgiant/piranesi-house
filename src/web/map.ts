// Draws the map: explored halls, the doors you know of, live water, you and the way you face. All the rules about what
// may be shown live in game/mapdata.ts; this file only paints.

import type { MapCell, MapView } from '../game/mapdata';
import type { Level } from '../world/layout';

const css = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';

export class MapPanel {
  level: Level = 1;
  private cell = 26;
  private panX = 0;
  private panY = 0;
  private view: MapView | null = null;
  private drag: { x: number; y: number } | null = null;
  private hit: MapCell | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly getView: (level: Level) => MapView,
    private readonly onPick: (c: MapCell | null, view: MapView) => void,
  ) {
    canvas.addEventListener('pointerdown', (e) => { this.drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      this.panX -= (e.clientX - this.drag.x) / this.cell;
      this.panY += (e.clientY - this.drag.y) / this.cell;
      this.drag = { x: e.clientX, y: e.clientY };
      this.draw();
    });
    canvas.addEventListener('pointerup', (e) => {
      const moved = this.drag ? Math.hypot(e.clientX - this.drag.x, e.clientY - this.drag.y) : 0;
      this.drag = null;
      if (moved < 4) this.pick(e);
    });
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
  }

  zoom(f: number): void {
    this.cell = Math.max(10, Math.min(64, this.cell * f));
    this.draw();
  }
  centre(): void {
    this.panX = 0;
    this.panY = 0;
    this.draw();
  }
  setLevel(l: Level): void {
    this.level = l;
    this.draw();
  }

  /** Canvas pixel for a cell centre. */
  private origin(v: MapView): { ox: number; oy: number } {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    return { ox: w / 2 - (v.here.x + this.panX) * this.cell, oy: h / 2 + (v.here.y + this.panY) * this.cell };
  }

  private pick(e: PointerEvent): void {
    if (!this.view) return;
    const r = this.canvas.getBoundingClientRect();
    const { ox, oy } = this.origin(this.view);
    const x = Math.round((e.clientX - r.left - ox) / this.cell);
    const y = Math.round((oy - (e.clientY - r.top)) / this.cell);
    this.hit = this.view.cells.find((c) => c.x === x && c.y === y) ?? null;
    this.onPick(this.hit, this.view);
    this.draw();
  }

  draw(): void {
    const v = this.getView(this.level);
    this.view = v;
    const dpr = window.devicePixelRatio || 1;
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(W * dpr) || this.canvas.height !== Math.round(H * dpr)) {
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
    }
    const ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = css('--bg');
    const panel = css('--panel');
    const dim = css('--dim');
    const accent = css('--accent');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    if (v.level === 0) { ctx.fillStyle = 'rgba(40,90,150,0.25)'; ctx.fillRect(0, 0, W, H); }
    const s = this.cell;
    const { ox, oy } = this.origin(v);
    const px = (x: number): number => ox + x * s;
    const py = (y: number): number => oy - y * s;
    const byKey = new Map(v.cells.map((c) => [`${c.x},${c.y}`, c]));

    // doors you know of, and long passages
    ctx.lineWidth = 1.5;
    for (const c of v.cells) {
      if (c.state === 'known') continue;
      ctx.strokeStyle = dim;
      ctx.setLineDash([]);
      for (const side of c.doors) {
        const dx = side === 'E' ? 1 : side === 'W' ? -1 : 0;
        const dy = side === 'N' ? 1 : side === 'S' ? -1 : 0;
        const full = byKey.get(`${c.x + dx},${c.y + dy}`)?.state !== undefined && byKey.get(`${c.x + dx},${c.y + dy}`)?.state !== 'known';
        ctx.beginPath();
        ctx.moveTo(px(c.x), py(c.y));
        ctx.lineTo(px(c.x) + dx * s * (full ? 1 : 0.55), py(c.y) - dy * s * (full ? 1 : 0.55));
        ctx.stroke();
      }
      ctx.strokeStyle = accent;
      ctx.setLineDash([4, 4]);
      for (const l of c.links) {
        ctx.beginPath();
        ctx.moveTo(px(c.x), py(c.y));
        ctx.lineTo(px(l.x), py(l.y));
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);

    // the halls
    for (const c of v.cells) {
      const cx = px(c.x);
      const cy = py(c.y);
      const half = (c.kind === 'vestibule' ? 0.46 : 0.34) * s;
      const shape = (): void => {
        ctx.beginPath();
        if (c.kind === 'vestibule') {
          ctx.moveTo(cx, cy - half); ctx.lineTo(cx + half, cy); ctx.lineTo(cx, cy + half); ctx.lineTo(cx - half, cy); ctx.closePath();
        } else {
          ctx.rect(cx - half, cy - half, half * 2, half * 2);
        }
      };
      if (c.state === 'known') {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = dim;
        ctx.lineWidth = 1.2;
        shape();
        ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }
      shape();
      ctx.fillStyle = c.lake ? '#2d5f6b' : c.ruined ? '#6b5a3e' : panel;
      ctx.fill();
      if (c.waterDm > 0) {
        shape();
        ctx.fillStyle = `rgba(70,140,215,${Math.min(0.85, 0.25 + c.waterDm / 22).toFixed(2)})`;
        ctx.fill();
      }
      ctx.strokeStyle = c.state === 'here' ? accent : dim;
      ctx.lineWidth = c.state === 'here' ? 3 : 1.2;
      shape();
      ctx.stroke();
      if (c.stairs && s >= 16) {
        ctx.strokeStyle = dim;
        ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx - half * 0.4, cy + i * half * 0.3); ctx.lineTo(cx + half * 0.4, cy + i * half * 0.3); ctx.stroke(); }
      }
      if (this.hit === c) { ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.strokeRect(cx - s * 0.5, cy - s * 0.5, s, s); }
    }

    // a walk in progress: a dotted line to where you are going, and a dot for how far you are
    if (v.walk && v.here.level === v.level) {
      const x0 = px(v.here.x); const y0 = py(v.here.y);
      const x1 = px(v.walk.x); const y1 = py(v.walk.y);
      ctx.strokeStyle = accent; ctx.setLineDash([2, 4]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(x0 + (x1 - x0) * v.walk.fraction, y0 + (y1 - y0) * v.walk.fraction, 4, 0, Math.PI * 2); ctx.fill();
    }

    // you, and the way you face
    if (v.here.level === v.level) {
      const cx = px(v.here.x); const cy = py(v.here.y);
      const a = { N: 0, E: Math.PI / 2, S: Math.PI, W: -Math.PI / 2 }[v.here.facing];
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(a);
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.moveTo(0, -s * 0.24); ctx.lineTo(s * 0.14, s * 0.1); ctx.lineTo(-s * 0.14, s * 0.1); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    this.canvas.setAttribute('aria-label', `Map of the ${['lower', 'middle', 'upper'][v.level]} level: ${v.visited} halls explored, ${v.known} more seen through doors.`);
  }
}

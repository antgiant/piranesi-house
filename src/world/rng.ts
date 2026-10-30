// Deterministic, integer-only hashing and PRNG. No Math.random, no float-dependent branching.
// Changing anything here changes the world: bump WORLD_VERSION (see world.ts) and update the golden snapshots.

export function mix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Stable 32-bit hash of a string (FNV-1a, then avalanche). */
export function strHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return mix32(h);
}

/** Hash a seed with any number of integers. Order matters. */
export function hashInts(seed: number, ...vals: number[]): number {
  let h = mix32((seed ^ 0x9e3779b9) >>> 0);
  for (const v of vals) {
    h = mix32((h ^ Math.imul((v | 0) + 0x7f4a7c15, 0x9e3779b1)) >>> 0);
    h = (h + 0x7f4a7c15) >>> 0;
  }
  return h >>> 0;
}

/** sfc32 generator seeded from a single 32-bit hash. */
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number) {
    this.a = mix32(seed ^ 0xdeadbeef);
    this.b = mix32(seed ^ 0x01234567);
    this.c = mix32(seed ^ 0x89abcdef);
    this.d = 1;
    for (let i = 0; i < 12; i++) this.u32();
  }

  u32(): number {
    const t = (((this.a + this.b) >>> 0) + this.d) >>> 0;
    this.d = (this.d + 1) >>> 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) >>> 0;
    this.c = ((this.c << 21) | (this.c >>> 11)) >>> 0;
    this.c = (this.c + t) >>> 0;
    return t >>> 0;
  }

  /** Integer in [0, n). */
  int(n: number): number {
    if (n <= 1) return 0;
    return this.u32() % n;
  }

  /** Integer in [lo, hi] inclusive. */
  range(lo: number, hi: number): number {
    return lo + this.int(hi - lo + 1);
  }

  /** True with probability num/den, using integers only. */
  chance(num: number, den: number): boolean {
    return this.int(den) < num;
  }

  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick from empty array');
    return arr[this.int(arr.length)] as T;
  }

  /** Weighted pick with integer weights. */
  weighted<T>(items: readonly (readonly [T, number])[]): T {
    let total = 0;
    for (const [, w] of items) total += w;
    let r = this.int(total);
    for (const [v, w] of items) {
      if (r < w) return v;
      r -= w;
    }
    return items[items.length - 1]![0];
  }

  /** Fisher-Yates, returns a new array. */
  shuffle<T>(arr: readonly T[]): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [out[i], out[j]] = [out[j] as T, out[i] as T];
    }
    return out;
  }
}

export function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

export function floorDiv(a: number, b: number): number {
  return Math.floor(a / b);
}

export function mod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

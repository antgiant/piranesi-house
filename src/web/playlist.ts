// The "audiobook" of a wander: every passage read so far, kept in order, with a cursor, so a listener can skip back to hear
// one again and skip forward again, as with any audiobook. The House itself only moves on at the live end: while an earlier
// passage is being replayed, the wander waits.

export interface Passage<T = unknown> {
  text: string;
  /** Whatever the page wants to hang on it (the paragraph to scroll to, say). */
  tag: T;
}

/** Past this many passages the oldest are let go. */
export const MAX_PASSAGES = 300;
/** Skipping back after this long into a passage starts that passage over, as an audiobook does; sooner goes to the one before. */
export const RESTART_AFTER_MS = 3000;

export class Playlist<T = unknown> {
  private items: Passage<T>[] = [];
  /** Index of the passage now being read (or last read); -1 before any. */
  private at = -1;

  get length(): number { return this.items.length; }
  get cursor(): number { return this.at; }
  /** True while an earlier passage than the newest is being heard. */
  get replaying(): boolean { return this.at < this.items.length - 1; }
  current(): Passage<T> | null { return this.items[this.at] ?? null; }

  /** A new passage arrived live. The cursor follows it unless the listener has gone back to hear an old one. */
  record(text: string, tag: T): void {
    const follow = !this.replaying;
    this.items.push({ text, tag });
    if (this.items.length > MAX_PASSAGES) {
      this.items.shift();
      this.at = Math.max(-1, this.at - 1);
    }
    if (follow) this.at = this.items.length - 1;
  }

  /** Skip back. Returns the passage to read, or null if there is nothing to go back to. */
  back(msIntoCurrent: number): Passage<T> | null {
    if (this.items.length === 0) return null;
    if (this.at < 0) this.at = 0;
    else if (msIntoCurrent < RESTART_AFTER_MS && this.at > 0) this.at--;
    return this.items[this.at] ?? null;
  }

  /** Skip forward through passages already read. Returns null at the live end, where the House must move on instead. */
  forward(): Passage<T> | null {
    if (!this.replaying) return null;
    this.at++;
    return this.items[this.at] ?? null;
  }

  /** The reading of a replayed passage ended: on to the next one, or null when the live end has been reached. */
  finished(): Passage<T> | null {
    return this.forward();
  }
}

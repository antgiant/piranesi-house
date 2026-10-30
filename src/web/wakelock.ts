// Keep the screen on while the House is being read to you or is wandering on its own, so the phone does not lock and
// cut the sound off. Uses the browser's Screen Wake Lock where it exists; elsewhere it quietly does nothing.

interface Sentinel { released: boolean; release(): Promise<void>; addEventListener(t: 'release', f: () => void): void }
type WakeNav = Navigator & { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } };

export class ScreenWake {
  private lock: Sentinel | null = null;
  private wanted = false;
  private busy = false;

  get supported(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }
  /** Is the screen being held on right now? */
  get held(): boolean {
    return this.lock !== null && !this.lock.released;
  }

  constructor() {
    // The browser drops the lock when the page is hidden; take it again when the visitor comes back.
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void this.sync(); });
  }

  /** Say whether the screen should stay on. Cheap to call often. */
  want(on: boolean): void {
    if (on === this.wanted && (on === this.held || !on)) return;
    this.wanted = on;
    void this.sync();
  }

  private async sync(): Promise<void> {
    if (!this.supported || this.busy) return;
    this.busy = true;
    try {
      if (this.wanted && !this.held && document.visibilityState === 'visible') {
        const l = await (navigator as WakeNav).wakeLock?.request('screen');
        if (l) {
          this.lock = l;
          l.addEventListener('release', () => { if (this.lock === l) this.lock = null; });
        }
      } else if (!this.wanted && this.lock) {
        const l = this.lock;
        this.lock = null;
        await l.release();
      }
    } catch { /* refused (low battery, no permission): carry on without it */ }
    this.busy = false;
  }
}

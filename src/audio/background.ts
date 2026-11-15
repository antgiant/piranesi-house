// Background listening. A web page's sound normally stops when an iPhone's screen locks or another app comes to the front.
// What iOS keeps playing is media: an <audio> element, which also gets the lock-screen play/pause controls through the Media Session.
// So on iOS the House's sound is sent through a MediaStream into a hidden <audio> element (see AudioEngine.routeOutput), and the page asks
// for the "playback" audio session (iOS 16.4+), which also keeps it playing with the silent switch on.
// Elsewhere (desktop, Android) a page that is merely in a background tab keeps its sound already, so nothing changes there.

/** Is this an iPhone or iPad (an iPad can say it is a Mac, but a Mac has no touch screen)? */
export function isIos(userAgent: string, platform: string, touchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1);
}

/** Should the sound go through an <audio> element so it can carry on in the background? */
export function wantsMediaElement(): boolean {
  if (typeof navigator === 'undefined' || typeof Audio === 'undefined') return false;
  return isIos(navigator.userAgent, navigator.platform, navigator.maxTouchPoints ?? 0);
}

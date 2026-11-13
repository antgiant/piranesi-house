// A sound's place in the room, as the engine hands it to a voice: an input that is heard from a point around the listener, and a way to move that point
// (the listener walks and turns; the water stays where it is in the hall) and to take it away.

import type { Vec3 } from './spatial';

export interface PlaceHandle {
  input: AudioNode;
  move: (at: Vec3, tc: number) => void;
  dispose: () => void;
}

export type PlaceFactory = (at: Vec3) => PlaceHandle;

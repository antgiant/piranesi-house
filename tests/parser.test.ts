import { describe, expect, it } from 'vitest';
import { parse } from '../src/game/parser';

describe('parser', () => {
  it.each([
    ['', { t: 'empty' }],
    ['look', { t: 'look' }],
    ['L', { t: 'look' }],
    ['look around', { t: 'look' }],
    ['north', { t: 'go', side: 'N', n: undefined }],
    ['n', { t: 'go', side: 'N', n: undefined }],
    ['go west', { t: 'go', side: 'W', n: undefined }],
    ['go north 3', { t: 'go', side: 'N', n: 3 }],
    ['go through the south door 2', { t: 'go', side: 'S', n: 2 }],
    ['go 4', { t: 'go', side: undefined, n: 4 }],
    ['4', { t: 'go', n: 4 }],
    ['walk to the east wall', { t: 'walk', wall: 'E' }],
    ['walk north', { t: 'walk', wall: 'N' }],
    ['up', { t: 'stairs', dir: 'up' }],
    ['climb the stair', { t: 'stairs', dir: 'up' }],
    ['climb down', { t: 'stairs', dir: 'down' }],
    ['descend', { t: 'stairs', dir: 'down' }],
    ['examine 2', { t: 'examine', what: '2' }],
    ['x the weaver', { t: 'examine', what: 'weaver' }],
    ['look at statue 3', { t: 'examine', what: 'statue 3' }],
    ['listen', { t: 'listen' }],
    ['wait', { t: 'wait', minutes: 5 }],
    ['wait 30', { t: 'wait', minutes: 30 }],
    ['time', { t: 'time' }],
    ['help', { t: 'help' }],
    ['where', { t: 'where' }],
  ])('%j', (input, expected) => {
    expect(parse(input)).toMatchObject(expected as object);
  });
  it('does not understand nonsense and says so', () => {
    expect(parse('frobnicate the widget')).toEqual({ t: 'unknown', input: 'frobnicate the widget' });
  });
});

import type { Side } from '../world/layout';

export type Command =
  | { t: 'empty' }
  | { t: 'look'; full?: boolean; repeat?: boolean; numbered?: boolean }
  | { t: 'listen' }
  | { t: 'go'; side?: Side; n?: number }
  | { t: 'walk'; wall: Side }
  | { t: 'stairs'; dir: 'up' | 'down' }
  | { t: 'travel'; place: string }
  | { t: 'trek'; side: Side; n?: number }
  | { t: 'approach'; n: number }
  | { t: 'mark'; label: string }
  | { t: 'unmark'; label: string }
  | { t: 'marks' }
  | { t: 'examine'; what: string }
  | { t: 'wait'; minutes: number }
  | { t: 'stop' }
  | { t: 'found' }
  | { t: 'time' }
  | { t: 'where' }
  | { t: 'help' }
  | { t: 'unknown'; input: string };

const DIRS: Record<string, Side> = { n: 'N', north: 'N', e: 'E', east: 'E', s: 'S', south: 'S', w: 'W', west: 'W' };
const ARTICLES = new Set(['the', 'a', 'an', 'to', 'at', 'through', 'toward', 'towards', 'on', 'of', 'into', 'wall', 'door', 'doors', 'exit']);

export function parse(input: string): Command {
  const words = input.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return { t: 'empty' };
  const verb = words[0] as string;
  const rest = words.slice(1);
  const content = rest.filter((w) => !ARTICLES.has(w));
  const num = (ws: string[]): number | undefined => {
    const n = ws.find((w) => /^\d+$/.test(w));
    return n === undefined ? undefined : Number(n);
  };

  if (verb in DIRS && words.length <= 2) return { t: 'go', side: DIRS[verb] as Side, n: num(rest) };
  switch (verb) {
    case 'repeat': case 'again': case 'encore':
      return { t: 'look', repeat: true };
    case 'l': case 'look': case 'around':
      if (content.some((w) => w === 'again' || w === 'repeat')) return { t: 'look', repeat: true };
      if (content.some((w) => ['closely', 'carefully', 'fully', 'properly', 'everything', 'details'].includes(w))) return { t: 'look', full: true };
      if (content.length > 0 && verb === 'look' && !['around', 'again'].includes(content[0] as string)) return { t: 'examine', what: content.join(' ') };
      return { t: 'look' };
    case 'x': case 'examine': case 'inspect': case 'study': case 'read': case 'statue':
      return content.length ? { t: 'examine', what: content.join(' ') } : { t: 'unknown', input };
    case 'list': case 'reference': case 'inventory': case 'numbers':
      return { t: 'look', numbered: true };
    case 'details': case 'survey':
      return { t: 'look', full: true };
    case 'listen': case 'hear':
      return { t: 'listen' };
    case 'go': case 'walk': case 'head': case 'move': case 'run': case 'enter': case 'leave': case 'exit': case 'door': {
      // a named place always wins over a compass word inside its name ("...Hall, 2 rows north")
      if (content.some((w) => w === 'hall' || w === 'halls' || w === 'vestibule')) return { t: 'travel', place: content.join(' ') };
      const side = content.map((w) => DIRS[w]).find(Boolean);
      const toWall = rest.includes('wall') || verb === 'walk';
      if (verb === 'walk' || (toWall && side)) {
        if (side && (verb === 'walk' || rest.includes('to') || rest.includes('wall'))) return { t: 'walk', wall: side };
      }
      if (content.includes('up')) return { t: 'stairs', dir: 'up' };
      if (content.includes('down')) return { t: 'stairs', dir: 'down' };
      const n = num(rest);
      // "walk to statue 3", "go to number 3"
      if (n !== undefined && rest.some((w) => w === 'statue' || w === 'figure')) return { t: 'approach', n };
      if (side || n !== undefined) return { t: 'go', side, n };
      // "go to the Ninth Vestibule": a place by name
      if (content.length > 0) return { t: 'travel', place: content.join(' ') };
      return { t: 'unknown', input };
    }
    case 'travel': case 'journey': case 'trek': case 'goto': case 'visit': case 'return': case 'home': {
      if (verb === 'home' || (verb === 'return' && content.length === 0)) return { t: 'travel', place: 'first vestibule' };
      const side = DIRS[content[0] as string];
      if (side && content.length <= 2 && !content.some((w) => w === 'hall' || w === 'vestibule')) return { t: 'trek', side, n: num(rest) };
      return content.length ? { t: 'travel', place: content.join(' ') } : { t: 'unknown', input };
    }
    case 'approach': case 'toward': case 'towards': {
      const n = num(rest);
      return n !== undefined ? { t: 'approach', n } : { t: 'unknown', input };
    }
    case 'mark': case 'bookmark': case 'flag':
      return content.length ? { t: 'mark', label: content.join(' ') } : { t: 'unknown', input };
    case 'unmark': case 'unflag': case 'forget':
      return content.length ? { t: 'unmark', label: content.join(' ') } : { t: 'unknown', input };
    case 'marks': case 'bookmarks': case 'places':
      return { t: 'marks' };
    case 'u': case 'up': case 'ascend': return { t: 'stairs', dir: 'up' };
    case 'd': case 'down': case 'descend': return { t: 'stairs', dir: 'down' };
    case 'climb':
      if (content.includes('down')) return { t: 'stairs', dir: 'down' };
      return { t: 'stairs', dir: 'up' };
    case 'found': case 'finds': case 'discoveries': case 'remember':
      return { t: 'found' };
    case 'stop': case 'halt': case 'cancel':
      return { t: 'stop' };
    case 'wait': case 'rest': case 'sit': case 'pause':
      return { t: 'wait', minutes: num(rest) ?? 5 };
    case 'time': case 'sky': case 'date': case 'clock': case 'moon':
      return { t: 'time' };
    case 'where': case 'whereami': case 'name':
      return { t: 'where' };
    case 'help': case 'h': case '?': case 'commands':
      return { t: 'help' };
    default:
      if (/^\d+$/.test(verb) && words.length === 1) return { t: 'go', n: Number(verb) };
      return { t: 'unknown', input };
  }
}

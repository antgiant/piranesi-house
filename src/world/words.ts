// English ordinals in the book's hyphenated style: "Twenty-First", "One-Hundred-and-Ninety-Second".

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const ORD_UNDER_20 = [
  '', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth',
  'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth',
];
const ORD_TENS = ['', '', 'Twentieth', 'Thirtieth', 'Fortieth', 'Fiftieth', 'Sixtieth', 'Seventieth', 'Eightieth', 'Ninetieth'];

function ordUnder100(n: number): string {
  if (n < 20) return ORD_UNDER_20[n] as string;
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? (ORD_TENS[t] as string) : `${TENS[t]}-${ORD_UNDER_20[u]}`;
}

/** 1..9999 */
export function ordinalWord(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 9999) throw new RangeError(`ordinal out of range: ${n}`);
  const th = Math.floor(n / 1000);
  const hu = Math.floor((n % 1000) / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (th > 0) parts.push(`${ONES[th]}-Thousand`);
  if (hu > 0) parts.push(`${ONES[hu]}-Hundred`);
  if (rest === 0) {
    // "One-Hundredth", "Two-Thousandth", "Three-Thousand-Five-Hundredth"
    const last = parts.pop() as string;
    parts.push(`${last}th`);
    return parts.join('-');
  }
  if (parts.length > 0) parts.push('and');
  parts.push(ordUnder100(rest));
  return parts.join('-');
}

let reverse: Map<string, number> | null = null;
export function parseOrdinal(word: string): number | null {
  if (!reverse) {
    reverse = new Map();
    for (let i = 1; i <= 9999; i++) reverse.set(ordinalWord(i), i);
  }
  return reverse.get(word) ?? null;
}

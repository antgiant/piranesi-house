// Units for the reader's own part of the world. The House is generated and described in metres; what is shown or spoken is turned into feet and
// miles for readers who think in them. It is done at the last moment, on the text, so the world itself (its generation, saves and
// golden snapshot) never changes with the setting. Pure, so it can be tested without a browser.

export type UnitSystem = 'metric' | 'us';
export type UnitsSetting = 'auto' | UnitSystem;

export const UNIT_SETTINGS: readonly UnitsSetting[] = ['auto', 'metric', 'us'];

export const FEET_PER_M = 3.28084;
export const MILES_PER_KM = 0.621371;

/** Anything that is not a known setting (an old or damaged saved value) is Automatic. */
export function parseUnits(v: unknown): UnitsSetting {
  return v === 'metric' || v === 'us' ? v : 'auto';
}

/** Automatic: the units of the reader's region. The United States, Liberia and Myanmar use feet and miles; most of the rest, metres. */
export function resolveUnits(setting: UnitsSetting, locale: string | undefined): UnitSystem {
  if (setting !== 'auto') return setting;
  const region = /[-_]([A-Za-z]{2})\b/.exec(locale ?? '')?.[1]?.toUpperCase();
  return region === 'US' || region === 'LR' || region === 'MM' ? 'us' : 'metric';
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const WORD_VALUE: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};

export function numberWords(n: number): string {
  if (n < 20) return ONES[n] as string;
  if (n < 100) return `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ''}`;
  return String(n);
}

/** A length in metres as a round number of feet: 6.6 for a person's height, 35 for a stair, 345 for a hall. */
export function roundFeet(m: number): number {
  const f = m * FEET_PER_M;
  if (m < 3) return Math.round(f * 10) / 10;
  if (f < 20) return Math.round(f);
  if (f < 1000) return Math.round(f / 5) * 5;
  return Math.round(f / 10) * 10;
}

const numeral = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const feetUnit = (n: number): string => (n === 1 ? 'foot' : 'feet');

function milesText(km: number): string {
  const mi = km * MILES_PER_KM;
  if (mi < 0.95) return `${mi.toFixed(1)} ${mi.toFixed(1) === '1.0' ? 'mile' : 'miles'}`;
  const r = mi < 100 ? Math.round(mi * 10) / 10 : Math.round(mi); // one decimal below a hundred miles: 12.4, and the marathon's 26.2
  return `${numeral(r)} ${r === 1 ? 'mile' : 'miles'}`;
}

/** Turn the metres, kilometres and km/h in a piece of text into feet, miles and mph. Metric text is returned unchanged. */
export function localiseUnits(text: string, system: UnitSystem): string {
  if (system === 'metric') return text;
  let t = text;
  // speeds first, so their number is not taken for a distance
  t = t.replace(/(\d+(?:\.\d+)?) ?km\/h\b/g, (_m, n: string) => `${(Number(n) * MILES_PER_KM).toFixed(1)} mph`);
  // "180 by 90 metres": both numbers are lengths
  t = t.replace(/(\d+(?:\.\d+)?) by (\d+(?:\.\d+)?) metres\b/g, (_m, a: string, b: string) => `${numeral(roundFeet(Number(a)))} by ${numeral(roundFeet(Number(b)))} feet`);
  t = t.replace(/(\d+(?:\.\d+)?) metres?\b/g, (_m, n: string) => { const f = roundFeet(Number(n)); return `${numeral(f)} ${feetUnit(f)}`; });
  // "ten metres": a number in words stays in words
  t = t.replace(/\b(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Fifteen|Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety|Hundred|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred) metres?\b/g, (_m, w: string) => {
    const f = Math.round(roundFeet(WORD_VALUE[w.toLowerCase()] as number));
    const words = numberWords(f);
    return `${w[0] === w[0]!.toUpperCase() ? words.charAt(0).toUpperCase() + words.slice(1) : words} ${feetUnit(f)}`;
  });
  t = t.replace(/\bfew metres\b/g, 'few yards').replace(/\bsquare metres\b/g, 'square feet');
  t = t.replace(/(\d+(?:\.\d+)?) ?(?:kilometres?|km)\b/g, (_m, n: string) => milesText(Number(n)));
  return t;
}

/** "5.3 km/h" as the reader's own unit. */
export function speedText(kmh: number, system: UnitSystem): string {
  return system === 'us' ? `${(kmh * MILES_PER_KM).toFixed(1)} mph` : `${kmh.toFixed(1)} km/h`;
}

/** "150 m" as the reader's own unit. */
export function lengthText(m: number, system: UnitSystem): string {
  return system === 'us' ? `${roundFeet(m)} ft` : `${m} m`;
}

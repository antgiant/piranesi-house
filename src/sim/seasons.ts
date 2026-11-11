// The year in the birds: who has arrived, who has gone, who is singing, and who is raising young. Pure functions of the day of the
// year (1..365), with our own rough calendar for a temperate northern coast: migrants arrive and leave, song comes with the spring,
// the owls call in the cold months, and the gulls nest, hatch and fledge on a fixed schedule.

export interface BirdSeason {
  /** Swifts are here: arrive early May, gone by mid August. */
  swifts: boolean;
  /** Small shore waders are about: winter visitors, gone north to breed from mid May to mid August. */
  waders: boolean;
  /** Blackbirds and the rest are in full song (February to July); out of season only the odd short call. */
  songbirds: boolean;
  /** Owls call more in the cold months, when they are setting up territories. */
  owls: boolean;
  /** Gull (and sparrow) chicks are in the nest and begging, June and July. */
  chicks: boolean;
  /** The young gulls are fledging: August. */
  fledglings: boolean;
  /** Gulls have come back to the colony and are paired up and incubating: March to May. */
  nesting: boolean;
}

export function birdSeason(dayOfYear: number): BirdSeason {
  const d = ((Math.floor(dayOfYear) - 1) % 365 + 365) % 365 + 1;
  return {
    swifts: d >= 125 && d <= 222,
    waders: d >= 228 || d <= 135,
    songbirds: d >= 40 && d <= 200,
    owls: d >= 275 || d <= 90,
    chicks: d >= 152 && d <= 212,
    fledglings: d >= 213 && d <= 243,
    nesting: d >= 60 && d <= 243,
  };
}

/** The whole-year picture a test or a note might want: how many of the seven are on at each date. */
export function seasonCount(dayOfYear: number): number {
  const s = birdSeason(dayOfYear);
  return Object.values(s).filter(Boolean).length;
}

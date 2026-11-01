// Saying how much, as a person would: nobody who has wandered the House counts its halls.

/** "a few halls", "many halls", "uncountably many halls": what you remember of how many you have been through. */
export function hallsInWords(n: number): string {
  if (n <= 0) return 'no halls yet';
  if (n === 1) return 'one hall';
  if (n === 2) return 'two halls';
  if (n <= 5) return 'a few halls';
  if (n <= 12) return 'some halls';
  if (n <= 30) return 'a good many halls';
  if (n <= 80) return 'many halls';
  if (n <= 250) return 'very many halls';
  if (n <= 1000) return 'a great many halls';
  return 'uncountably many halls';
}

/** The title screen's account of a kept journey. */
export function journeyNote(halls: number, entries: number): string {
  const journal = entries === 1 ? 'one entry in your journal' : `${entries} entries in your journal`;
  if (halls <= 0) return entries > 0 ? `Your journey is here: you have written ${entries === 1 ? 'one entry' : `${entries} entries`} in your journal.` : 'Your journey is here.';
  return `Your journey is here: you remember visiting ${hallsInWords(halls)}${entries > 0 ? `, and you have ${journal}` : ''}.`;
}

// Build src/generated/canon-statues.json from canon/statues.yaml so the runtime never parses YAML.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parse } from 'yaml';

const doc = parse(readFileSync('canon/statues.yaml', 'utf8'));
const out = doc.named.map((s) => ({
  id: s.id,
  label: s.label,
  meaning: s.meaning ?? null,
  attributes: s.attributes ?? [],
  size: s.size ?? null,
}));
mkdirSync('src/generated', { recursive: true });
writeFileSync('src/generated/canon-statues.json', JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${out.length} canon statues`);

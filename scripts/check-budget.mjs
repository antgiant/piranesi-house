// Performance budget: the built site must stay small enough to open quickly on a slow phone connection. Run after `npm run build`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const BUDGET = { js: 130 * 1024, css: 12 * 1024, html: 10 * 1024, total: 190 * 1024, anyFile: 150 * 1024 };
const dir = new URL('../dist/', import.meta.url).pathname;
const sizes = { js: 0, css: 0, html: 0, total: 0 };
const problems = [];

function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) { walk(p); continue; }
    const raw = readFileSync(p);
    const gz = /\.(png|jpg|webp|woff2?)$/.test(f) ? raw.length : gzipSync(raw).length;
    sizes.total += gz;
    if (f.endsWith('.js') && !f.endsWith('sw.js')) sizes.js += gz;
    if (f.endsWith('.css')) sizes.css += gz;
    if (f.endsWith('.html')) sizes.html += gz;
    if (gz > BUDGET.anyFile) problems.push(`${p.replace(dir, '')} is ${(gz / 1024).toFixed(1)} KB (limit ${BUDGET.anyFile / 1024} KB)`);
  }
}
walk(dir);
for (const k of ['js', 'css', 'html', 'total']) {
  const ok = sizes[k] <= BUDGET[k];
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${k}: ${(sizes[k] / 1024).toFixed(1)} KB gzipped (budget ${BUDGET[k] / 1024} KB)`);
  if (!ok) problems.push(k);
}
for (const p of problems) if (p.includes(' is ')) console.log(`FAIL  ${p}`);
process.exit(problems.length ? 1 : 0);

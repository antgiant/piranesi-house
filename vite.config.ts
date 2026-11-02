import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

/** The commit this build was made from, so a visitor can tell which version they have. */
function build(): string {
  const sha = process.env.GITHUB_SHA?.slice(0, 7);
  if (sha) return sha;
  try { return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'dev'; }
}

// Relative base so the site works from any GitHub Pages path (user.github.io/repo/ or a custom domain).
export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(build()) },
  build: { outDir: 'dist', target: 'es2022', sourcemap: false },
});

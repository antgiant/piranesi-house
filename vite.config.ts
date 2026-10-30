import { defineConfig } from 'vite';

// Relative base so the site works from any GitHub Pages path (user.github.io/repo/ or a custom domain).
export default defineConfig({
  base: './',
  build: { outDir: 'dist', target: 'es2022', sourcemap: false },
});

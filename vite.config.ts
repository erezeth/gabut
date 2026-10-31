import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works on GitHub Pages under any repository name.
  base: './',
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
    // Keep assets as real files: a single huge base64 bundle hurts load time.
    assetsInlineLimit: 0,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});

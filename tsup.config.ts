import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/tools.ts', 'src/api-client.ts', 'src/prompts.ts', 'src/resources.ts', 'src/version.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  banner: { js: '#!/usr/bin/env node' },
});

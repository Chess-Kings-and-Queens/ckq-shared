import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  // Consumers (website2.0, ckq-mobile) bring their own copies of these —
  // bundle only our own source, don't inline dependencies.
  external: ['chess.js', '@mliebelt/pgn-reader'],
});

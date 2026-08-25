import { defineConfig } from 'tsup';

export default defineConfig({
  // Two entry points on purpose — see src/auth.ts's header comment for why
  // Edge-Runtime consumers (website2.0's middleware.ts) need a separate,
  // pgn-reader-free entry rather than importing from the main barrel.
  entry: ['src/index.ts', 'src/auth.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  // Consumers (website2.0, ckq-mobile) bring their own copies of these —
  // bundle only our own source, don't inline dependencies.
  external: ['chess.js', '@mliebelt/pgn-reader'],
});

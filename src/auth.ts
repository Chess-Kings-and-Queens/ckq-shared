// @ckq/shared/auth — a separate entry point containing ONLY decodeJwt.ts's
// exports, with zero dependency on chess.js/@mliebelt/pgn-reader.
//
// Why this exists: the main `@ckq/shared` entry (`src/index.ts`) barrel-
// exports everything from one bundled file, including quizEvaluator.ts/
// chessUtils.ts, which import `@mliebelt/pgn-reader`. Next.js's Edge Runtime
// (which `middleware.ts` always runs in) statically analyzes the whole
// bundle graph reached by an import — since ES modules can't be partially
// evaluated, importing even one pgn-reader-free symbol from the main entry
// still pulls in that entry's top-level `@mliebelt/pgn-reader` import
// (needed by its OTHER exports), and pgn-reader's UMD build uses dynamic
// code evaluation (`eval`), which the Edge Runtime forbids outright — this
// broke website2.0's `next build` once `middleware.ts` started importing
// `decodeJwtRole`/`getPostLoginRedirect` from the main entry (Phase 1).
//
// Consumers that only need JWT-decoding logic (e.g. Edge-Runtime-bound
// middleware) should import from `@ckq/shared/auth` instead of the main
// entry — this file's own dist output has no pgn-reader reference at all.

export * from './decodeJwt';

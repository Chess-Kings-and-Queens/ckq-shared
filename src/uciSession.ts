import { uciMoveToSan } from './chessUtils';

// ── UCI session protocol ───────────────────────────────────────────────────────
//
// New design (not a port): extracts the UCI handshake + pending-search-queue
// protocol that website2.0's useStockfishOpponent.ts hardwires directly to a
// Worker. `UciSession` talks to an injected `UciTransport` instead — on web
// that's a thin wrapper around a Worker, on ckq-mobile it can be a JSI binding
// or an HTTP-polling transport (D5), with zero protocol code duplicated.

/**
 * The minimal contract a UCI engine transport must satisfy. `send` writes a
 * single UCI command line; `onLine` registers a handler for each line the
 * engine emits and returns an unsubscribe function.
 */
export interface UciTransport {
  send(line: string): void;
  onLine(handler: (line: string) => void): () => void;
}

export interface UciSessionOptions {
  /** Stockfish skill level 0–20. Default 20 (matches useStockfishOpponent's default). */
  skillLevel?: number;
  /** Called with the SAN move once the engine responds to a search with `bestmove`. */
  onBestMove?: (san: string) => void;
  /**
   * True when the transport is already warm and has completed its own UCI
   * handshake — e.g. a preloaded engine worker. Skips the handshake entirely.
   */
  startReady?: boolean;
  /**
   * Called every time `isThinking`'s value changes — both when a search
   * actually starts (immediately if ready, or once a queued search fires on
   * `readyok`) and when it ends (every `bestmove` line, regardless of
   * whether it parses to a legal SAN). Lets a caller mirror this session's
   * internal `thinking` flag exactly instead of approximating it from
   * `onBestMove` alone, which never fires on a `bestmove (none)` or a failed
   * UCI→SAN conversion.
   */
  onThinkingChange?: (thinking: boolean) => void;
}

interface PendingSearch {
  fen: string;
  movetime: number;
}

/**
 * Owns the UCI handshake (`uci` → `uciok` → `setoption Skill Level N` →
 * `ucinewgame` → `isready` → `readyok`) and the single-slot pending-search
 * queue for a Stockfish-style engine transport.
 *
 * Registration of `onBestMove` is constructor-only (an options object,
 * matching `UseStockfishOpponentConfig`'s `onMove` config-option shape) —
 * there is no separate method to swap it later, keeping this a one-callback,
 * fire-and-forget session for its whole lifetime.
 *
 * Ready/thinking state is exposed as synchronous getters (`isReady`,
 * `isThinking`) rather than callbacks — both are simple booleans a caller
 * polls or reads inside its own render/update cycle, so a getter is simplest
 * and most testable (no subscription bookkeeping needed for two booleans).
 */
export class UciSession {
  private readonly transport: UciTransport;
  private readonly skillLevel: number;
  private readonly onBestMoveCallback: ((san: string) => void) | undefined;
  private readonly onThinkingChangeCallback: ((thinking: boolean) => void) | undefined;
  private readonly unsubscribe: () => void;

  private ready = false;
  private thinking = false;
  /**
   * Only the most recently requested search is retained while waiting for
   * the handshake to finish — matches useStockfishOpponent.ts's
   * `pendingFenRef`, which is overwritten (not queued as a list) by every
   * `requestMove` call that arrives before `readyok`.
   */
  private pendingSearch: PendingSearch | null = null;
  /** FEN of the most recently requested search — used to convert bestmove UCI → SAN. */
  private lastSearchFen = '';

  constructor(transport: UciTransport, options: UciSessionOptions = {}) {
    this.transport = transport;
    this.skillLevel = options.skillLevel ?? 20;
    this.onBestMoveCallback = options.onBestMove;
    this.onThinkingChangeCallback = options.onThinkingChange;
    this.unsubscribe = transport.onLine((line) => this.handleLine(line));
    if (options.startReady) {
      this.transport.send(`setoption name Skill Level value ${this.skillLevel}`);
      this.markReady();
    } else {
      this.transport.send('uci');
    }
  }

  get isReady(): boolean {
    return this.ready;
  }

  get isThinking(): boolean {
    return this.thinking;
  }

  /**
   * Request a search from `fen` for `movetime` milliseconds. If the handshake
   * hasn't completed yet, the request is queued (overwriting any previously
   * queued request) and fired automatically once `readyok` arrives.
   */
  fireSearch(fen: string, movetime: number): void {
    this.lastSearchFen = fen;
    if (this.ready) {
      this.setThinking(true);
      this.transport.send(`position fen ${fen}`);
      this.transport.send(`go movetime ${movetime}`);
    } else {
      this.pendingSearch = { fen, movetime };
    }
  }

  /** Unsubscribe from the transport. Call on teardown. */
  destroy(): void {
    this.unsubscribe();
  }

  /** Marks the session ready and fires (and clears) any queued search. */
  private markReady(): void {
    this.ready = true;
    const pending = this.pendingSearch;
    if (pending) {
      this.pendingSearch = null;
      this.setThinking(true);
      this.transport.send(`position fen ${pending.fen}`);
      this.transport.send(`go movetime ${pending.movetime}`);
    }
  }

  /** Sets `thinking` and notifies `onThinkingChange` — the single place both mutate together. */
  private setThinking(value: boolean): void {
    this.thinking = value;
    this.onThinkingChangeCallback?.(value);
  }

  private handleLine(line: string): void {
    if (line.startsWith('info') || line.startsWith('id')) return;

    if (line === 'uciok') {
      this.transport.send(`setoption name Skill Level value ${this.skillLevel}`);
      this.transport.send('ucinewgame');
      this.transport.send('isready');
      return;
    }

    if (line === 'readyok') {
      this.markReady();
      return;
    }

    if (line.startsWith('bestmove')) {
      this.setThinking(false);
      const uci = line.split(' ')[1];
      if (!uci || uci === '(none)') return;
      const san = uciMoveToSan(this.lastSearchFen, uci);
      if (san) this.onBestMoveCallback?.(san);
    }
  }
}

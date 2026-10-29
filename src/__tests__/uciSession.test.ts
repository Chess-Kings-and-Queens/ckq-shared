import { UciSession, type UciTransport } from '../uciSession';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** An in-memory fake UciTransport — records sent lines and lets the test feed fake engine lines. */
function makeFakeTransport() {
  const sent: string[] = [];
  let handler: ((line: string) => void) | null = null;
  let unsubscribed = false;

  const transport: UciTransport = {
    send(line: string) {
      sent.push(line);
    },
    onLine(h: (line: string) => void) {
      handler = h;
      return () => {
        unsubscribed = true;
        handler = null;
      };
    },
  };

  return {
    transport,
    sent,
    emit(line: string) {
      handler?.(line);
    },
    isUnsubscribed: () => unsubscribed,
  };
}

describe('UciSession — handshake', () => {
  test('sends "uci" immediately on construction', () => {
    const fake = makeFakeTransport();
    new UciSession(fake.transport);
    expect(fake.sent).toEqual(['uci']);
  });

  test('runs the full handshake in order: uciok → setoption/ucinewgame/isready → readyok → ready', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport, { level: 15 });

    expect(session.isReady).toBe(false);

    fake.emit('uciok');
    expect(fake.sent).toEqual([
      'uci',
      'setoption name Skill Level value 16',
      'ucinewgame',
      'isready',
    ]);
    expect(session.isReady).toBe(false);

    fake.emit('readyok');
    expect(session.isReady).toBe(true);
  });

  test('defaults level to 20 (sends Skill Level 20)', () => {
    const fake = makeFakeTransport();
    new UciSession(fake.transport);
    fake.emit('uciok');
    expect(fake.sent).toContain('setoption name Skill Level value 20');
  });

  test('ignores "info" and "id" lines during handshake', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport);
    fake.emit('id name Stockfish 18');
    fake.emit('info string NNUE evaluation using ...');
    expect(session.isReady).toBe(false);
    expect(fake.sent).toEqual(['uci']); // no extra commands sent from info/id lines
  });
});

describe('UciSession — startReady (preloaded/warm engine)', () => {
  test('sends only setoption (no "uci") and is ready immediately', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport, { level: 12, startReady: true });
    expect(fake.sent).toEqual(['setoption name Skill Level value 12']);
    expect(session.isReady).toBe(true);
  });

  test('a search fired immediately after construction fires right away, with no wait', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport, { startReady: true });
    fake.sent.length = 0;
    session.fireSearch(START_FEN);
    expect(fake.sent).toEqual([`position fen ${START_FEN}`, 'go movetime 1000']);
    expect(session.isThinking).toBe(true);
  });
});

describe('UciSession — level limits', () => {
  test('level 1 on a warm transport sends Skill Level 0, then a depth-1 50 ms search', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport, { level: 1, startReady: true });
    expect(fake.sent).toEqual(['setoption name Skill Level value 0']);
    fake.sent.length = 0;
    session.fireSearch(START_FEN);
    expect(fake.sent).toEqual([`position fen ${START_FEN}`, 'go depth 1 movetime 50']);
  });

  test('a search queued before readyok on level 3 fires the level-3 go command', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport, { level: 3 });
    session.fireSearch(START_FEN);
    fake.emit('uciok');
    fake.emit('readyok');
    expect(fake.sent).toContain('go depth 2 movetime 100');
  });

  test('level 25 is clamped to 20 (Skill Level 20) in the handshake', () => {
    const fake = makeFakeTransport();
    new UciSession(fake.transport, { level: 25 });
    fake.emit('uciok');
    expect(fake.sent).toContain('setoption name Skill Level value 20');
  });
});

describe('UciSession — fireSearch queueing', () => {
  test('a search fired before the handshake completes is queued, not sent immediately', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport);
    session.fireSearch(START_FEN);
    expect(fake.sent).not.toContain(`position fen ${START_FEN}`);
    expect(session.isThinking).toBe(false);
  });

  test('the queued search fires automatically once ready', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport);
    session.fireSearch(START_FEN);
    fake.emit('uciok');
    fake.emit('readyok');
    expect(fake.sent).toContain(`position fen ${START_FEN}`);
    expect(fake.sent).toContain('go movetime 1000');
    expect(session.isThinking).toBe(true);
  });

  test('only the most recently requested search survives — earlier queued requests are overwritten, not queued as a list', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport);
    const firstFen = START_FEN;
    const secondFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    session.fireSearch(firstFen);
    session.fireSearch(secondFen);
    fake.emit('uciok');
    fake.emit('readyok');
    expect(fake.sent).not.toContain(`position fen ${firstFen}`);
    expect(fake.sent).toContain(`position fen ${secondFen}`);
  });

  test('default level 20 sends an uncapped 1000 ms search (fires position+go immediately when already ready)', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport);
    fake.emit('uciok');
    fake.emit('readyok');
    fake.sent.length = 0;
    session.fireSearch(START_FEN);
    expect(fake.sent).toEqual([`position fen ${START_FEN}`, 'go movetime 1000']);
    expect(session.isThinking).toBe(true);
  });
});

describe('UciSession — bestmove', () => {
  function readySession(onBestMove: (san: string) => void) {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport, { onBestMove });
    fake.emit('uciok');
    fake.emit('readyok');
    return { fake, session };
  }

  test('converts UCI to SAN and invokes onBestMove', () => {
    const onBestMove = jest.fn();
    const { fake, session } = readySession(onBestMove);
    session.fireSearch(START_FEN);
    fake.emit('bestmove e2e4');
    expect(onBestMove).toHaveBeenCalledWith('e4');
    expect(onBestMove).toHaveBeenCalledTimes(1);
  });

  test('sets isThinking back to false once bestmove arrives', () => {
    const { fake, session } = readySession(jest.fn());
    session.fireSearch(START_FEN);
    expect(session.isThinking).toBe(true);
    fake.emit('bestmove e2e4');
    expect(session.isThinking).toBe(false);
  });

  test('does not invoke onBestMove for "bestmove (none)"', () => {
    const onBestMove = jest.fn();
    const { fake, session } = readySession(onBestMove);
    session.fireSearch(START_FEN);
    fake.emit('bestmove (none)');
    expect(onBestMove).not.toHaveBeenCalled();
  });

  test('uses the FEN of the most recently requested search for the UCI→SAN conversion', () => {
    const onBestMove = jest.fn();
    const { fake, session } = readySession(onBestMove);
    const fenAfterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    session.fireSearch(fenAfterE4);
    fake.emit('bestmove e7e5');
    expect(onBestMove).toHaveBeenCalledWith('e5');
  });
});

describe('UciSession — onThinkingChange', () => {
  test('fires true the moment a search actually fires when already ready, false on bestmove', () => {
    const onThinkingChange = jest.fn();
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport, { startReady: true, onThinkingChange });

    session.fireSearch(START_FEN);
    expect(onThinkingChange).toHaveBeenLastCalledWith(true);
    expect(session.isThinking).toBe(true);

    fake.emit('bestmove e2e4');
    expect(onThinkingChange).toHaveBeenLastCalledWith(false);
    expect(session.isThinking).toBe(false);
  });

  test('does NOT fire true merely because a search was queued before the handshake completed — only once it actually fires on readyok', () => {
    const onThinkingChange = jest.fn();
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport, { onThinkingChange });

    session.fireSearch(START_FEN);
    expect(onThinkingChange).not.toHaveBeenCalled();
    expect(session.isThinking).toBe(false);

    fake.emit('uciok');
    fake.emit('readyok');
    expect(onThinkingChange).toHaveBeenCalledWith(true);
    expect(session.isThinking).toBe(true);
  });

  test('fires false on "bestmove (none)" even though onBestMove never fires', () => {
    const onBestMove = jest.fn();
    const onThinkingChange = jest.fn();
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport, { startReady: true, onBestMove, onThinkingChange });

    session.fireSearch(START_FEN);
    fake.emit('bestmove (none)');

    expect(onBestMove).not.toHaveBeenCalled();
    expect(onThinkingChange).toHaveBeenLastCalledWith(false);
    expect(session.isThinking).toBe(false);
  });

  test('fires false on a bestmove UCI string that fails SAN conversion (illegal for the searched FEN) even though onBestMove never fires', () => {
    const onBestMove = jest.fn();
    const onThinkingChange = jest.fn();
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport, { startReady: true, onBestMove, onThinkingChange });

    // e2e5 is illegal from the start position (a pawn cannot move 3 squares) —
    // uciMoveToSan fails to convert it, so onBestMove must not fire, but the
    // session must still leave the "thinking" state.
    session.fireSearch(START_FEN);
    fake.emit('bestmove e2e5');

    expect(onBestMove).not.toHaveBeenCalled();
    expect(onThinkingChange).toHaveBeenLastCalledWith(false);
    expect(session.isThinking).toBe(false);
  });
});

describe('UciSession — destroy', () => {
  test('unsubscribes from the transport', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport);
    expect(fake.isUnsubscribed()).toBe(false);
    session.destroy();
    expect(fake.isUnsubscribed()).toBe(true);
  });
});

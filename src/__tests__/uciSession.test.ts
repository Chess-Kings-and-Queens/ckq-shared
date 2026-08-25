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
    const session = new UciSession(fake.transport, { skillLevel: 15 });

    expect(session.isReady).toBe(false);

    fake.emit('uciok');
    expect(fake.sent).toEqual([
      'uci',
      'setoption name Skill Level value 15',
      'ucinewgame',
      'isready',
    ]);
    expect(session.isReady).toBe(false);

    fake.emit('readyok');
    expect(session.isReady).toBe(true);
  });

  test('defaults skill level to 20', () => {
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
    const session = new UciSession(fake.transport, { skillLevel: 12, startReady: true });
    expect(fake.sent).toEqual(['setoption name Skill Level value 12']);
    expect(session.isReady).toBe(true);
  });

  test('a search fired immediately after construction fires right away, with no wait', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport, { startReady: true });
    fake.sent.length = 0;
    session.fireSearch(START_FEN, 500);
    expect(fake.sent).toEqual([`position fen ${START_FEN}`, 'go movetime 500']);
    expect(session.isThinking).toBe(true);
  });
});

describe('UciSession — fireSearch queueing', () => {
  test('a search fired before the handshake completes is queued, not sent immediately', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport);
    session.fireSearch(START_FEN, 500);
    expect(fake.sent).not.toContain(`position fen ${START_FEN}`);
    expect(session.isThinking).toBe(false);
  });

  test('the queued search fires automatically once ready', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport);
    session.fireSearch(START_FEN, 500);
    fake.emit('uciok');
    fake.emit('readyok');
    expect(fake.sent).toContain(`position fen ${START_FEN}`);
    expect(fake.sent).toContain('go movetime 500');
    expect(session.isThinking).toBe(true);
  });

  test('only the most recently requested search survives — earlier queued requests are overwritten, not queued as a list', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport);
    const firstFen = START_FEN;
    const secondFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    session.fireSearch(firstFen, 500);
    session.fireSearch(secondFen, 800);
    fake.emit('uciok');
    fake.emit('readyok');
    expect(fake.sent).not.toContain(`position fen ${firstFen}`);
    expect(fake.sent).toContain(`position fen ${secondFen}`);
    expect(fake.sent).toContain('go movetime 800');
  });

  test('fires position+go immediately when already ready', () => {
    const fake = makeFakeTransport();
    const session = new UciSession(fake.transport);
    fake.emit('uciok');
    fake.emit('readyok');
    fake.sent.length = 0;
    session.fireSearch(START_FEN, 1000);
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
    session.fireSearch(START_FEN, 500);
    fake.emit('bestmove e2e4');
    expect(onBestMove).toHaveBeenCalledWith('e4');
    expect(onBestMove).toHaveBeenCalledTimes(1);
  });

  test('sets isThinking back to false once bestmove arrives', () => {
    const { fake, session } = readySession(jest.fn());
    session.fireSearch(START_FEN, 500);
    expect(session.isThinking).toBe(true);
    fake.emit('bestmove e2e4');
    expect(session.isThinking).toBe(false);
  });

  test('does not invoke onBestMove for "bestmove (none)"', () => {
    const onBestMove = jest.fn();
    const { fake, session } = readySession(onBestMove);
    session.fireSearch(START_FEN, 500);
    fake.emit('bestmove (none)');
    expect(onBestMove).not.toHaveBeenCalled();
  });

  test('uses the FEN of the most recently requested search for the UCI→SAN conversion', () => {
    const onBestMove = jest.fn();
    const { fake, session } = readySession(onBestMove);
    const fenAfterE4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    session.fireSearch(fenAfterE4, 500);
    fake.emit('bestmove e7e5');
    expect(onBestMove).toHaveBeenCalledWith('e5');
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

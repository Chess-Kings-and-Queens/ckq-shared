import {
  classifyMoveAck,
  isGoneMoveAckError,
  MOVE_ACK_GONE_ERRORS,
  type BoardMoveAck,
  type BoardMoveOutcome,
} from '../liveboardMoveAck';
import type { LiveboardServerMove } from '../types/liveboardProtocol';
import type { MissionClock } from '../types/missions';

const CLOCK: MissionClock = {
  playerMs: 60000,
  engineMs: 60000,
  incrementMs: 0,
  turnStartedAt: '2026-11-20T17:00:00.000Z',
  serverNow: '2026-11-20T17:00:00.000Z',
};
const MOVES: LiveboardServerMove[] = [
  { san: 'e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', byPlayer: true, moveIndex: 0 },
];

describe('classifyMoveAck', () => {
  it.each<[string, BoardMoveAck, BoardMoveOutcome]>([
    ['{ ok: true }', { ok: true }, { kind: 'accepted', clock: null }],
    ['{ ok: true, clock }', { ok: true, clock: CLOCK }, { kind: 'accepted', clock: CLOCK }],
    ['duplicate', { ok: true, duplicate: true }, { kind: 'accepted', clock: null }],
    ['ignored already-finished', { ok: true, ignored: 'already-finished' }, { kind: 'already-finished' }],
    ['ignored coach', { ok: true, ignored: 'coach' }, { kind: 'gone' }],
    ['illegal-move with the server list', { ok: false, error: 'illegal-move', fen: 'f', moves: MOVES }, { kind: 'restore', moves: MOVES }],
    ['flagged with a clock', { ok: false, error: 'flagged', fen: 'f', moves: MOVES, clock: CLOCK }, { kind: 'flagged', moves: MOVES, clock: CLOCK }],
    ['move-index-gap', { ok: false, error: 'move-index-gap' }, { kind: 'gap' }],
    ['no-active-mission', { ok: false, error: 'no-active-mission' }, { kind: 'gone' }],
    ['no-participant', { ok: false, error: 'no-participant' }, { kind: 'gone' }],
    ['no-active-tournament', { ok: false, error: 'no-active-tournament' }, { kind: 'gone' }],
    ['no-such-game', { ok: false, error: 'no-such-game' }, { kind: 'gone' }],
    ['not-your-game', { ok: false, error: 'not-your-game' }, { kind: 'gone' }],
    ['move-failed', { ok: false, error: 'move-failed' }, { kind: 'threw', message: 'move-failed' }],
  ])('%s', (_name, ack, outcome) => {
    expect(classifyMoveAck(ack)).toEqual(outcome);
  });
});

describe('isGoneMoveAckError', () => {
  it.each([...MOVE_ACK_GONE_ERRORS])('%s is gone', (error) => {
    expect(isGoneMoveAckError(error)).toBe(true);
  });

  it.each(['move-index-gap', 'illegal-move', 'flagged', 'move-failed', '', 'No-active-mission'])('%j is not gone', (error) => {
    expect(isGoneMoveAckError(error)).toBe(false);
  });
});

describe('MOVE_ACK_GONE_ERRORS', () => {
  it('lists exactly the five codes, in order', () => {
    expect([...MOVE_ACK_GONE_ERRORS]).toEqual([
      'no-active-mission',
      'no-participant',
      'no-active-tournament',
      'no-such-game',
      'not-your-game',
    ]);
  });
});

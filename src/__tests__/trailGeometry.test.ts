import {
  AVATAR_PALETTE_SIZE,
  TRAIL_HEIGHT,
  TRAIL_STEPS,
  avatarPaletteIndex,
  checkpointIndex,
  formatTrailPoints,
  groupByStep,
  isCheckpoint,
  nodePosition,
  polyline,
  stepLabel,
  stepOf,
  stepPoints,
} from '../index';
import type { TrailCheckpoint, TrailClimber } from '../index';

const CHECKPOINTS: TrailCheckpoint[] = [
  { key: 'trailhead', name: 'Trailhead', fraction: 0, points: 0 },
  { key: 'foothills', name: 'Foothills', fraction: 0.25, points: 250 },
  { key: 'treeline', name: 'Treeline', fraction: 0.5, points: 500 },
  { key: 'ridge', name: 'Ridge', fraction: 0.75, points: 750 },
  { key: 'summit', name: 'Summit', fraction: 1, points: 1000 },
];

const climber = (overrides: Partial<TrailClimber>): TrailClimber => ({
  studentId: 'stu-1',
  name: 'Aarav K.',
  total: 700,
  rank: 1,
  isMe: false,
  canOpenActivity: false,
  ...overrides,
});

describe('stepOf', () => {
  it.each([
    [0, 1000, 0],
    [24, 1000, 0],
    [25, 1000, 1],
    [999, 1000, 39],
    [1000, 1000, 40],
    [1500, 1000, 40],
    [0, 800, 0],
    [19, 800, 0],
    [20, 800, 1],
    [800, 800, 40],
    [1200, 800, 40],
  ])('total %i with summit %i is step %i', (total, summit, step) => {
    expect(stepOf(total, summit)).toBe(step);
  });
});

describe('checkpoints', () => {
  it('are the steps 0, 10, 20, 30 and 40, indexed 0 to 4', () => {
    const checkpointSteps = Array.from({ length: TRAIL_STEPS + 1 }, (_, i) => i).filter(isCheckpoint);
    expect(checkpointSteps).toEqual([0, 10, 20, 30, 40]);
    expect(checkpointSteps.map(checkpointIndex)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('nodePosition', () => {
  it('matches the design handoff geometry', () => {
    expect(TRAIL_HEIGHT).toBe(680);
    const expectAt = (step: number, x: number, y: number) => {
      const pos = nodePosition(step);
      expect(pos.x).toBeCloseTo(x, 5);
      expect(pos.y).toBe(y);
    };
    expectAt(0, 4, 610);
    expectAt(1, 13.2, 610);
    expectAt(10, 96, 535);
    expectAt(11, 96 - 9.2, 460);
    expectAt(40, 4, 85);
  });
});

describe('polyline', () => {
  it('lists one point per node up to the step', () => {
    expect(polyline(0).split(' ')).toHaveLength(1);
    expect(polyline(3).split(' ')).toHaveLength(4);
    expect(polyline().split(' ')).toHaveLength(TRAIL_STEPS + 1);
  });
});

describe('stepPoints and stepLabel', () => {
  it('scales steps to the summit', () => {
    expect(stepPoints(10, 1000)).toBe(250);
    expect(stepPoints(40, 800)).toBe(800);
  });

  it('labels a checkpoint with its name and points', () => {
    expect(stepLabel(10, 1000, CHECKPOINTS)).toBe('Foothills · 250 pts');
    expect(stepLabel(40, 1000, CHECKPOINTS)).toBe('Summit · 1,000 pts');
  });

  it('labels an ordinary step with its point range', () => {
    expect(stepLabel(3, 1000, CHECKPOINTS)).toBe('75–100 pts');
  });
});

describe('groupByStep', () => {
  it('places climbers on their step and puts the isMe climber first', () => {
    const grouped = groupByStep(
      [
        climber({ studentId: 'a', total: 130, isMe: false }),
        climber({ studentId: 'b', total: 140, isMe: true }),
        climber({ studentId: 'c', total: 600, isMe: false }),
      ],
      1000
    );
    expect(grouped.get(5)?.map((c) => c.studentId)).toEqual(['b', 'a']);
    expect(grouped.get(24)?.map((c) => c.studentId)).toEqual(['c']);
    expect(grouped.get(0)).toBeUndefined();
  });
});

describe('avatarPaletteIndex', () => {
  it('is deterministic and within the palette', () => {
    const id = '64b7f0c2a1d3e4f5a6b7c8d9';
    expect(avatarPaletteIndex(id)).toBe(avatarPaletteIndex(id));
    expect(AVATAR_PALETTE_SIZE).toBe(7);
    for (let i = 0; i < 50; i += 1) {
      const studentId = (i * 7919 + 1).toString(16).padStart(24, 'a');
      const slot = avatarPaletteIndex(studentId);
      expect(Number.isInteger(slot)).toBe(true);
      expect(slot).toBeGreaterThanOrEqual(0);
      expect(slot).toBeLessThan(AVATAR_PALETTE_SIZE);
    }
  });

  it('spreads 50 distinct 24-hex ids over at least 5 slots', () => {
    const used = new Set<number>();
    for (let i = 0; i < 50; i += 1) {
      const studentId = `64b7f0c2a1d3e4f5${(0xa6b7c8d9 + i * 104729).toString(16)}`;
      used.add(avatarPaletteIndex(studentId));
    }
    expect(used.size).toBeGreaterThanOrEqual(5);
  });

  it('keeps one pinned vector so the hash cannot change silently and desync the clients', () => {
    expect(avatarPaletteIndex('64b7f0c2a1d3e4f5a6b7c8d9')).toBe(6);
  });
});

describe('formatTrailPoints', () => {
  it('groups thousands', () => {
    expect(formatTrailPoints(1000)).toBe('1,000');
    expect(formatTrailPoints(40)).toBe('40');
  });
});

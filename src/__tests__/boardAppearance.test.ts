import * as shared from '../index';
import {
  parseBoardPreferencesResponse,
  toBoardAppearance,
  type BoardPreferences,
  type BoardPreferencesResponse,
  type BoardTheme,
  type PieceSet,
  type PieceKey,
} from '../index';

function makeTheme(id: string, isDefault: boolean): BoardTheme {
  return {
    id,
    name: `Theme ${id}`,
    tagline: `Tagline ${id}`,
    sortOrder: isDefault ? 0 : 1,
    isDefault,
    colors: {
      lightSquare: '#111111',
      darkSquare: '#222222',
      frame: '#333333',
      coordOnFrame: '#444444',
      lastMove: 'rgba(1, 2, 3, 0.4)',
      selected: 'rgba(4, 5, 6, 0.5)',
      moveDest: 'rgba(7, 8, 9, 0.6)',
    },
    previewFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  };
}

function makePieceSet(id: string, isDefault: boolean): PieceSet {
  const url = (key: PieceKey) => `https://assets.test/pieces/v1/${id}/${key}.svg`;
  const pieces: Record<PieceKey, string> = {
    wK: url('wK'), wQ: url('wQ'), wR: url('wR'), wB: url('wB'), wN: url('wN'), wP: url('wP'),
    bK: url('bK'), bQ: url('bQ'), bR: url('bR'), bB: url('bB'), bN: url('bN'), bP: url('bP'),
  };
  return { id, name: `Set ${id}`, tagline: `Tagline ${id}`, sortOrder: isDefault ? 0 : 1, isDefault, pieces, attribution: null };
}

const classic = makeTheme('classic', true);
const ocean = makeTheme('ocean', false);
const cburnett = makePieceSet('cburnett', true);
const dino = makePieceSet('dino', false);

const full: BoardPreferences = {
  showMoveHints: false,
  boardThemeId: 'ocean',
  pieceSetId: 'retired-set',
  boardTheme: ocean,
  pieceSet: cburnett,
  catalog: { boardThemes: [classic, ocean], pieceSets: [cburnett, dino] },
};

/** The full body with one resolved field absent, as an older or partial backend would send it. */
function without(key: 'boardTheme' | 'pieceSet' | 'catalog'): BoardPreferencesResponse {
  const body: BoardPreferencesResponse = { ...full };
  delete body[key];
  return body;
}

describe('parseBoardPreferencesResponse', () => {
  test('an older backend body with only showMoveHints gives null', () => {
    const body: BoardPreferencesResponse = { showMoveHints: true };
    expect(parseBoardPreferencesResponse(body)).toBeNull();
  });

  test.each(['catalog', 'boardTheme', 'pieceSet'] as const)('a body without %s gives null', (key) => {
    expect(parseBoardPreferencesResponse(without(key))).toBeNull();
  });

  test('a full body gives the resolved theme, set and catalog; stored ids are not carried (the resolved ids are the selection)', () => {
    expect(parseBoardPreferencesResponse(full)).toEqual({ boardTheme: ocean, pieceSet: cburnett, catalog: full.catalog });
  });
});

describe('toBoardAppearance', () => {
  test('equals parseBoardPreferencesResponse for a full body', () => {
    expect(toBoardAppearance(full)).toEqual(parseBoardPreferencesResponse(full));
  });
});

describe('package index', () => {
  test('exports both functions', () => {
    expect(shared.parseBoardPreferencesResponse).toBe(parseBoardPreferencesResponse);
    expect(shared.toBoardAppearance).toBe(toBoardAppearance);
  });
});

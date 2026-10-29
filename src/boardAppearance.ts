import type { BoardPreferences, BoardTheme, PieceSet } from './types/student';

/**
 * GET /student-activity/board-preferences as a client may receive it. A backend older than the
 * appearance catalog (board-themes-and-piece-sets-plan.md D17) sends `showMoveHints` alone, so every
 * other field is optional here. Clients never read this shape directly: they parse it (D18).
 */
export type BoardPreferencesResponse = Pick<BoardPreferences, 'showMoveHints'> &
  Partial<Omit<BoardPreferences, 'showMoveHints'>>;

/**
 * What every board and the Settings pickers draw, parsed from a complete server body. The selected
 * tiles are `boardTheme.id` / `pieceSet.id`: the server resolved the stored choice (D2), so a retired
 * stored id shows its default as selected. The raw stored ids are not carried (D18).
 */
export interface BoardAppearance {
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  catalog: BoardPreferences['catalog'];
}

/** A complete body (the PATCH response, or a parsed GET) → its appearance. */
export function toBoardAppearance(body: BoardPreferences): BoardAppearance {
  return {
    boardTheme: body.boardTheme,
    pieceSet: body.pieceSet,
    catalog: body.catalog,
  };
}

/** The GET body → its appearance, or null when the backend did not send the resolved theme, set and catalog. */
export function parseBoardPreferencesResponse(body: BoardPreferencesResponse): BoardAppearance | null {
  const { boardTheme, pieceSet, catalog } = body;
  if (!boardTheme || !pieceSet || !catalog) return null;
  return toBoardAppearance({
    showMoveHints: body.showMoveHints,
    boardThemeId: body.boardThemeId ?? null,
    pieceSetId: body.pieceSetId ?? null,
    boardTheme,
    pieceSet,
    catalog,
  });
}

import { getErrorMessage, GENERIC_LOAD_ERROR_MESSAGE } from '../apiErrors';

// Cases moved verbatim from website2.0 src/__test__/hooks/useLoadState.test.ts
// (describe "getErrorMessage").
describe("getErrorMessage", () => {
  it("extracts a backend-provided message for a 400 validation error", () => {
    const err = { response: { status: 400, data: { message: "USCF ID is already in use." } } };
    expect(getErrorMessage(err)).toBe("USCF ID is already in use.");
  });

  it("falls back to the generic message for a 404, even with a backend message (raw route leak)", () => {
    const err = { response: { status: 404, data: { message: "Route /api/v1/some/internal/path" } } };
    expect(getErrorMessage(err)).toBe("Couldn't load this — please try again.");
  });

  it("falls back to the generic message for a 500, even with a backend message (raw DB-error leak)", () => {
    const err = { response: { status: 500, data: { message: "MongoError: E11000 duplicate key" } } };
    expect(getErrorMessage(err)).toBe("Couldn't load this — please try again.");
  });

  it("falls back to the generic message when there is no backend message", () => {
    const err = new Error("some internal detail");
    expect(getErrorMessage(err)).toBe("Couldn't load this — please try again.");
  });

  it("falls back to the generic message for a network error with no response", () => {
    const err = { message: "Network Error" };
    expect(getErrorMessage(err)).toBe("Couldn't load this — please try again.");
  });

  it("falls back to the generic message when the backend message is an empty string", () => {
    const err = { response: { status: 400, data: { message: "   " } } };
    expect(getErrorMessage(err)).toBe("Couldn't load this — please try again.");
  });

  it("handles a completely non-object error value", () => {
    expect(getErrorMessage("just a string")).toBe("Couldn't load this — please try again.");
    expect(getErrorMessage(null)).toBe("Couldn't load this — please try again.");
    expect(getErrorMessage(undefined)).toBe("Couldn't load this — please try again.");
  });

  it("exports the generic message constant", () => {
    expect(GENERIC_LOAD_ERROR_MESSAGE).toBe("Couldn't load this — please try again.");
  });
});

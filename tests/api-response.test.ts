import { describe, expect, it } from "vitest";
import { fail, ok } from "@/shared/utils/api-response";

describe("api response helpers", () => {
  it("creates a consistent success response", () => {
    expect(ok({ id: "1" })).toEqual({
      success: true,
      data: { id: "1" },
      error: null,
      meta: {}
    });
  });

  it("creates a consistent failure response", () => {
    expect(fail("VALIDATION_ERROR", "Datos invalidos")).toMatchObject({
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "Datos invalidos"
      },
      meta: {}
    });
  });
});

import { describe, expect, it } from "vitest";

import { calculate, calculateInputSchema, calculateOutputSchema } from "./calculate.js";

describe("calculate", () => {
  it.each([
    [{ operation: "add", left: 7, right: 5 } as const, 12],
    [{ operation: "subtract", left: 7, right: 5 } as const, 2],
    [{ operation: "multiply", left: 7, right: 5 } as const, 35],
    [{ operation: "divide", left: 10, right: 4 } as const, 2.5],
  ])("returns validated deterministic output for %o", (input, expected) => {
    const result = calculate(input);
    expect(result.result).toBe(expected);
    expect(calculateOutputSchema.safeParse(result).success).toBe(true);
  });

  it("rejects division by zero", () => {
    expect(() => calculate({ operation: "divide", left: 1, right: 0 })).toThrow(
      "Division by zero",
    );
  });

  it("rejects malformed input", () => {
    expect(
      calculateInputSchema.safeParse({ operation: "power", left: 2, right: 3 }).success,
    ).toBe(false);
  });
});

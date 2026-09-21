import { describe, expect, it } from "vitest";

import { AppError } from "./errors.js";
import { requirePermission } from "./permissions.js";

describe("requirePermission", () => {
  it("allows a granted capability", () => {
    expect(() => requirePermission(new Set(["system:read"]), "system:read")).not.toThrow();
  });

  it("blocks a missing capability with a stable error code", () => {
    expect(() => requirePermission(new Set(), "system:read")).toThrowError(
      expect.objectContaining<Partial<AppError>>({ code: "PERMISSION_DENIED" }),
    );
  });
});

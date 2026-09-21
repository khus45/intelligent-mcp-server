import { AppError } from "./errors.js";

export function requirePermission(
  granted: ReadonlySet<string>,
  required: string,
): void {
  if (!granted.has(required)) {
    throw new AppError(
      "PERMISSION_DENIED",
      `Missing required permission: ${required}`,
      { requiredPermission: required },
    );
  }
}

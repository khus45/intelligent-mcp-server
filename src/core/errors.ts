export type ErrorCode =
  | "PERMISSION_DENIED"
  | "INVALID_INPUT"
  | "INVALID_OUTPUT"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly safeDetails?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toSafeError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  return new AppError(
    "INTERNAL_ERROR",
    "The tool could not complete the request.",
  );
}

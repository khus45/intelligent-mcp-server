import { randomUUID } from "node:crypto";
import { z } from "zod";

import { AppError, toSafeError } from "./errors.js";

export function validateOutput<T extends z.ZodType>(
  schema: T,
  value: unknown,
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError("INVALID_OUTPUT", "Tool output failed validation.");
  }
  return result.data;
}

export function errorResult(error: unknown, traceId = randomUUID()) {
  const safeError = toSafeError(error);
  return {
    isError: true as const,
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({
          ok: false,
          error: {
            code: safeError.code,
            message: safeError.message,
            details: safeError.safeDetails,
          },
          traceId,
        }),
      },
    ],
  };
}

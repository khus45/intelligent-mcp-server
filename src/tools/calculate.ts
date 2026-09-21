import { z } from "zod";

import { AppError } from "../core/errors.js";

export const calculateInputSchema = z.object({
  operation: z
    .enum(["add", "subtract", "multiply", "divide"])
    .describe("Exact arithmetic operation to perform."),
  left: z.number().finite().describe("Left-hand operand."),
  right: z.number().finite().describe("Right-hand operand."),
});

export const calculateOutputSchema = z.object({
  operation: z.enum(["add", "subtract", "multiply", "divide"]),
  left: z.number().finite(),
  right: z.number().finite(),
  result: z.number().finite(),
});

export type CalculateInput = z.infer<typeof calculateInputSchema>;

export function calculate(input: CalculateInput) {
  let result: number;

  switch (input.operation) {
    case "add":
      result = input.left + input.right;
      break;
    case "subtract":
      result = input.left - input.right;
      break;
    case "multiply":
      result = input.left * input.right;
      break;
    case "divide":
      if (input.right === 0) {
        throw new AppError("INVALID_INPUT", "Division by zero is not allowed.");
      }
      result = input.left / input.right;
      break;
  }

  if (!Number.isFinite(result)) {
    throw new AppError("INVALID_OUTPUT", "Calculation produced a non-finite result.");
  }

  return { ...input, result };
}

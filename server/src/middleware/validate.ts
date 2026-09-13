import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";

export type RequestPart = "body" | "query" | "params";

/**
 * Generic validation middleware factory. Validates the given part(s) of the
 * request against a zod schema and, on failure, responds 400 with
 * field-level error details instead of reaching the route handler.
 *
 * Usage: router.post("/x", validate(mySchema), handler)
 * By default validates req.body; pass `part` to validate query/params instead.
 */
export function validate(schema: AnyZodObject, part: RequestPart = "body") {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const zodError = result.error as ZodError;
      res.status(400).json({
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          details: zodError.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
      return;
    }

    // Replace with parsed (and coerced/defaulted) data.
    req[part] = result.data;
    next();
  };
}

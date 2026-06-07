import { FieldValues, Resolver, FieldErrors } from "react-hook-form";
import { ZodSchema } from "zod";

export const zodResolver = <T extends FieldValues>(schema: ZodSchema<T>): Resolver<T> => {
  return async (values) => {
    const result = await schema.safeParseAsync(values);
    if (result.success) {
      return {
        values: result.data,
        errors: {},
      };
    }

    const errors = result.error.issues.reduce((acc, current) => {
      const fieldName = current.path.join(".") as string;
      acc[fieldName] = {
        type: current.code,
        message: current.message,
      };
      return acc;
    }, {} as Record<string, { type: string; message: string }>) as FieldErrors<T>;

    return {
      values: {},
      errors,
    };
  };
};

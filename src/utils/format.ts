import { ZodError } from "zod";

export const formatValidationError = (errors: ZodError) => {
    if (!errors) return "Validation failed";

    if (Array.isArray(errors)) return errors.map((i) => i.message).join(", ");

    return JSON.stringify(errors);
};

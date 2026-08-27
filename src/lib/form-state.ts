/**
 * Shared shape for Server Action form results.
 *
 * This deliberately lives outside the "use server" module: a file with that
 * directive may only export async functions, so exporting the initial-state
 * constant from there silently yields `undefined` at runtime.
 */
export type AuthFormState = {
  ok: boolean;
  message: string;
  /** Field-scoped messages from the API's 422 response. */
  errors: Record<string, string>;
};

export const EMPTY_FORM_STATE: AuthFormState = {
  ok: false,
  message: "",
  errors: {},
};

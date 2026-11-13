declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type Email = Brand<string, "Email">;
export type UserId = Brand<string, "UserId">;

export interface Session {
  userId: UserId;
  email: Email;
}

export const PASSWORD_MIN_LENGTH = 8;

export type EmailProblem = "missing" | "malformed" | "rejected";
export type PasswordProblem = "missing" | "too_short" | "too_weak";

export type FieldErrors =
  | { email: EmailProblem; password?: PasswordProblem }
  | { email?: EmailProblem; password: PasswordProblem };

type SignedIn = { kind: "signed_in"; session: Session };
type ConfirmationPending = { kind: "confirmation_pending"; email: Email };
type Invalid = { kind: "invalid"; errors: FieldErrors };
type RateLimited = { kind: "rate_limited" };
type Unavailable = { kind: "unavailable"; cause: string };

export type SignUpOutcome =
  | SignedIn
  | ConfirmationPending
  | { kind: "email_taken"; email: Email }
  | Invalid
  | RateLimited
  | Unavailable;

export type SignInOutcome =
  | SignedIn
  | ConfirmationPending
  | { kind: "bad_credentials" }
  | Invalid
  | RateLimited
  | Unavailable;

export type ConfirmationNotice = "email_confirmed" | "link_invalid";

export type PasswordResetOutcome =
  | { kind: "reset_sent"; email: Email }
  | { kind: "invalid"; errors: { email: EmailProblem } }
  | RateLimited
  | Unavailable;

/** Where a signed-in student lands. */
export const SIGNED_IN_PATH = "/dashboard";
export const LOGIN_PATH = "/login";

export interface Auth {
  signUp(form: FormData, confirmUrl: URL): Promise<SignUpOutcome>;
  signIn(form: FormData): Promise<SignInOutcome>;
  requestPasswordReset(form: FormData, redirectTo: URL): Promise<PasswordResetOutcome>;
  signOut(): Promise<void>;
  session(): Promise<Session | null>;
}

export interface AuthClient {
  signUp(credentials: {
    email: string;
    password: string;
    options: { emailRedirectTo: string };
  }): Promise<AuthResult>;
  signInWithPassword(credentials: { email: string; password: string }): Promise<AuthResult>;
  resetPasswordForEmail(
    email: string,
    options: { redirectTo: string },
  ): Promise<{ data: object | null; error: AuthFailure | null }>;
  signOut(options: { scope: "local" }): Promise<{ error: AuthFailure | null }>;
  getClaims(): Promise<ClaimsResult>;
}

export interface AuthResult {
  data: { user: AuthUser | null; session: object | null };
  error: AuthFailure | null;
}

export interface AuthUser {
  id: string;
  email?: string;
  /** Empty when signUp hit an existing confirmed account and confirmation is on. */
  identities?: readonly unknown[];
}

export interface AuthFailure {
  name: string;
  message: string;
  code?: string;
  status?: number;
}

export interface ClaimsResult {
  data: { claims: { sub: string; email?: string } } | null;
  error: AuthFailure | null;
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Credentials = { email: Email; password: string };

export function createAuth(client: AuthClient): Auth {
  return {
    async signUp(form, confirmUrl) {
      const parsed = parseCredentials(form, "sign_up");
      if (!parsed.ok) return { kind: "invalid", errors: parsed.errors };
      try {
        const result = await client.signUp({
          email: parsed.credentials.email,
          password: parsed.credentials.password,
          options: { emailRedirectTo: confirmUrl.href },
        });
        return decodeSignUp(result, parsed.credentials.email);
      } catch (error) {
        return { kind: "unavailable", cause: thrownCause(error) };
      }
    },
    async signIn(form) {
      const parsed = parseCredentials(form, "sign_in");
      if (!parsed.ok) return { kind: "invalid", errors: parsed.errors };
      try {
        const result = await client.signInWithPassword({
          email: parsed.credentials.email,
          password: parsed.credentials.password,
        });
        return decodeSignIn(result, parsed.credentials.email);
      } catch (error) {
        return { kind: "unavailable", cause: thrownCause(error) };
      }
    },
    async requestPasswordReset(form, redirectTo) {
      const emailParsed = parseEmail(fieldText(form, "email"));
      if (!emailParsed.ok) return { kind: "invalid", errors: { email: emailParsed.problem } };
      try {
        const result = await client.resetPasswordForEmail(emailParsed.email, { redirectTo: redirectTo.href });
        if (result.error) return decodeResetError(result.error);
        return { kind: "reset_sent", email: emailParsed.email };
      } catch (error) {
        return { kind: "unavailable", cause: thrownCause(error) };
      }
    },
    async signOut() {
      await client.signOut({ scope: "local" });
    },
    async session() {
      try {
        return decodeClaims(await client.getClaims());
      } catch {
        return null;
      }
    },
  };
}

export function destinationAfterVerify(session: Session | null): typeof SIGNED_IN_PATH | typeof LOGIN_PATH {
  if (session) return SIGNED_IN_PATH;
  return LOGIN_PATH;
}

export function displayEmail(raw: string | undefined): Email | null {
  if (!raw) return null;
  const parsed = parseEmail(raw);
  return parsed.ok ? parsed.email : null;
}

export function confirmationNotice(
  query: Readonly<Record<string, string | string[] | undefined>>,
): ConfirmationNotice | null {
  if (queryPresent(query.error_code)) return "link_invalid";
  if (queryPresent(query.code)) return "email_confirmed";
  return null;
}

function queryPresent(value: string | string[] | undefined): boolean {
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.some((entry) => entry.length > 0);
  return false;
}

function parseCredentials(
  form: FormData,
  policy: "sign_up" | "sign_in",
): { ok: true; credentials: Credentials } | { ok: false; errors: FieldErrors } {
  const emailParsed = parseEmail(fieldText(form, "email"));
  const password = fieldText(form, "password");
  const passwordIssue = passwordProblem(password, policy);
  if (!emailParsed.ok) {
    return {
      ok: false,
      errors: passwordIssue ? { email: emailParsed.problem, password: passwordIssue } : { email: emailParsed.problem },
    };
  }
  if (passwordIssue) return { ok: false, errors: { password: passwordIssue } };
  return { ok: true, credentials: { email: emailParsed.email, password } };
}

function fieldText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function parseEmail(raw: string): { ok: true; email: Email } | { ok: false; problem: EmailProblem } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, problem: "missing" };
  const normalized = trimmed.toLowerCase();
  if (!EMAIL_SHAPE.test(normalized)) return { ok: false, problem: "malformed" };
  return { ok: true, email: normalized as Email };
}

function passwordProblem(password: string, policy: "sign_up" | "sign_in"): PasswordProblem | null {
  if (password.length === 0) return "missing";
  switch (policy) {
    case "sign_up":
      return password.length < PASSWORD_MIN_LENGTH ? "too_short" : null;
    case "sign_in":
      return null;
    default: {
      const unreachable: never = policy;
      return unreachable;
    }
  }
}

function accountEmail(value: string | undefined): Email | null {
  if (!value) return null;
  const parsed = parseEmail(value);
  return parsed.ok ? parsed.email : null;
}

function userId(value: string): UserId {
  return value as UserId;
}

function decodeSignUp(result: AuthResult, email: Email): SignUpOutcome {
  const signedIn = decodeSignedIn(result, email);
  if (signedIn) return signedIn;
  if (result.error) return decodeSignUpError(result.error, email);
  if (result.data.session) return { kind: "unavailable", cause: "no_session" };
  return decodeSignUpUser(result.data.user, email);
}

function decodeSignIn(result: AuthResult, email: Email): SignInOutcome {
  const signedIn = decodeSignedIn(result, email);
  if (signedIn) return signedIn;
  if (!result.error) return { kind: "unavailable", cause: "no_session" };
  return decodeSignInError(result.error, email);
}

function decodeSignedIn(result: AuthResult, submitted: Email): SignedIn | null {
  const { user, session } = result.data;
  if (!session || !user || user.id.length === 0) return null;
  return {
    kind: "signed_in",
    session: { userId: userId(user.id), email: accountEmail(user.email) ?? submitted },
  };
}

function decodeSignUpUser(user: AuthUser | null, email: Email): SignUpOutcome {
  if (!user) return { kind: "unavailable", cause: "no_session" };
  if (Array.isArray(user.identities) && user.identities.length === 0) {
    return { kind: "email_taken", email };
  }
  return { kind: "confirmation_pending", email };
}

function decodeSignUpError(error: AuthFailure, email: Email): SignUpOutcome {
  const shared = sharedFailure(error);
  if (shared) return shared;
  if (error.code === "user_already_exists" || error.code === "email_exists") {
    return { kind: "email_taken", email };
  }
  return { kind: "unavailable", cause: failureCause(error) };
}

function decodeResetError(error: AuthFailure): PasswordResetOutcome {
  const shared = sharedFailure(error);
  if (!shared) return { kind: "unavailable", cause: failureCause(error) };
  switch (shared.kind) {
    case "rate_limited":
      return shared;
    case "invalid":
      if (shared.errors.email) return { kind: "invalid", errors: { email: shared.errors.email } };
      return { kind: "unavailable", cause: failureCause(error) };
    default: {
      const unhandled: never = shared;
      return unhandled;
    }
  }
}

function decodeSignInError(error: AuthFailure, email: Email): SignInOutcome {
  const shared = sharedFailure(error);
  if (shared) return shared;
  switch (error.code) {
    case "invalid_credentials":
      return { kind: "bad_credentials" };
    case "email_not_confirmed":
      return { kind: "confirmation_pending", email };
    default:
      return { kind: "unavailable", cause: failureCause(error) };
  }
}

function sharedFailure(error: AuthFailure): Invalid | RateLimited | null {
  if (
    error.status === 429 ||
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit"
  ) {
    return { kind: "rate_limited" };
  }
  switch (error.code) {
    case "weak_password":
      return { kind: "invalid", errors: { password: "too_weak" } };
    case "email_address_invalid":
      return { kind: "invalid", errors: { email: "rejected" } };
    default:
      return null;
  }
}

function failureCause(error: AuthFailure): string {
  return error.code ?? `status ${error.status}`;
}

function decodeClaims(result: ClaimsResult): Session | null {
  if (result.error || !result.data) return null;
  const email = accountEmail(result.data.claims.email);
  if (result.data.claims.sub.length === 0 || !email) return null;
  return { userId: userId(result.data.claims.sub), email };
}

function thrownCause(error: unknown): string {
  return error instanceof Error ? error.message : "auth_threw";
}

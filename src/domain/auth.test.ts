import { describe, expect, it } from "vitest";
import {
  createAuth,
  destinationAfterVerify,
  displayEmail,
  type AuthClient,
  type AuthResult,
  type AuthUser,
  type Session,
} from "./auth";

const CONFIRM_URL = new URL("http://localhost:3000/login");

const JOSE: AuthUser = {
  id: "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b",
  email: "jose@osu.edu",
  identities: [{ provider: "email" }],
};

const SIGNED_IN: AuthResult = {
  data: { user: JOSE, session: { access_token: "header.payload.signature", user: JOSE } },
  error: null,
};

const INVALID_CREDENTIALS: AuthResult = {
  data: { user: null, session: null },
  error: { name: "AuthApiError", message: "Invalid login credentials", status: 400, code: "invalid_credentials" },
};

const EMAIL_NOT_CONFIRMED: AuthResult = {
  data: { user: null, session: null },
  error: { name: "AuthApiError", message: "Email not confirmed", status: 400, code: "email_not_confirmed" },
};

const AWAITING_CONFIRMATION: AuthResult = {
  data: {
    user: { id: "0b7e4d1a-9f2c-4c3b-a1d8-5e6f7a8b9c0d", email: "new@osu.edu", identities: [{ provider: "email" }] },
    session: null,
  },
  error: null,
};

const IDENTITIES_OMITTED: AuthResult = {
  data: {
    user: { id: "0b7e4d1a-9f2c-4c3b-a1d8-5e6f7a8b9c0d", email: "new@osu.edu" },
    session: null,
  },
  error: null,
};

const EXISTING_CONFIRMED: AuthResult = {
  data: { user: { id: "obfuscated", email: "jose@osu.edu", identities: [] }, session: null },
  error: null,
};

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

function stub(methods: Partial<AuthClient>): AuthClient {
  const unexpected = (name: string) => async () => {
    throw new Error(`unexpected ${name} call`);
  };
  return {
    signUp: methods.signUp ?? unexpected("signUp"),
    signInWithPassword: methods.signInWithPassword ?? unexpected("signInWithPassword"),
    resetPasswordForEmail: methods.resetPasswordForEmail ?? unexpected("resetPasswordForEmail"),
    signOut: methods.signOut ?? unexpected("signOut"),
    getClaims: methods.getClaims ?? unexpected("getClaims"),
  };
}

describe("signIn", () => {
  it("returns the session for the right password, sending the normalized email", async () => {
    const sent: unknown[] = [];
    const auth = createAuth(
      stub({
        signInWithPassword: async (credentials) => {
          sent.push(credentials);
          return SIGNED_IN;
        },
      }),
    );

    const outcome = await auth.signIn(form({ email: "  Jose@OSU.edu ", password: "correct-horse" }));

    expect(outcome).toEqual({
      kind: "signed_in",
      session: { userId: "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b", email: "jose@osu.edu" },
    });
    expect(sent).toEqual([{ email: "jose@osu.edu", password: "correct-horse" }]);
  });

  it("reports a wrong password as bad credentials", async () => {
    const auth = createAuth(stub({ signInWithPassword: async () => INVALID_CREDENTIALS }));
    expect(await auth.signIn(form({ email: "jose@osu.edu", password: "wrong-horse" }))).toEqual({
      kind: "bad_credentials",
    });
  });

  it("holds an unconfirmed account at confirmation pending", async () => {
    const auth = createAuth(stub({ signInWithPassword: async () => EMAIL_NOT_CONFIRMED }));
    expect(await auth.signIn(form({ email: "new@osu.edu", password: "battery-staple" }))).toEqual({
      kind: "confirmation_pending",
      email: "new@osu.edu",
    });
  });
});

describe("signUp", () => {
  it("is confirmation pending, not signed in, when Supabase returns a user and no session", async () => {
    const sent: unknown[] = [];
    const auth = createAuth(
      stub({
        signUp: async (credentials) => {
          sent.push(credentials);
          return AWAITING_CONFIRMATION;
        },
      }),
    );

    const outcome = await auth.signUp(form({ email: "new@osu.edu", password: "battery-staple" }), CONFIRM_URL);

    expect(outcome).toEqual({ kind: "confirmation_pending", email: "new@osu.edu" });
    expect(sent).toEqual([
      {
        email: "new@osu.edu",
        password: "battery-staple",
        options: { emailRedirectTo: "http://localhost:3000/login" },
      },
    ]);
  });

  it("is confirmation pending when the sign-up user omits identities", async () => {
    const auth = createAuth(stub({ signUp: async () => IDENTITIES_OMITTED }));
    expect(await auth.signUp(form({ email: "new@osu.edu", password: "battery-staple" }), CONFIRM_URL)).toEqual({
      kind: "confirmation_pending",
      email: "new@osu.edu",
    });
  });

  it("reports an existing confirmed address as taken instead of pending", async () => {
    const auth = createAuth(stub({ signUp: async () => EXISTING_CONFIRMED }));
    expect(await auth.signUp(form({ email: "jose@osu.edu", password: "battery-staple" }), CONFIRM_URL)).toEqual({
      kind: "email_taken",
      email: "jose@osu.edu",
    });
  });

  it("rejects a short password without calling Supabase", async () => {
    const auth = createAuth(stub({}));
    expect(await auth.signUp(form({ email: "new@osu.edu", password: "short" }), CONFIRM_URL)).toEqual({
      kind: "invalid",
      errors: { password: "too_short" },
    });
  });
});

describe("signOut", () => {
  it("resolves when the client reports a revoke error after clearing the session", async () => {
    const scopes: string[] = [];
    const auth = createAuth(
      stub({
        signOut: async (options) => {
          scopes.push(options.scope);
          return { error: { name: "AuthApiError", message: "revoke failed", status: 500 } };
        },
      }),
    );

    await expect(auth.signOut()).resolves.toBeUndefined();
    expect(scopes).toEqual(["local"]);
  });

  it("rejects when clearing the local session throws", async () => {
    const auth = createAuth(
      stub({
        signOut: async () => {
          throw new Error("storage failed");
        },
      }),
    );

    await expect(auth.signOut()).rejects.toThrow("storage failed");
  });
});

describe("session", () => {
  it("reads the claims, and reads signed out instead of throwing when Supabase fails", async () => {
    const live = createAuth(
      stub({
        getClaims: async () => ({
          data: { claims: { sub: "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b", email: "jose@osu.edu" } },
          error: null,
        }),
      }),
    );
    const down = createAuth(stub({}));

    expect(await live.session()).toEqual({
      userId: "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b",
      email: "jose@osu.edu",
    });
    expect(await down.session()).toBeNull();
  });
});

const RESET_URL = new URL("http://localhost:3000/reset-password");
const JOSE_SESSION: Session = {
  userId: "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b" as Session["userId"],
  email: "jose@osu.edu" as Session["email"],
};

describe("requestPasswordReset", () => {
  it("does not ask Supabase to send mail when the address is blank or malformed", async () => {
    const auth = createAuth(stub({}));

    expect(await auth.requestPasswordReset(form({ email: "   " }), RESET_URL)).toEqual({
      kind: "invalid",
      errors: { email: "missing" },
    });
    expect(await auth.requestPasswordReset(form({ email: "not-an-email" }), RESET_URL)).toEqual({
      kind: "invalid",
      errors: { email: "malformed" },
    });
  });

  it("sends a reset only for the address the student submitted", async () => {
    const sent: unknown[] = [];
    const auth = createAuth(
      stub({
        resetPasswordForEmail: async (email, options) => {
          sent.push({ email, options });
          return { data: {}, error: null };
        },
      }),
    );

    expect(await auth.requestPasswordReset(form({ email: "  Jose@OSU.edu " }), RESET_URL)).toEqual({
      kind: "reset_sent",
      email: "jose@osu.edu",
    });
    expect(sent).toEqual([
      { email: "jose@osu.edu", options: { redirectTo: "http://localhost:3000/reset-password" } },
    ]);
  });

  it("reports accounts unavailable when Supabase is not configured, without throwing", async () => {
    const auth = createAuth(
      stub({
        resetPasswordForEmail: async () => ({
          data: null,
          error: { name: "AuthConfigError", message: "Supabase env is not set", code: "not_configured" },
        }),
      }),
    );

    expect(await auth.requestPasswordReset(form({ email: "jose@osu.edu" }), RESET_URL)).toEqual({
      kind: "unavailable",
      cause: "not_configured",
    });
  });
});

describe("destinationAfterVerify", () => {
  it("sends a student who is not signed in to log in", () => {
    expect(destinationAfterVerify(null)).toBe("/login");
  });

  it("continues a student who already has a session", () => {
    expect(destinationAfterVerify(JOSE_SESSION)).toBe("/dashboard");
  });
});

describe("displayEmail", () => {
  it("shows the normalized address and hides a value that is not an email", () => {
    expect(displayEmail("  Jose@OSU.edu ")).toBe("jose@osu.edu");
    expect(displayEmail("not-an-email")).toBeNull();
    expect(displayEmail(undefined)).toBeNull();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  requestPasswordReset: vi.fn(),
  session: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ origin: "http://localhost:3000" }),
}));

vi.mock("@/adapters/supabase", () => ({
  requestAuth: async () => auth,
}));

import { continueAfterVerifyAction, requestResetAction, signInAction, signUpAction } from "./actions";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("signInAction", () => {
  beforeEach(() => {
    auth.signIn.mockReset();
    auth.signUp.mockReset();
    auth.requestPasswordReset.mockReset();
    auth.session.mockReset();
  });

  it("stays on the form when the password is wrong and keeps the submitted email", async () => {
    auth.signIn.mockResolvedValue({ kind: "bad_credentials" });
    const submitted = form({ email: "jose@osu.edu", password: "wrong-horse" });

    await expect(signInAction(null, submitted)).resolves.toEqual({ kind: "bad_credentials" });

    expect(auth.signIn).toHaveBeenCalledOnce();
    expect((auth.signIn.mock.calls[0][0] as FormData).get("email")).toBe("jose@osu.edu");
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("sends an unconfirmed sign-in to the verify screen instead of starting a session", async () => {
    auth.signIn.mockResolvedValue({ kind: "confirmation_pending", email: "new@osu.edu" });

    await expect(signInAction(null, form({ email: "new@osu.edu", password: "battery-staple" }))).rejects.toThrow(
      "REDIRECT:/verify?email=new%40osu.edu",
    );
  });
});

describe("signUpAction", () => {
  beforeEach(() => {
    auth.signUp.mockReset();
  });

  it("does not start a session and opens the verify screen for a new account", async () => {
    auth.signUp.mockResolvedValue({ kind: "confirmation_pending", email: "new@osu.edu" });

    await expect(
      signUpAction(null, form({ name: "Maya Chen", email: "new@osu.edu", password: "battery-staple" })),
    ).rejects.toThrow("REDIRECT:/verify?email=new%40osu.edu&name=Maya");

    const sent = auth.signUp.mock.calls[0];
    expect((sent[0] as FormData).get("email")).toBe("new@osu.edu");
    expect(sent[1]).toEqual(new URL("http://localhost:3000/login"));
  });
});

describe("requestResetAction", () => {
  beforeEach(() => {
    auth.requestPasswordReset.mockReset();
    auth.signIn.mockReset();
  });

  it("asks the existing auth path to recover the address the student submitted", async () => {
    auth.requestPasswordReset.mockResolvedValue({ kind: "reset_sent", email: "jose@osu.edu" });
    const submitted = form({ email: "jose@osu.edu" });

    await expect(requestResetAction(null, submitted)).resolves.toEqual({
      kind: "reset_sent",
      email: "jose@osu.edu",
    });

    expect(auth.requestPasswordReset).toHaveBeenCalledOnce();
    expect((auth.requestPasswordReset.mock.calls[0][0] as FormData).get("email")).toBe("jose@osu.edu");
    expect(auth.requestPasswordReset.mock.calls[0][1]).toEqual(new URL("http://localhost:3000/reset-password"));
    expect(auth.signIn).not.toHaveBeenCalled();
  });
});

describe("continueAfterVerifyAction", () => {
  beforeEach(() => {
    auth.session.mockReset();
    auth.signIn.mockReset();
    auth.signUp.mockReset();
  });

  it("returns to log in when confirming does not find a session", async () => {
    auth.session.mockResolvedValue(null);

    await expect(continueAfterVerifyAction()).rejects.toThrow("REDIRECT:/login");
    expect(auth.signIn).not.toHaveBeenCalled();
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("continues when a session is already present", async () => {
    auth.session.mockResolvedValue({
      userId: "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b",
      email: "jose@osu.edu",
    });

    await expect(continueAfterVerifyAction()).rejects.toThrow("REDIRECT:/");
    expect(auth.signIn).not.toHaveBeenCalled();
  });
});

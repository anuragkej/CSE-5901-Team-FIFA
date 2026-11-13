import { describe, expect, it } from "vitest";
import { submittedEmail } from "./submittedEmail";
import { verifyHref, welcomeName } from "./welcome";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

describe("welcomeName", () => {
  it("uses the first name from the account form", () => {
    expect(welcomeName("Maya Chen")).toBe("Maya");
    expect(welcomeName("  ")).toBeNull();
    expect(welcomeName("maya.chen@osu.edu")).toBeNull();
  });
});

describe("verifyHref", () => {
  it("keeps the submitted address and the first name on the verify screen", () => {
    expect(verifyHref("new@osu.edu", "Maya Chen")).toBe("/verify?email=new%40osu.edu&name=Maya");
  });
});

describe("submittedEmail", () => {
  it("keeps the address a student typed after a failed log in", () => {
    expect(submittedEmail(form({ email: "jose@osu.edu", password: "wrong-horse" }))).toBe("jose@osu.edu");
  });
});

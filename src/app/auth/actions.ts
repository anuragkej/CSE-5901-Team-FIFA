"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requestAuth } from "@/adapters/supabase";
import {
  destinationAfterVerify,
  LOGIN_PATH,
  SIGNED_IN_PATH,
  type PasswordResetOutcome,
  type SignInOutcome,
  type SignUpOutcome,
} from "@/domain/auth";
import { verifyHref } from "./welcome";

export type AuthFormState = Exclude<SignUpOutcome | SignInOutcome, { kind: "signed_in" }> | null;
export type ResetFormState = PasswordResetOutcome | null;

export async function signUpAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const auth = await requestAuth();
  const outcome = await auth.signUp(form, await pageUrl("/login"));
  if (outcome.kind === "signed_in") redirect(SIGNED_IN_PATH);
  if (outcome.kind === "confirmation_pending") redirect(verifyHref(outcome.email, nameField(form)));
  if (outcome.kind === "unavailable") console.error("[auth] sign up unavailable:", outcome.cause);
  return outcome;
}

export async function signInAction(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const auth = await requestAuth();
  const outcome = await auth.signIn(form);
  if (outcome.kind === "signed_in") redirect(SIGNED_IN_PATH);
  if (outcome.kind === "confirmation_pending") redirect(verifyHref(outcome.email, ""));
  if (outcome.kind === "unavailable") console.error("[auth] sign in unavailable:", outcome.cause);
  return outcome;
}

export async function requestResetAction(_prev: ResetFormState, form: FormData): Promise<ResetFormState> {
  const auth = await requestAuth();
  const outcome = await auth.requestPasswordReset(form, await pageUrl("/reset-password"));
  if (outcome.kind === "unavailable") console.error("[auth] password reset unavailable:", outcome.cause);
  return outcome;
}

export async function continueAfterVerifyAction(): Promise<void> {
  const session = await (await requestAuth()).session();
  redirect(destinationAfterVerify(session));
}

export async function signOutAction(): Promise<void> {
  await (await requestAuth()).signOut();
  redirect(LOGIN_PATH);
}

async function pageUrl(path: string): Promise<URL> {
  const h = await headers();
  const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return new URL(path, origin);
}

function nameField(form: FormData): string {
  const value = form.get("name");
  return typeof value === "string" ? value : "";
}

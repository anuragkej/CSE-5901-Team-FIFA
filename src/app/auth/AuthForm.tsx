"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  PASSWORD_MIN_LENGTH,
  type ConfirmationNotice,
  type EmailProblem,
  type PasswordProblem,
} from "@/domain/auth";
import { signInAction, signUpAction, type AuthFormState } from "./actions";
import { submittedEmail } from "./submittedEmail";

type Props = { mode: "sign_in"; notice: ConfirmationNotice | null } | { mode: "sign_up" };
type Banner = { tone: "destructive" | "warning" | "info" | "success"; title: string; body: string };

const EMAIL_COPY: Record<EmailProblem, string> = {
  missing: "Enter your email.",
  malformed: "Enter a valid email address.",
  rejected: "This address can't be used. Try another.",
};

const PASSWORD_COPY: Record<PasswordProblem, string> = {
  missing: "Enter your password.",
  too_short: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
  too_weak: "Pick a stronger password.",
};

const NOTICE_BANNER: Record<ConfirmationNotice, Banner> = {
  email_confirmed: { tone: "success", title: "Email confirmed", body: "Log in to continue." },
  link_invalid: {
    tone: "warning",
    title: "That link didn't work",
    body: "The link expired or was already used.",
  },
};

const inputClass = "h-11 rounded-lg bg-white px-3";

export function AuthForm(props: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attempt, setAttempt] = useState(0);
  const mode = props.mode;
  const submit = useCallback(async (prev: AuthFormState, formData: FormData) => {
    setEmail(submittedEmail(formData));
    setAttempt((n) => n + 1);
    return mode === "sign_in" ? signInAction(prev, formData) : signUpAction(prev, formData);
  }, [mode]);
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(submit, null);

  useEffect(() => {
    const input = document.getElementById("email");
    if (!(input instanceof HTMLInputElement)) return;
    const frame = requestAnimationFrame(() => {
      input.value = email;
    });
    return () => cancelAnimationFrame(frame);
  }, [email, attempt]);

  const banner = state ? bannerFor(state) : props.mode === "sign_in" && props.notice ? NOTICE_BANNER[props.notice] : null;
  const errors: { email?: EmailProblem; password?: PasswordProblem } = state?.kind === "invalid" ? state.errors : {};
  const passwordReady = password.length >= PASSWORD_MIN_LENGTH;

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <FieldGroup>
        {props.mode === "sign_up" && (
          <Field>
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input id="name" name="name" autoComplete="name" placeholder="Maya Chen" className={inputClass} />
          </Field>
        )}
        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="email">Email address</FieldLabel>
          <Input
            key={attempt}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={email}
            placeholder="you@osu.edu"
            aria-invalid={errors.email ? true : undefined}
            className={inputClass}
          />
          <FieldError>{errors.email ? EMAIL_COPY[errors.email] : null}</FieldError>
        </Field>
        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={props.mode === "sign_in" ? "current-password" : "new-password"}
            minLength={props.mode === "sign_up" ? PASSWORD_MIN_LENGTH : undefined}
            required
            value={props.mode === "sign_up" ? password : undefined}
            onChange={props.mode === "sign_up" ? (event) => setPassword(event.target.value) : undefined}
            aria-invalid={errors.password ? true : undefined}
            className={inputClass}
          />
          {props.mode === "sign_up" && (
            <p className={passwordReady ? "text-sm text-success" : "text-sm text-muted-foreground"}>
              {passwordReady ? "✓  At least 8 characters" : `At least ${PASSWORD_MIN_LENGTH} characters`}
            </p>
          )}
          <FieldError>{errors.password ? PASSWORD_COPY[errors.password] : null}</FieldError>
        </Field>
      </FieldGroup>
      {props.mode === "sign_in" && (
        <Link href="/reset-password" className="text-sm text-primary">
          Forgot password?
        </Link>
      )}
      {banner && (
        <Alert variant={banner.tone}>
          <AlertTitle>{banner.title}</AlertTitle>
          <AlertDescription>{banner.body}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending && <Spinner data-icon="inline-start" />}
        {props.mode === "sign_in" ? "Log in" : "Create account"}
      </Button>
      {props.mode === "sign_in" ? (
        <Link href="/signup" className="text-base text-primary">
          New to LeaseLens? Create an account →
        </Link>
      ) : (
        <Link href="/login" className="text-base text-primary">
          Already have an account? Log in →
        </Link>
      )}
      {props.mode === "sign_in" && (
        <>
          <div className="h-px bg-border" />
          <Button variant="outline" className="h-11 w-full bg-white" nativeButton={false} render={<Link href="/" />}>
            Explore with a sample lease
          </Button>
          <p className="text-sm text-muted-foreground">The analyzer works without an account.</p>
        </>
      )}
      {props.mode === "sign_up" && (
        <p className="text-sm text-muted-foreground">
          We send a confirmation email. The account stays inactive until you open that link and log in.
        </p>
      )}
    </form>
  );
}

function bannerFor(state: NonNullable<AuthFormState>): Banner | null {
  switch (state.kind) {
    case "invalid":
      return null;
    case "bad_credentials":
      return {
        tone: "destructive",
        title: "Could not log in",
        body: "That email and password do not match.",
      };
    case "confirmation_pending":
      return {
        tone: "info",
        title: "Confirm your email first",
        body: `Open the link we sent to ${state.email}.`,
      };
    case "email_taken":
      return {
        tone: "info",
        title: "Could not sign up",
        body: "An account with that email already exists. Log in.",
      };
    case "rate_limited":
      return { tone: "warning", title: "Too many attempts", body: "Wait a minute, then try again." };
    case "unavailable":
      return {
        tone: "destructive",
        title: "Accounts are unavailable",
        body: "Try again later. The analyzer works without an account.",
      };
    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
}

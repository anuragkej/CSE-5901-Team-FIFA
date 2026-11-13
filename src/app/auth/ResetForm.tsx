"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { EmailProblem } from "@/domain/auth";
import { requestResetAction, type ResetFormState } from "./actions";

const EMAIL_COPY: Record<EmailProblem, string> = {
  missing: "Enter your email.",
  malformed: "Enter a valid email address.",
  rejected: "This address can't be used. Try another.",
};

export function ResetForm() {
  const [state, formAction, pending] = useActionState<ResetFormState, FormData>(requestResetAction, null);
  const emailError = state?.kind === "invalid" ? state.errors.email : undefined;

  if (state?.kind === "reset_sent") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-success-tint p-6">
          <p className="text-lg font-semibold text-success">Reset link sent</p>
          <p className="text-muted-foreground">
            Follow the link sent to {state.email} to choose a new password.
          </p>
        </div>
        <Button variant="outline" className="h-11 w-full bg-white" nativeButton={false} render={<Link href="/login" />}>
          Return to login
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field data-invalid={emailError ? true : undefined}>
        <FieldLabel htmlFor="email">Email address</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@osu.edu"
          aria-invalid={emailError ? true : undefined}
          className="h-11 rounded-lg bg-white px-3"
        />
        <FieldError>{emailError ? EMAIL_COPY[emailError] : null}</FieldError>
      </Field>
      {state?.kind === "rate_limited" && (
        <Alert variant="warning">
          <AlertTitle>Too many attempts</AlertTitle>
          <AlertDescription>Wait a minute, then try again.</AlertDescription>
        </Alert>
      )}
      {state?.kind === "unavailable" && (
        <Alert variant="destructive">
          <AlertTitle>Accounts are unavailable</AlertTitle>
          <AlertDescription>Try again later. Nothing was sent.</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending && <Spinner data-icon="inline-start" />}
        Send reset link
      </Button>
      <p className="text-sm text-muted-foreground">
        A reset email goes out only when you submit your own address. Choose the new password from that link.
      </p>
      <Link href="/login" className="text-base text-primary">
        Back to login
      </Link>
    </form>
  );
}

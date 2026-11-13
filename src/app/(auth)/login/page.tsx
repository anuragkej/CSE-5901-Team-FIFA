import { redirect } from "next/navigation";
import { requestAuth } from "@/adapters/supabase";
import { confirmationNotice, SIGNED_IN_PATH } from "@/domain/auth";
import { AuthForm } from "../../auth/AuthForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await (await requestAuth()).session()) redirect(SIGNED_IN_PATH);
  return (
    <>
      <p className="font-mono text-xs tracking-wide text-primary">WELCOME BACK</p>
      <h1 className="font-heading text-4xl leading-tight font-normal">Your next move starts here.</h1>
      <p className="text-lg text-muted-foreground">Log in to keep your lease research together.</p>
      <AuthForm mode="sign_in" notice={confirmationNotice(await searchParams)} />
    </>
  );
}

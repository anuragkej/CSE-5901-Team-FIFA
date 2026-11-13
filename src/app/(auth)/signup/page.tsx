import { redirect } from "next/navigation";
import { requestAuth } from "@/adapters/supabase";
import { SIGNED_IN_PATH } from "@/domain/auth";
import { AuthForm } from "../../auth/AuthForm";

export default async function SignUpPage() {
  if (await (await requestAuth()).session()) redirect(SIGNED_IN_PATH);
  return (
    <>
      <p className="font-mono text-xs tracking-wide text-primary">GET STARTED</p>
      <h1 className="font-heading text-4xl leading-tight font-normal">Rent with more confidence.</h1>
      <p className="text-lg text-muted-foreground">Create your free LeaseLens account.</p>
      <AuthForm mode="sign_up" />
    </>
  );
}

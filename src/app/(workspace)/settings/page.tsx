import Link from "next/link";
import { requestAuth } from "@/adapters/supabase";
import { signOutAction } from "@/app/auth/actions";
import { WorkspaceFrame } from "@/app/journey/WorkspaceFrame";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const session = await (await requestAuth()).session();

  return (
    <WorkspaceFrame active="overview">
      <p className="font-mono text-xs tracking-wide text-primary">ACCOUNT</p>
      <h1 className="font-heading text-4xl leading-tight">Account settings</h1>
      <section className="flex max-w-xl flex-col gap-3 rounded-xl border border-border bg-white p-6">
        <p className="font-mono text-xs text-muted-foreground">EMAIL</p>
        <p className="text-lg">{session ? session.email : "You are not signed in."}</p>
        <p className="text-sm text-muted-foreground">
          Email confirmation stays on. Signing up does not start a session until the confirmation link is opened.
        </p>
        <div className="flex flex-wrap gap-3">
          {session ? (
            <form action={signOutAction}>
              <Button type="submit" variant="outline">
                Log out
              </Button>
            </form>
          ) : (
            <Button nativeButton={false} render={<Link href="/login" />}>
              Log in
            </Button>
          )}
          <Button variant="outline" nativeButton={false} render={<Link href="/reset-password" />}>
            Reset password
          </Button>
        </div>
      </section>
    </WorkspaceFrame>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { Diamond } from "lucide-react";
import { requestAuth } from "@/adapters/supabase";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/auth/actions";
import { greetingName } from "./reviewFields";

export type WorkspaceSection = "overview" | "new" | "compare" | "saved";

const NAV: Array<{ id: WorkspaceSection; href: string; label: string }> = [
  { id: "overview", href: "/dashboard", label: "Overview" },
  { id: "new", href: "/analyze/upload", label: "New analysis" },
  { id: "compare", href: "/compare", label: "Compare options" },
  { id: "saved", href: "/saved", label: "Saved analyses" },
];

export async function WorkspaceFrame({
  active,
  children,
}: {
  active: WorkspaceSection;
  children: ReactNode;
}) {
  const session = await (await requestAuth()).session();
  const email = session?.email ?? null;
  const name = greetingName(email);

  return (
    <div className="min-h-svh bg-background">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border bg-white px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Diamond aria-hidden="true" className="size-5 text-primary" strokeWidth={1.5} />
          <span className="font-heading text-2xl">LeaseLens</span>
        </Link>
        <p className="font-mono text-xs tracking-wide text-muted-foreground">COLUMBUS · STUDENT HOUSING</p>
        <div className="ml-auto flex items-center gap-4">
          <Button nativeButton={false} render={<Link href="/analyze/upload" />}>
            New analysis
          </Button>
          {email ? (
            <span className="text-sm text-muted-foreground">
              {name} · {name.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <Link href="/login" className="text-sm text-muted-foreground">
              Log in
            </Link>
          )}
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col lg:flex-row">
        <nav aria-label="Workspace" className="flex gap-2 overflow-x-auto px-4 py-4 lg:w-56 lg:shrink-0 lg:flex-col lg:px-6 lg:py-8">
          <p className="hidden font-mono text-[11px] tracking-wide text-muted-foreground lg:block">YOUR WORKSPACE</p>
          {NAV.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={item.id === active ? "page" : undefined}
              className={
                item.id === active
                  ? "rounded-md bg-rose px-3 py-2 text-sm font-semibold text-primary"
                  : "rounded-md px-3 py-2 text-sm text-muted-foreground"
              }
            >
              {item.label}
            </Link>
          ))}
          <div className="hidden h-px bg-border lg:my-2 lg:block" />
          <Link href="/settings" className="px-3 py-1 text-sm text-muted-foreground">
            Account settings
          </Link>
          {email ? (
            <form action={signOutAction}>
              <button type="submit" className="px-3 py-1 text-left text-sm text-muted-foreground">
                Log out
              </button>
            </form>
          ) : null}
        </nav>
        <main className="flex min-w-0 flex-1 flex-col gap-5 px-6 py-8">
          {children}
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
            TEAM FIFA / CSE 5914 · INTERACTIVE CONCEPT · SAMPLE DATA
          </p>
        </main>
      </div>
    </div>
  );
}

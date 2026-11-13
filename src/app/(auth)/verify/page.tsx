import Link from "next/link";
import { Button } from "@/components/ui/button";
import { displayEmail } from "@/domain/auth";
import { continueAfterVerifyAction } from "../../auth/actions";
import { welcomeName } from "../../auth/welcome";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const email = displayEmail(typeof query.email === "string" ? query.email : undefined);
  const name = welcomeName(typeof query.name === "string" ? query.name : undefined);

  return (
    <>
      <p className="w-fit rounded-md bg-success-tint px-2 py-1 text-xs font-semibold tracking-wide text-success">
        EMAIL CONFIRMATION
      </p>
      <h1 className="font-heading text-4xl leading-tight font-normal">Check your inbox.</h1>
      <p className="text-lg text-muted-foreground">
        {email
          ? `We sent a confirmation link to ${email}. Confirm your email to finish creating your account.`
          : "We sent a confirmation link. Confirm your email to finish creating your account."}{" "}
        The account is not active until you open that link and log in.
      </p>
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-6">
        <p className="font-mono text-xs tracking-wide text-primary">FROM LEASELENS</p>
        <p className="font-heading text-3xl">{name ? `Welcome, ${name}.` : "Welcome."}</p>
        <p className="text-muted-foreground">Your account is almost ready.</p>
        <form action={continueAfterVerifyAction}>
          <Button type="submit" className="h-11 w-full">
            Confirm email & continue
          </Button>
        </form>
      </div>
      <p className="text-sm text-muted-foreground">
        This button does not confirm the email or start a session. Open the link we sent. If you are already signed in,
        it continues. Otherwise it returns you to log in.
      </p>
      <Button variant="outline" className="h-11 w-full bg-white" nativeButton={false} render={<Link href="/signup" />}>
        Use a different email
      </Button>
      <Link href="/login" className="text-base text-primary">
        Back to login
      </Link>
    </>
  );
}

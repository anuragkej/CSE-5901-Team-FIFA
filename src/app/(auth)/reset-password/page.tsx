import { ResetForm } from "../../auth/ResetForm";

export default function ResetPasswordPage() {
  return (
    <>
      <p className="font-mono text-xs tracking-wide text-primary">ACCOUNT RECOVERY</p>
      <h1 className="font-heading text-4xl leading-tight font-normal">Let’s get you back in.</h1>
      <ResetForm />
    </>
  );
}

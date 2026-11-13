import type { ReactNode } from "react";
import { AuthBrand } from "../auth/AuthBrand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background lg:flex-row">
      <AuthBrand />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-[490px] flex-col gap-5">{children}</div>
      </main>
    </div>
  );
}

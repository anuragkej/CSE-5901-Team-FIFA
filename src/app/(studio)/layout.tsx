import type { ReactNode } from "react";
import { SiteHeader } from "../SiteHeader";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}

"use client";

import dynamic from "next/dynamic";

export const ReviewPanelLoader = dynamic(() => import("./ReviewPanel").then((mod) => mod.ReviewPanel), {
  ssr: false,
  loading: () => <p className="text-muted-foreground">Reading the lease…</p>,
});

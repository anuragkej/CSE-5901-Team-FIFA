"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { sampleDocuments } from "@/adapters/mock/sampleDocuments";
import { RuleBasedExtractor } from "@/adapters/mock/ruleBasedExtractor";
import { readAnalyzeForm } from "@/app/analyzeInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import type { AnalysisInput } from "@/domain/types";
import { browserDraftStore, loadDraft, saveDraft } from "./draft";
import { reviewFields, type ReviewFields } from "./reviewFields";

const EMPTY: ReviewFields = { address: "", bedrooms: "", term: "", landlord: "", rent: "", deposit: "" };

export function ReviewPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const sample = sampleDocuments.find((item) => item.id === params.get("sample"));
  const text = sample?.text ?? loadDraft(browserDraftStore())?.text ?? null;
  const [fields, setFields] = useState<ReviewFields>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!text) return;
    let cancel = false;
    void new RuleBasedExtractor().extract({ text }).then((terms) => {
      if (!cancel) setFields(reviewFields(terms));
    });
    return () => {
      cancel = true;
    };
  }, [text]);

  function confirm(formData: FormData) {
    if (!text) {
      setError("Paste at least a few sentences of the lease or listing.");
      return;
    }
    formData.set("text", text);
    const parsed = readAnalyzeForm(formData);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    const input: AnalysisInput = parsed.input;
    saveDraft(browserDraftStore(), input);
    router.push("/analysis");
  }

  if (text === null) {
    return (
      <p className="text-muted-foreground">
        No lease is loaded.{" "}
        <Link href="/analyze/paste" className="text-primary">
          Paste a listing
        </Link>{" "}
        or{" "}
        <Link href="/analyze/upload" className="text-primary">
          use the sample
        </Link>
        .
      </p>
    );
  }

  return (
    <form key={`${fields.address}|${fields.rent}|${fields.landlord}`} action={confirm} className="flex flex-col gap-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6">
          <Field>
            <FieldLabel htmlFor="address">Property address</FieldLabel>
            <Input id="address" name="address" defaultValue={fields.address} className="h-11 bg-white" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="bedrooms">Bedrooms</FieldLabel>
              <Input id="bedrooms" name="bedrooms" defaultValue={fields.bedrooms} className="h-11 bg-white" />
            </Field>
            <Field>
              <FieldLabel htmlFor="term">Lease term</FieldLabel>
              <Input id="term" name="term" defaultValue={fields.term} readOnly className="h-11 bg-white" />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="landlordName">Landlord / company</FieldLabel>
            <Input id="landlordName" name="landlordName" defaultValue={fields.landlord} className="h-11 bg-white" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="rent">Monthly base rent</FieldLabel>
              <Input id="rent" name="rent" defaultValue={fields.rent} readOnly className="h-11 bg-white" />
            </Field>
            <Field>
              <FieldLabel htmlFor="deposit">Security deposit</FieldLabel>
              <Input id="deposit" name="deposit" defaultValue={fields.deposit} readOnly className="h-11 bg-white" />
            </Field>
          </div>
        </div>
        <aside className="flex flex-col gap-3 rounded-xl border border-border bg-tint p-6">
          <h2 className="font-heading text-2xl">Your report will include</h2>
          <ul className="flex flex-col gap-1 text-base">
            <li>✓ True monthly cost</li>
            <li>✓ Hidden & one-time fees</li>
            <li>✓ Columbus market comparison</li>
            <li>✓ Ownership & scam checks</li>
            <li>✓ Clause explanations</li>
            <li>✓ Questions for your landlord</li>
          </ul>
          <p className="text-sm text-muted-foreground">Rent and deposit come from the lease text. Sample market data is labeled on the next screens.</p>
        </aside>
      </div>
      {error && <FieldError>{error}</FieldError>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit">Confirm & analyze →</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/analyze/upload" />}>
          Back to input
        </Button>
      </div>
    </form>
  );
}

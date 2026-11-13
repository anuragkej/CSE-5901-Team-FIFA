"use client";

import { useActionState, useState } from "react";
import { CircleAlert } from "lucide-react";
import type { SampleDocument } from "@/adapters/mock/sampleDocuments";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { RankableAnalysis } from "@/domain/rank";
import { analyzeAction, type AnalyzeState } from "./actions";
import { LeaseChat } from "./LeaseChat";
import { RecommendationList } from "./RecommendationList";
import { Report } from "./Report";
import { SaveAnalysisButton } from "./SaveAnalysisButton";

export function AnalyzerForm({ samples }: { samples: SampleDocument[] }) {
  const [state, formAction, pending] = useActionState<AnalyzeState, FormData>(analyzeAction, null);
  const [text, setText] = useState(samples[0].text);
  const [compared, setCompared] = useState<RankableAnalysis[]>([]);
  const [seenKey, setSeenKey] = useState<string | null>(null);
  const selectedSample = samples.find((s) => s.text === text);
  const current = state?.analysis;
  const currentKey = current
    ? `${current.terms.address ?? "unknown"}:${current.cost?.trueMonthlyCost ?? "none"}:${current.verdict.tone}`
    : null;
  if (current && currentKey && currentKey !== seenKey) {
    setSeenKey(currentKey);
    setCompared((items) => (items.some((item) => item.id === currentKey) ? items : [...items, { id: currentKey, analysis: current }]));
  }

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Lease or listing</CardTitle>
            <CardDescription>
              Paste the full text. Optional fields override what we detect in the document.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldTitle id="sample-label">Try a sample</FieldTitle>
                <ToggleGroup
                  aria-labelledby="sample-label"
                  variant="outline"
                  size="sm"
                  className="w-full flex-wrap"
                  value={selectedSample ? [selectedSample.id] : []}
                  onValueChange={(value) => {
                    const sample = samples.find((s) => s.id === value[0]);
                    if (sample) setText(sample.text);
                  }}
                >
                  {samples.map((s) => (
                    <ToggleGroupItem key={s.id} value={s.id} className="h-auto max-w-full py-1 text-left whitespace-normal">
                      {s.title}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="text">Lease or listing text</FieldLabel>
                <Textarea
                  id="text"
                  name="text"
                  rows={14}
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="field-sizing-fixed font-mono text-xs"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr_2fr]">
                <Field>
                  <FieldLabel htmlFor="address">Address</FieldLabel>
                  <Input id="address" name="address" autoComplete="off" />
                  <FieldDescription>Detected from text if blank</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="bedrooms">Bedrooms</FieldLabel>
                  <Input id="bedrooms" name="bedrooms" type="number" min={0} max={6} inputMode="numeric" />
                  <FieldDescription>Detected if blank</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="landlordName">Landlord name</FieldLabel>
                  <Input id="landlordName" name="landlordName" autoComplete="off" />
                  <FieldDescription>Checked against county records</FieldDescription>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner data-icon="inline-start" />}
              {pending ? "Analyzing" : "Analyze"}
            </Button>
          </CardFooter>
        </Card>
        {state?.error && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>Could not analyze</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}
      </form>
      {current && (
        <>
          <Report analysis={current} />
          <SaveAnalysisButton analysis={current} />
          <RecommendationList items={compared} />
          <LeaseChat analysis={current} />
        </>
      )}
    </>
  );
}

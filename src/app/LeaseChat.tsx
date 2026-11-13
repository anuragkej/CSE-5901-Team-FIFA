"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { persistedAnalysis } from "@/domain/savedAnalyses";
import type { Analysis } from "@/domain/types";
import type { ChatHttpResult } from "./chatHandler";
import { isChatHttpResult, refusalText, topicLabel } from "./replyText";

const DEFAULT_SUGGESTIONS = ["What is the real monthly cost?", "What fees are included?", "Does anything here look like a scam?"];

export function LeaseChat({
  analysis,
  suggestions = DEFAULT_SUGGESTIONS,
}: {
  analysis: Analysis;
  suggestions?: readonly string[];
}) {
  const sessionKey = `${analysis.terms.address ?? ""}:${analysis.cost?.trueMonthlyCost ?? "none"}:${analysis.verdict.tone}`;
  return <LeaseChatSession key={sessionKey} analysis={analysis} suggestions={suggestions} />;
}

function LeaseChatSession({
  analysis,
  suggestions,
}: {
  analysis: Analysis;
  suggestions: readonly string[];
}) {
  const [transport] = useState(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            analysis: persistedAnalysis(analysis),
          },
        }),
      }),
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");
  const pending = status === "submitted" || status === "streaming";

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setInput("");
    void sendMessage({ text: trimmed });
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-white p-6" aria-label="Lease chat">
      <div>
        <h2 className="font-heading text-2xl">Ask about this lease</h2>
        <p className="text-sm text-muted-foreground">
          Answers use the extracted analysis. A dollar amount that is not in it is dropped.
        </p>
      </div>
      {messages.length === 0 && <p className="text-muted-foreground">Try &quot;What is the real monthly cost?&quot;</p>}
      <div className="flex flex-col gap-3">
        {messages.map((message) => (
          <MessageView key={message.id} message={message} />
        ))}
      </div>
      {error && <p className="text-sm text-destructive">The assistant could not answer just now.</p>}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className={buttonVariants({ variant: "outline", className: "h-auto whitespace-normal" })}
            disabled={pending}
            onClick={() => submit(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={pending}
          rows={2}
          placeholder="Ask about fees, the deposit, or the verdict"
          aria-label="Question about this analysis"
        />
        <Button type="submit" disabled={pending || input.trim().length === 0}>
          {pending ? "Asking" : "Ask"}
        </Button>
      </form>
    </section>
  );
}

function MessageView({ message }: { message: UIMessage }) {
  const structured = message.role === "assistant" && isChatHttpResult(message.metadata) ? message.metadata : null;
  return (
    <div className={message.role === "user" ? "rounded-xl bg-rose p-4" : "rounded-xl border border-border p-4"}>
      <p className="font-mono text-[11px] text-primary">{message.role === "user" ? "YOU" : "LEASELENS"}</p>
      {structured ? <StructuredReply result={structured} /> : <TextParts message={message} />}
    </div>
  );
}

function TextParts({ message }: { message: UIMessage }) {
  return (
    <>
      {message.parts.map((part, index) =>
        part.type === "text" ? (
          <p key={index} className="mt-2 text-lg">
            {part.text}
          </p>
        ) : null,
      )}
    </>
  );
}

function StructuredReply({ result }: { result: ChatHttpResult }) {
  switch (result.kind) {
    case "answer":
      return (
        <div className="mt-2 flex flex-col gap-2">
          <p className="font-mono text-[11px] text-muted-foreground">{topicLabel(result.topic).toUpperCase()}</p>
          <p className="text-lg">{result.answer}</p>
          {result.citations.length > 0 && <p className="text-sm text-muted-foreground">From {result.citations.join(", ")}</p>}
        </div>
      );
    case "refusal":
      return <p className="mt-2 text-lg">{refusalText(result.reason)}</p>;
    case "key_missing":
      return (
        <p className="mt-2 text-lg">The assistant is not configured on this server. The numbers in the analysis are still available.</p>
      );
    case "invalid":
      return <p className="mt-2 text-lg">That question could not be read. Ask about this analysis.</p>;
    case "unavailable":
      return <p className="mt-2 text-lg">The assistant could not answer just now. The analysis numbers are unchanged.</p>;
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

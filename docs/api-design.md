# LeaseLens API design

Owner: Sam Fairchild. Status: design proposal for timebox 3, for team review. Not yet implemented.

## Why an HTTP API when the UI already uses a server action

Today the analysis runs through a server action that only serves the analyzer page. A versioned REST API would let anything else call the same analysis: the chatbot, a comparison view, a future mobile client or browser extension, the evaluation harness planned for timebox 3, and teammates testing from Postman or an interactive docs page. Route handlers live in the same Next.js app, so there is still one deploy (see `decisions.md`, "Stack": no separate FastAPI service).

## Endpoints

All under `/api/v1`. JSON in and out. Money is integer cents; missing values are `null`, never `0`.

| Method | Path | Purpose | Persona |
| --- | --- | --- | --- |
| POST | `/analyses` | Analyze one lease or listing: terms, true cost, market, ownership, flags, verdict | Maya, Jose |
| POST | `/comparisons` | Analyze 2 to 5 options and rank them by true cost | Maya |
| POST | `/chat` | Answer one question about a document, citing the flags used | Maya, Jose |
| GET | `/market/fair-market-rent` | HUD FY2026 Columbus FMR by bedroom count | |
| GET | `/market/comparables?bedrooms=2&limit=6` | Comparable campus-area listings | |
| GET | `/samples` | The three sample documents | demo, tests |
| GET | `/health` | Liveness, plus which adapter fills each port | ops |

### Errors

One shape everywhere:

```json
{ "error": { "code": "validation_error", "message": "text must be at least 40 characters...", "field": "items[1].text" } }
```

| Status | Code | When |
| --- | --- | --- |
| 400 | `invalid_json` | Body does not parse |
| 413 | `payload_too_large` | Body over 200 KB |
| 415 | `unsupported_media_type` | Content-Type is not `application/json` |
| 422 | `validation_error` | A field fails validation; `field` is its path |
| 500 | `internal_error` | Anything else; details go to the server log, not the client |

Limits: `text` 40 to 50,000 characters, `bedrooms` integer 0 to 6 (matching the analyzer's input limits from the hardening PR), chat `message` up to 1,000 characters, `history` trimmed to the last 20 turns.

## Comparison ranking

1. Every option is sorted by true monthly cost (rent plus fees), not advertised rent, because fees are where listings hide cost.
2. Each option shows its flags as badges (danger, warning, info), so the student sees the trade-offs and decides.
3. Two scam signals block an option from being recommended as "best": a request to pay by Zelle, Cash App, wire, or gift card, and a landlord who does not match the county owner record. If the cheapest option has one, the summary says so ("X is cheapest, but verify the landlord before paying anything") and recommends the cheapest option without one. An owner mismatch is not proof of fraud (management companies, LLCs, and subletters also fail a name match, per `api-research.md` section 4), so the wording asks the student to get proof of authority to lease rather than calling the listing a scam.
4. Options with no stated rent cannot be priced and go last.

Why only scam signals block a recommendation: if a listing is a scam there is no apartment, so its price is not a real price. Other danger flags, such as clauses Ohio law voids, describe a real apartment with an unenforceable term, and warnings like high fees or above-market rent are already reflected in true cost. Ranking those below cheaper options would override the student's judgment or count cost twice.

## Chatbot conversation flows

Each message is classified into one intent, then answered from the `Analysis`, never from free text. The bot cannot invent a fee or a statute because it only reads what the analyzer computed.

| Intent | Example | Answer built from |
| --- | --- | --- |
| `fees` | "What will I really pay each month?" | `cost`, `terms.fees`, `HIGH_HIDDEN_COSTS` |
| `deposit` | "Will I get my deposit back?" | `terms.securityDeposit`, deposit flags, ORC 5321.16(B) |
| `clauses` | "Any bad clauses?" | void-clause flags with ORC citations, late fee, auto-renewal |
| `scam` | "Is this legit?" | P2P payment, ownership, below-market flags, county record |
| `market` | "Is the rent fair?" | comp median, HUD FMR, negotiation tip when above market |
| `verdict` | "Should I sign this?" | `verdict`, flag counts, top three flags |
| follow-up | "why?" | Previous topic; shows the quoted lease text behind each flag |

Edge cases:

| Intent | Trigger | Behavior |
| --- | --- | --- |
| `legal_advice` | "Can I sue?", "is this legal" | Declines advice, lists ORC conflicts found, points to OSU Student Legal Services |
| `unsafe` | Jailbreaks ("ignore previous instructions", "system prompt", "pretend you are"), or requests to fake pay stubs or scam someone | Refuses with no document details in the reply |
| `off_topic` | "What's the weather?" | Redirects to lease questions |
| `needs_document` | Topic question with no document | Asks for the lease |
| `unknown` | Lease-related but unclear | Lists what it can answer |
| no rent found | Any cost question | Says what is missing and what to paste |

The API is stateless: the client sends the document and the history (including each assistant `intent`) with every turn. When analyses are stored in timebox 3, `document` becomes `analysisId`.

The chatbot does not use pgvector RAG yet. Questions about the student's own lease are answered by its analysis. RAG over stored clauses and listings becomes useful once the database holds many leases, for questions like "is this clause normal for Columbus?", and is planned for timebox 3.

The deterministic bot doubles as the baseline for timebox 3: when an LLM responder is added, these flows become the expected answers for evaluating it, and the `unsafe` patterns seed the jailbreak test set.

## Relationship to the API research

`api-research.md` chose the outside services LeaseLens calls. This design is the API LeaseLens itself exposes, and it sits on top of those services through the existing adapters. Three points from the research shape it:

- **Quotas on real data sources.** RentCast's free plan allows 50 requests a month. Once comparables come from RentCast instead of fixtures, every analysis costs a request, so a 5-option comparison costs 5, and stateless chat (which re-analyzes each turn) would cost one per message. Two consequences: market lookups must be cached in Postgres as the research recommends, and chat should switch to a saved `analysisId` before the RentCast adapter goes live.
- **Owner mismatch is a prompt to verify, not a fraud finding** (section 4). The comparison and chat wording follows that.
- **Lease text sent to an LLM** (section 1 privacy note). Free-tier Gemini may train on inputs. If the timebox 3 chatbot or extractor uses an LLM, strip personal details first or use the paid tier.

The scam signals the chatbot explains (payment-app requests, owner mismatch, far-below-market rent, unenforceable clauses) are the rule-engine heuristics recommended in section 13.

## Where the API fits

The API is a thin layer inside the existing Next.js app. Each endpoint validates its input, then calls the same domain functions the analyzer page already uses (`analyze`, the rules, and the verdict), plus two new ones: comparison ranking and the chat flows. No business logic lives in the endpoints, so the page and the API always give the same answers. Data sources stay behind the existing adapters, so swapping fixtures for real services does not change the API.

## Planned for timebox 3

| Endpoint | Change |
| --- | --- |
| `POST /analyses` | Returns `201` with an `id` once stored |
| `GET /analyses`, `GET /analyses/{id}` | List and reopen saved analyses, using the session from the auth branch |
| `POST /chat` | Accepts `analysisId` instead of the full document |
| `POST /analyses` (multipart) | PDF upload |
| `POST /chat` | Retrieve similar clauses and listings with pgvector (RAG) for "is this normal?" questions |

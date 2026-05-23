# Sach — Product Requirements & Build Handover (v0)

> **Read this first.** This document is a complete, self-contained handover. The person/AI reading it has **no prior context**. It contains the product strategy, the exact v0 scope, the financial math (with formulas), the data model, the UX flow, the tech stack, the deployment plan, regulatory guardrails, and a step-by-step build plan with acceptance criteria. Build from this directly.

---

## 0. TL;DR (for the impatient builder)

**Sach** is a free, conflict-free web app (PWA) for Indian retail users. A user uploads their **life-insurance policy / benefit illustration PDF**; Sach reads it, then — using the **insurer's own projected numbers** — tells them the **real return (IRR)** they're getting, how much **wealth they're losing** vs. simple alternatives (term + index fund / term + PPF / FD), what they'd get if they **surrender or make the policy paid-up** today (per IRDAI rules), and a clear **Keep / Pause / Exit verdict** with the break-even math. It produces a **shareable result card** and a downloadable report.

- **All financial math is deterministic TypeScript. The LLM is used ONLY to read the document and write plain-language explanations. The LLM never computes a number that the user relies on.**
- **It never sells anything, never says "buy this specific product," never moves money.** It is *educational analysis*, not IRDAI-registered advice. This is the legal moat AND the trust moat.

**Stack:** Next.js (App Router) + TypeScript + Tailwind, PWA · Vercel (free tier) · Supabase (free: Postgres + Auth + Storage) · Anthropic Claude API (Haiku, extraction only) · deterministic TS finance engine.

**Build location:** a fresh repo, e.g. `c:\Suyash_Projects\Sach` (do not entangle with any sibling repos).

---

## 1. Why this product exists (strategy context)

This section exists so you understand *why* each scope decision was made and don't "improve" the product into a worse one.

### The market reality (researched, May 2026)
- India lost **₹22,495 crore to cybercrime in 2025; ~76% of that was investment fraud.** Finance anxiety is mass-market.
- **Insurance mis-selling is India's quiet, enormous scandal.** The classic trap: *"Sir, this is like an FD, only better"* → the customer is sold a ULIP/endowment/whole-life policy that actually returns ~4–5% over 15–20 years, far below inflation-adjusted alternatives, and is locked in for decades.
- **Every existing player is conflicted or shallow:**
  - Surrender/return calculators (1Finance, LIC calculators, PolicyBazaar) are **manual-input only** and/or run by **entities that sell insurance** (commission conflict).
  - Honest insurance players (Ditto, Beshak) focus on **buying** term/health, not **auditing existing trapped policies**.
  - Nobody does: **"upload your policy → AI reads it → here's your real return, proof you were mis-sold, and the honest keep-vs-exit math."**

### Why this specific shape (constraints that must not be violated)
The founder is solo, bootstrap budget (~$0–2k), nights/weekends, India retail mass market, and **explicitly wants zero regulated activity.** Every decision below flows from that:

| Constraint | Consequence baked into the product |
|---|---|
| No regulated activity | No bank login, no Account Aggregator, no advice to buy/sell, no money movement. User uploads their *own* document. Output is *analysis/education*. |
| Bootstrap / solo | Free-tier stack only (Vercel + Supabase + pay-per-use LLM). Deterministic math (no expensive infra). |
| Mass + viral | Shareable result card is a first-class feature, not an afterthought. Vernacular-ready (name "Sach" = "truth" in Hindi). |
| Trust = the moat | Math is deterministic & auditable; we use the **insurer's own numbers** so conclusions are undisputable; we never sell anything. |

### Why insurance and not "debt" or "scam checker" (rejected alternatives)
- **Scam checker** — already commoditized (Google Gemini Nano, Meta, ScamDekho, Savdhaan AI). Episodic, low retention, invisible benefit. *Rejected.*
- **Bank-statement leak finder** — already built many times (CheckMyLeak.in, etc.). *Rejected as a wedge.*
- **Debt payoff** — the good version (INDmoney) needs the **RBI Account Aggregator framework = regulated FIU registration.** Violates the no-regulation constraint. *Rejected.*
- **Insurance policy auditor** — high per-user money impact (lakhs), incumbents conflicted/absent, needs only the user's own document, math is deterministic and public (IRDAI rules), emotionally shareable. **Chosen.**

> If you are tempted to add bank-account syncing, lending, or "recommend this policy to buy" — **stop.** That breaks the entire legal/strategic thesis.

---

## 2. Product scope — v0 (exactly what to build)

### 2.1 The core flow
```
Landing → Upload policy PDF (or "enter manually")
   → Claude extracts fields
   → Editable REVIEW screen (pre-filled; user corrects any mis-read field)
   → User confirms
   → Deterministic engine computes
   → VERDICT screen (real IRR, wealth gap, surrender/paid-up value, Keep/Pause/Exit)
   → Shareable result card + downloadable PDF report
   → (optional) email capture to save report / join waitlist
```

**Hybrid PDF-first is mandatory.** Pure "PDF in → verdict out" is too fragile (LIC, HDFC Life, ICICI Pru, SBI Life, etc. all format differently; some are scanned). The editable review screen is what makes PDF-first reliable: the AI pre-fills, the human confirms before any number is computed.

### 2.2 Policy types supported in v0
| Type | Treatment |
|---|---|
| Traditional **endowment** / **money-back** | Full return audit (primary target — biggest mis-selling bucket, e.g. LIC). |
| **ULIP** | Full return audit, using current fund value + projected NAV growth from illustration. |
| **Whole life** | Full return audit (same math family as endowment; very long horizons). |
| **Pure term** | **NOT** a return audit. Instead a **protection-adequacy check** ("is your sum assured enough vs. ~10–15× annual income?"). Term also serves as the "good alternative" benchmark in the wealth-gap comparison for the other types. |

### 2.3 The credibility core: how "real return" is computed
**Use the insurer's own Benefit Illustration.** We compute the IRR from the maturity value **the insurer themselves projected** (the user uploads/enters it). We never invent a maturity number. This makes the headline undisputable: *"By HDFC Life's own projection, this plan returns 4.3%."*

- Benefit illustrations typically show tiers (e.g., guaranteed; and projected at two assumed gross-return scenarios — historically 4% and 8% per IRDAI illustration norms). Capture what's available; compute IRR for each tier present and headline the **most realistic/lower** one, clearly labeled as the insurer's own figure.
- If the user has no illustration, allow manual entry of "expected maturity amount"; clearly label the IRR as "based on the figure you entered."

### 2.4 Benchmarks shown (the wealth gap)
Show all three "buy term + invest the difference" comparisons (rates configurable, see §4.4):
1. **Term insurance + Nifty 50 index fund** (growth scenario; show market-risk caveat).
2. **Term insurance + PPF** (safe govt scenario).
3. **Bank FD** (simplest mental anchor: "even an FD beats this").

For each: "Same money, same years → you'd have ₹X instead of ₹Y. Gap: ₹Z."

### 2.5 Verdict logic (v0)
Output one of three, with the math shown:
- **Keep** — if policy IRR is reasonable for its guarantee/risk, or surrender penalty + tax + protection loss outweighs the gain from switching.
- **Make Paid-Up** — stop paying premiums, keep reduced cover, redirect future premiums to alternatives. Often optimal mid-policy.
- **Surrender & Reinvest** — if remaining-term IRR on *continuing* (i.e., the return on future premiums only) is poor and surrender value reinvested + term cover beats staying.

The key decision number is the **IRR on incremental future premiums** (forward-looking), not just the headline IRR — because money already sunk is sunk. Show both. Provide a clear **break-even**: "Continuing earns you ₹A; surrendering + term + index earns ₹B by maturity."

### 2.6 Mis-selling red-flag check (v0, rule-based)
Flag any of:
- Headline IRR < FD rate, or < inflation (~6%).
- Sold as "guaranteed"/"FD-like" but is market-linked or bonus-dependent (from extracted plan type).
- Premium-paying term very long relative to user age; or premium > ~10% of stated income (if income captured).
- High allocation/admin charges (ULIP) eroding returns.
Each flag = one plain-language sentence explaining the issue.

### 2.7 Out of scope for v0 (and forever, for the regulated ones)
- ❌ Recommending a **specific** policy/fund to buy (regulated; also kills trust). Generic categories only ("a pure term plan + a low-cost index fund").
- ❌ Bank-account sync / Account Aggregator / transaction data.
- ❌ Money movement, execution, lending.
- ❌ Health/general insurance (life only in v0).
- ❌ Tax filing.
- ⏳ (Later, not v0) advisor marketplace (fee-only / conflict-free RIAs), multi-policy household dashboard, debt module, vernacular UI, WhatsApp bot.

---

## 3. Financial engine spec (deterministic TypeScript — the heart of trust)

> Implement as a pure, well-unit-tested module `lib/finance/` with **no external calls and no LLM**. Every function takes plain numbers and returns plain numbers. Write unit tests with known textbook values.

### 3.1 IRR (internal rate of return)
Given a series of cashflows at times (in years), find annual rate `r` such that NPV = 0.

- Cashflows for a policy held to maturity: premium **outflows** at t = 0,1,2,…,(ppt−1) [negative], and the projected **maturity value inflow** at t = policyTerm [positive]. Money-back plans also have intermediate survival-benefit inflows — model them as positive cashflows at their due years.
- Solve with **bisection** (robust; bracket r in [-0.9, 1.0]) or Newton-Raphson with bisection fallback. Bisection is recommended for reliability over cleverness.
- Return `null`/flagged if no sign change (degenerate input) — surface a friendly error, never a wrong number.

```
function irr(cashflows: {year: number; amount: number}[]): number | null
// amount: negative = paid by user, positive = received by user
// returns annual effective rate, e.g. 0.043 for 4.3%
```

### 3.2 Future value of the alternative (buy term + invest the difference)
```
annualInvestable = annualPremium - estimatedAnnualTermPremium
FV = Σ over each premium year: annualInvestable * (1 + benchmarkRate)^(yearsRemainingToMaturity)
```
- `estimatedAnnualTermPremium`: estimate from a small lookup table by age & sum assured (term is cheap — often a few thousand ₹/yr for large cover). Make it a configurable table; document the assumption on-screen.
- Compute FV for each benchmark rate (index/PPF/FD).
- **Wealth gap = alternativeFV − insurerProjectedMaturityValue.**

### 3.3 IRDAI surrender value (Oct-2024 rules)
Surrender value paid = **max(GSV, SSV)**.

**Guaranteed Surrender Value (GSV)** = `gsvFactor(policyYear, ppt) × totalPremiumsPaid(excluding extra/rider premiums & taxes)`.
GSV factor bands (approx, per IRDAI norms — make them a configurable table, verify current values at build time):
- Year 1: eligible after 1 full year's premium.
- Years 2–3: ~30–35% of premiums paid.
- Years 4–7: ~50%.
- Last two years of premium-paying term: ~90%.
(Bonuses get an additional, lower surrender factor.)

**Special Surrender Value (SSV)** ≈ `paidUpValue + accruedBonuses` discounted by a surrender-value factor (insurer-specific; allow user to input the SSV directly from a surrender quote if they have one, else estimate and label clearly).

**Paid-up value** = `(premiumsPaid / totalPremiumsPayable) × sumAssured` (+ vested bonuses for with-profit).

```
function surrenderValue(input): { gsv: number; ssv: number; payable: number; paidUpValue: number }
```

> ⚠️ Surrender rules differ between policies bought **before vs. after 1-Oct-2024** and across insurers. Use conservative, clearly-labeled estimates, link to the insurer's surrender quote, and state "final figure confirmed by your insurer." Never present an estimate as exact.

### 3.4 Forward-looking decision metric
```
continuationIRR = irr( future premium outflows + maturity inflow, ignoring sunk past premiums )
exitValueAtMaturity = surrenderValuePayable invested at benchmarkRate to maturity
                      + (future premiums - termPremium) invested at benchmarkRate to maturity
verdict = compare maturityValueIfKept  vs  exitValueAtMaturity (net of surrender penalty & any tax)
```
Show both numbers and the gap; let the user see the reasoning, don't just assert.

### 3.5 Configurable assumptions (single source of truth)
Put in `lib/finance/assumptions.ts`, displayed to the user on the verdict screen ("Assumptions used"):
- Nifty index nominal return (default 11%, with risk caveat), PPF rate (current, ~7.1%), FD rate (~6.5–7%), inflation (~6%).
- Term-premium estimate table.
- GSV/SSV factor tables.
All editable by the user where reasonable, so the analysis is transparent and not a black box.

---

## 4. Tech architecture

### 4.1 Stack
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind CSS. Configure as a **PWA** (installable, offline shell). Mobile-first (India is mobile-majority).
- **Hosting:** Vercel free tier.
- **Backend:** Next.js Route Handlers (serverless). No separate server.
- **DB / Auth / Storage:** Supabase free tier (Postgres + Auth (email/OTP) + Storage for uploaded PDFs — or process-in-memory and don't persist the PDF for privacy; see §6).
- **LLM:** Anthropic Claude API. Use **Haiku** (claude-haiku-4-5) for cost. **Use prompt caching** on the static extraction system prompt. Document-extraction only.
- **PDF handling:** send the PDF to Claude via the API's document support; for scanned/image PDFs rely on the model's vision. Keep a manual-entry path for failures.
- **Finance engine:** pure TS in `lib/finance/`, fully unit-tested.
- **Report PDF generation:** client-side (e.g., a print-stylesheet "Download as PDF" or a lightweight lib) to avoid server cost.

### 4.2 Repo structure (suggested)
```
sach/
  app/
    page.tsx                  # landing
    upload/page.tsx           # upload + manual-entry entry point
    review/page.tsx           # editable extracted fields
    result/[id]/page.tsx      # verdict + shareable card
    api/
      extract/route.ts        # POST: PDF -> Claude -> structured fields
      analyze/route.ts        # POST: confirmed fields -> finance engine -> result
  lib/
    finance/
      irr.ts
      surrender.ts
      benchmarks.ts
      verdict.ts
      assumptions.ts
      index.ts
      __tests__/...            # unit tests with known values
    claude.ts                  # Anthropic client + extraction prompt + caching
    supabase.ts
    schema.ts                  # zod schemas for PolicyInput / AnalysisResult
  components/
    ResultCard.tsx             # the shareable card
    ...
  public/                      # manifest, icons (PWA)
```

### 4.3 Core data types (define with zod, share client+server)
```ts
type PolicyInput = {
  insurer: string;
  planName: string;
  policyType: 'endowment' | 'moneyback' | 'wholelife' | 'ulip' | 'term';
  sumAssured: number;
  annualPremium: number;
  premiumPayingTermYears: number;
  policyTermYears: number;
  startDate: string;          // ISO
  ageAtStart: number;
  projectedMaturityValue?: number;     // from insurer illustration (key input)
  illustrationScenario?: '4pct' | '8pct' | 'guaranteed' | 'entered';
  currentFundValue?: number;           // ULIP
  intermediatePayouts?: {year:number; amount:number}[]; // money-back
  surrenderValueQuoted?: number;       // if user has an exact quote
  annualIncome?: number;               // optional, for affordability flag
};

type AnalysisResult = {
  realIRR: number | null;
  continuationIRR: number | null;
  benchmarks: { label:string; rate:number; futureValue:number; gapVsPolicy:number }[];
  surrender: { gsv:number; ssv:number; payable:number; paidUpValue:number };
  verdict: 'keep' | 'paidup' | 'surrender';
  verdictReasonPlainText: string;      // LLM-written from the computed numbers
  redFlags: string[];
  assumptionsUsed: Record<string, number>;
};
```

### 4.4 LLM usage (strict boundaries)
- **`/api/extract`**: input PDF → output **only** `PolicyInput` JSON (use tool/structured output; validate with zod; reject/repair bad JSON). System prompt is static → cache it.
- **Plain-language text** (`verdictReasonPlainText`, red-flag phrasing): the LLM may *phrase* explanations, but it must be **given the already-computed numbers** and told not to compute or alter them. Temperature low.
- The LLM must **never** be in the path of producing IRR, surrender value, or the verdict decision. Those come from `lib/finance`.

---

## 5. UX / screens (v0)

1. **Landing** — one promise ("Find out what your insurance policy is *really* paying you — free, in 60 seconds, by your insurer's own numbers"), trust signals ("We don't sell insurance. We never see your bank account."), one CTA: *Check my policy*.
2. **Upload** — drag/drop or pick PDF; prominent "or enter details manually" link; reassurance about privacy (PDF processed, not stored unless you save the report).
3. **Review (editable)** — pre-filled extracted fields, each clearly editable, with helper text on where to find each on the policy doc. Highlight the projected-maturity field as most important. "Looks right? → Analyze."
4. **Result / Verdict** — above the fold: the headline IRR + verdict badge (Keep/Pause/Exit). Below: wealth-gap comparison (3 bars/cards), surrender vs paid-up numbers, red flags, "assumptions used" (expandable, editable), disclaimer. Two CTAs: **Share result** (generates card), **Download report** (PDF). Soft email capture to "save & get a reminder before your next premium."
5. **Shareable card** — clean image/"story" format: insurer + plan, big "Real return: 4.3%", "₹X less than term + index over Y years", Sach branding, no personal IDs. This is the growth engine — make it genuinely good.

Design: mobile-first, fast, calm, trustworthy (not "fintech flashy"). Hindi-ready copy structure (keep strings in one place for later i18n).

---

## 6. Privacy, regulatory & trust guardrails (do not skip)

- **Disclaimer (persistent, on result + footer):** "Sach provides educational analysis and calculators based on information you provide. It is not investment or insurance advice and Sach is not an IRDAI-registered intermediary. Confirm exact figures with your insurer. Consider a SEBI-registered fee-only adviser for personal advice."
- **No "buy X" recommendations** — only generic categories ("a pure term plan", "a low-cost index fund / PPF").
- **PDF privacy:** default to **process-and-discard** (don't persist the uploaded PDF). Persist only the structured `PolicyInput` + result *if* the user opts to save (email). State this clearly. This is both a trust feature and reduces data-liability.
- **No bank data, no AA, no money movement** — ever.
- **Accuracy honesty:** label every estimate as an estimate; use insurer's own numbers for the headline; link out to the insurer's surrender quote.

---

## 7. Monetization (later — NOT v0)
v0 is free, optimized purely for trust + virality + email capture. Future, conflict-free options (in priority order):
1. **Fee-only / conflict-free adviser referral** (flat fee, transparent, advisers who don't earn product commission). Honest by construction.
2. **Paid deep report** (multi-policy household, tax-on-surrender modelling, what-to-do-next plan).
3. **Affiliate to genuinely better products** (e.g., honest term-insurance providers) — only if disclosed and only generic categories; risk to trust, weigh carefully.
Never take insurer commissions for keeping people in bad policies. The whole brand is "Sach" (truth).

---

## 8. Build plan (milestones + acceptance criteria)

> Suggested order. Each milestone should be independently demoable.

**M0 — Scaffold**
- Next.js + TS + Tailwind + PWA manifest; deploy a "hello" to Vercel; env wired for Supabase + Anthropic keys.
- ✅ Done when: blank app live on a Vercel URL, installable as PWA.

**M1 — Finance engine (do this before any UI polish)**
- Implement `irr`, `surrenderValue`, `benchmarks`, `verdict`, `assumptions` with unit tests using hand-verified examples (e.g., a known endowment: ₹50k/yr × 20yr, ₹X maturity → assert IRR ≈ known value).
- ✅ Done when: all finance unit tests pass; numbers match a manual spreadsheet for 3 sample policies (1 endowment, 1 ULIP, 1 money-back).

**M2 — Manual-entry path end-to-end**
- Form → `/api/analyze` → result screen with real IRR, 3 benchmarks, surrender/paid-up, verdict, red flags, assumptions.
- ✅ Done when: a user can manually analyze a policy and get a correct, complete verdict without any PDF/LLM.

**M3 — PDF extraction + editable review**
- `/api/extract` (Claude Haiku, structured output, zod-validated, prompt-cached) → pre-fill review screen → confirm → reuse M2 analyze.
- ✅ Done when: uploading a real LIC/HDFC Life illustration pre-fills the review screen; user corrects 0–2 fields; analysis runs. Graceful fallback to manual on extraction failure.

**M4 — Shareable card + report + email capture**
- Generate the share card image; "Download report" PDF; Supabase email capture + saved report retrieval by link.
- ✅ Done when: result is shareable as an image and saveable; email stored in Supabase.

**M5 — Polish, disclaimers, launch prep**
- Mobile QA, copy pass, disclaimer placement, basic analytics (privacy-friendly), error states, rate-limiting on the API routes (cost protection).
- ✅ Done when: ready to share publicly; LLM cost per analysis measured and capped.

---

## 9. Open items to confirm / verify at build time
- **Verify current IRDAI GSV/SSV factor tables** and the pre-/post-1-Oct-2024 distinction before shipping the surrender module (rules evolve).
- **Verify current benchmark rates** (PPF, FD) at build time; keep them in `assumptions.ts`.
- Decide PWA push/reminder feature (premium-due reminder) — nice retention hook, optional for v0.
- Confirm Anthropic model id + pricing for the extraction model at build time; implement prompt caching.
- Domain/name: **Sach** (confirm availability of e.g. sach.in / getsach / sachapp; "Sach" = "truth" in Hindi).

---

## 10. Things that will tempt you — and why you must resist
- "Let's just let the LLM compute the IRR too." → **No.** Deterministic math is the entire trust thesis. LLMs do arithmetic unreliably.
- "Let's add bank sync / debt / lending for more value." → **No.** Triggers regulation; breaks the bootstrap + no-regulation thesis.
- "Let's recommend the best policy to buy." → **No.** Regulated advice + destroys conflict-free positioning.
- "Pure PDF→verdict is sexier, drop the review screen." → **No.** Mis-reads will produce wrong verdicts and destroy trust on day one.

---

*End of handover. Build M0→M5 in order. The non-negotiables: deterministic math, insurer's-own-numbers headline, never sell anything, editable review before compute.*

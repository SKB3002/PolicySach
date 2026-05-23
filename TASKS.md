# Sach — Build Tracker

> **Living document.** Update checkboxes as we go. This is our single source of truth for launch readiness.
> Source of scope: [PRD.md](PRD.md). Non-negotiables: deterministic math · insurer's-own-numbers headline · never sell · editable review before compute.

---

## 🎯 Timeline

| Day | Date | Focus | Milestone |
|---|---|---|---|
| Fri | May 22 | Scaffold + Finance engine | M0 + start M1 |
| Sat | May 23 | Finish finance engine + manual-entry end-to-end | M1 + M2 |
| Sun | May 24 | PDF extraction + editable review | M3 |
| Mon | May 25 | Share card + report + polish + disclaimers | M4 + M5 |
| **Tue** | **May 26** | **🚀 LAUNCH** | Deploy + smoke test + go live |

**Launch-critical path:** M0 → M1 → M2 → M3 → disclaimers + deploy. M4 (share card) and email capture are the growth engine — important, but if a day slips, manual-entry + PDF + verdict + disclaimer is the true MVP that can ship.

---

## M0 — Scaffold  `[ ]`  *(Fri AM)*
- [ ] Next.js (App Router) + TypeScript + Tailwind initialized in `c:\Suyash_Projects\Sach`
- [ ] `git init` + first commit + push to remote
- [ ] PWA manifest + icons + installable
- [ ] Env wiring: `ANTHROPIC_API_KEY`, Supabase URL/keys (`.env.local` + `.env.example`)
- [ ] Deploy "hello" to Vercel — live URL works
- [ ] Repo structure stubbed per PRD §4.2 (`app/`, `lib/finance/`, `lib/claude.ts`, `lib/schema.ts`, `components/`)
- **✅ Done when:** blank app live on Vercel URL, installable as PWA.

## M1 — Finance Engine  `[ ]`  *(Fri PM → Sat AM)* ⭐ DO BEFORE ANY UI POLISH
- [ ] `lib/schema.ts` — zod schemas for `PolicyInput` + `AnalysisResult` (PRD §4.3)
- [ ] `lib/finance/assumptions.ts` — index/PPF/FD/inflation rates, term-premium table, GSV/SSV factor tables
- [ ] `lib/finance/irr.ts` — bisection IRR solver, returns `null` on no sign change
- [ ] `lib/finance/surrender.ts` — GSV, SSV, paid-up value, `payable = max(GSV, SSV)`
- [ ] `lib/finance/benchmarks.ts` — term+index / term+PPF / FD future values + wealth gap
- [ ] `lib/finance/verdict.ts` — keep / paidup / surrender + continuationIRR + break-even
- [ ] `lib/finance/index.ts` — orchestrates full `AnalysisResult`
- [ ] **Unit tests** with hand-verified values (textbook IRR, known endowment)
- [ ] ⚠️ **VERIFY at build time:** current IRDAI GSV/SSV factors (pre/post 1-Oct-2024), current PPF/FD rates (PRD §9)
- **✅ Done when:** all finance unit tests pass; numbers match a manual spreadsheet for 3 sample policies (endowment, ULIP, money-back).

## M2 — Manual-Entry End-to-End  `[ ]`  *(Sat PM)*
- [ ] `/api/analyze` route — confirmed `PolicyInput` → finance engine → `AnalysisResult`
- [ ] Manual-entry form (PRD §5.2) with helper text per field
- [ ] Result/Verdict screen (PRD §5.4): headline IRR + verdict badge, 3 benchmark bars, surrender vs paid-up, red flags, "assumptions used" (expandable/editable), disclaimer
- [ ] Red-flag rule checks (PRD §2.6)
- **✅ Done when:** user can manually analyze a policy → correct, complete verdict, no PDF/LLM needed.

## M3 — PDF Extraction + Editable Review  `[ ]`  *(Sun)*
- [ ] `lib/claude.ts` — Anthropic client, static extraction system prompt + **prompt caching**, Haiku model
- [ ] `/api/extract` — PDF → Claude structured output → zod-validated `PolicyInput` (repair/reject bad JSON)
- [ ] Upload screen (drag/drop + "enter manually" + privacy reassurance)
- [ ] Editable Review screen — pre-filled, every field editable, projected-maturity highlighted as most important
- [ ] Graceful fallback to manual entry on extraction failure
- [ ] ⚠️ Confirm Anthropic model id + pricing; verify prompt caching active
- **✅ Done when:** real LIC/HDFC illustration pre-fills review; user corrects 0–2 fields; analysis runs; failure falls back cleanly.

## M4 — Share Card + Report + Email  `[ ]`  *(Mon AM)* — growth engine
- [ ] `components/ResultCard.tsx` — shareable image/story (insurer + plan, big "Real return: X%", wealth gap, Sach branding, **no personal IDs**)
- [ ] "Download report" PDF (client-side print stylesheet — no server cost)
- [ ] Supabase email capture + save report + retrieve-by-link
- **✅ Done when:** result is shareable as image + saveable; email stored in Supabase.

## M5 — Polish, Disclaimers, Launch Prep  `[ ]`  *(Mon PM)* 🚨 NON-NEGOTIABLE FOR LAUNCH
- [ ] **Persistent disclaimer** on result + footer (exact text, PRD §6)
- [ ] **PDF privacy:** process-and-discard by default; persist structured data only if user saves
- [ ] Landing page (PRD §5.1): one promise, trust signals, single CTA
- [ ] Mobile QA (India is mobile-majority) + copy pass
- [ ] **Rate-limiting** on `/api/extract` + `/api/analyze` (LLM cost protection)
- [ ] LLM cost per analysis measured + capped
- [ ] Error states for all failure paths
- [ ] Basic privacy-friendly analytics
- **✅ Done when:** ready to share publicly; LLM cost per analysis measured and capped.

## 🚀 LAUNCH DAY — Tue May 26  `[ ]`
- [ ] Final production deploy to Vercel
- [ ] Smoke test full flow on a real phone: upload → review → verdict → share → download
- [ ] Verify disclaimer visible everywhere
- [ ] Verify no PDF persisted unless user opts in
- [ ] Rate limits + cost caps live
- [ ] Domain pointed (sach.in / getsach — confirm availability, PRD §9)
- [ ] Go live + announce

---

## 🛑 Guardrails — DO NOT VIOLATE (PRD §10)
- ❌ LLM never computes IRR / surrender / verdict — deterministic TS only.
- ❌ No "buy this specific product" — generic categories only.
- ❌ No bank sync / Account Aggregator / money movement.
- ❌ Never drop the editable review screen.

## 📌 Open verifications (PRD §9) — resolve before shipping
- [ ] Current IRDAI GSV/SSV factor tables (pre vs post 1-Oct-2024)
- [ ] Current PPF + FD benchmark rates
- [ ] Anthropic extraction model id + pricing + prompt caching
- [ ] Domain availability (sach.in / getsach / sachapp)

## 🔄 Cut-list (if a day slips — drop in this order)
1. Email capture / saved reports (M4)
2. Share card (M4) — keep download report as fallback
3. PDF extraction (M3) — launch with manual-entry only, add PDF post-launch
> The irreducible MVP: manual entry → correct verdict → disclaimer → deployed.

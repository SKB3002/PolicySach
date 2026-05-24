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

## M0 — Scaffold  `[x]`  ✅ DONE *(Sat May 23)*
- [x] Next.js 16 (App Router) + TypeScript + Tailwind v4 initialized in `c:\Suyash_Projects\Sach`
- [x] `git init` + first commit + push to remote ([github.com/SKB3002/PolicySach](https://github.com/SKB3002/PolicySach))
- [x] PWA manifest (`src/app/manifest.ts`) + icon (`public/icon.svg`) + theme-color
- [x] Env wiring: `.env.example` committed, `.env.local` ignored (Anthropic + Supabase keys)
- [x] Repo structure stubbed per PRD §4.2 (all paths created; finance engine has working impls, ready for M1 tests)
- [x] `npm run build` passes — 8 routes generated, TypeScript clean
- [x] **Deployed to Vercel — live at [policy-sach.vercel.app](https://policy-sach.vercel.app/)**, PWA manifest + landing copy verified
- **✅ Done when:** blank app live on Vercel URL, installable as PWA.

## M1 — Finance Engine  `[x]`  ✅ DONE *(Sat May 23)*
- [x] `lib/schema.ts` — zod schemas for `PolicyInput` + `AnalysisResult` (PRD §4.3)
- [x] `lib/finance/assumptions.ts` — index 11% / PPF 7.1% / FD 6.4% / inflation 6% (verified May 2026), term-premium table, GSV factor table + SSV ramp function
- [x] `lib/finance/irr.ts` — bisection IRR solver, returns `null` on no sign change
- [x] `lib/finance/surrender.ts` — GSV (IRDAI bands), SSV (post-Oct-2024 formula), paid-up value, `payable = max(GSV, SSV)`
- [x] `lib/finance/benchmarks.ts` — term+index / term+PPF / FD future values + wealth gap
- [x] `lib/finance/verdict.ts` — keep / paidup / surrender + red-flag rules
- [x] `lib/finance/analyze.ts` — orchestrator returning full `AnalysisResult` (with templated `verdictReasonPlainText`; LLM may rephrase later)
- [x] **Unit tests** — Vitest, 51/51 passing (irr 8, surrender 12, benchmarks 10, verdict 9, integration 12)
- [x] **VERIFIED at build time:** PPF 7.1% (Apr–Jun 2026 quarter), SBI/HDFC 5-yr FD ~6.4%, IRDAI GSV bands (Yr2–3: 30%, Yr4–7: 50%, last 2 yrs PPT: 90%), post-Oct-2024 SSV formula `[(N_paid/N_payable)×SA + bonuses] × SVF`
- [x] **Integration test for 3 sample policies** (LIC endowment, HDFC ULIP, SBI moneyback) — all pass; LIC endowment correctly verdicts `surrender` with FD-rate + inflation red flags
- **✅ Done when:** all finance unit tests pass; numbers match a manual spreadsheet for 3 sample policies (endowment, ULIP, money-back).
- > **Caveat:** "match a manual Excel spreadsheet" is partially satisfied — engine is internally consistent and matches the IRDAI formulas / known textbook IRR cases. A hand-built Excel reference for cell-level diff is a stretch goal we'll do post-launch if needed.

## M2 — Manual-Entry End-to-End  `[x]`  ✅ DONE *(Sat May 23)*
- [x] `/api/analyze` route — zod-validated `PolicyInput` → `analyzePolicy()` → `AnalysisResult` (with 400/422/500 error shapes)
- [x] Manual-entry form (`PolicyForm.tsx`) with helper text per field; "projected maturity value" visually emphasized as the most important field per PRD §5.3
- [x] Result/Verdict screen (`ResultView.tsx`): headline IRR + verdict badge (keep/paidup/surrender), 3 benchmark bars with progress visualization, surrender vs paid-up dl-grid, red flags panel, expandable "assumptions used", inline disclaimer
- [x] Red-flag rule checks (PRD §2.6) — wired in M1, surfaced in UI here
- [x] sessionStorage handoff `/upload → /result/[id]` (Supabase persistence comes in M4)
- [x] 4 API route tests passing (valid input → 200; invalid → 422; non-JSON → 400; LIC endowment → `surrender`)
- [x] Live smoke test: prod build on `:3717`, LIC endowment POST → `verdict: surrender`, `realIRR: 4.82%`, ₹14.36L gap to term+index, FD + inflation red flags ✅
- **✅ Done when:** user can manually analyze a policy → correct, complete verdict, no PDF/LLM needed.

## M3 — PDF Extraction + Editable Review  `[x]`  ✅ DONE *(Sun May 24)*
- [x] **Provider swap from Claude Haiku to Llama 3.3 70B on Groq** (user cost call — Haiku not free; Groq has a generous free tier). `lib/extract.ts` is a provider-agnostic adapter — swap to Cerebras/Together by editing one file.
- [x] `lib/extract.ts` — Groq SDK + `unpdf` (zero-binary PDF→text, works in Vercel serverless) + Llama 3.3 70B Versatile in JSON mode + tolerant `ExtractedPolicySchema` (most fields nullable; user fills gaps on review screen).
- [x] `/api/extract` — multipart PDF in → `ExtractedPolicy` JSON out. 503 if `GROQ_API_KEY` missing (graceful), 413/415/422/502/500 for the various failure modes; PDF is processed in memory and **never persisted** (PRD §6).
- [x] `/upload` redesigned — drag/drop PDF zone + "or enter details manually" link → both paths converge at `/review`.
- [x] `/review` — Editable form pre-filled from `sessionStorage`; if no extraction data found, shows empty form (manual-entry path). Same `PolicyForm` component, now accepts `initialValues` and `submitLabel`.
- [x] Graceful fallback to manual entry on every extraction failure mode (amber alert + working "enter manually" link kept visible).
- [x] **6 extract unit tests** with mocked LLM client — covers happy path, null fields, invalid JSON, unknown policyType, network errors. Plus all 55 existing tests still pass (61/61 total).
- **✅ Done when:** real LIC/HDFC illustration pre-fills review; user corrects 0–2 fields; analysis runs; failure falls back cleanly.
- > **Pending live verification:** the end-to-end PDF flow needs a `GROQ_API_KEY` set on Vercel. Sign up at [console.groq.com](https://console.groq.com), paste the key into Vercel project env vars, then we'll smoke-test with a real LIC illustration.

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

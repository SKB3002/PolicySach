# Sach · सच — PolicySach

> Upload your life-insurance policy PDF. Get the truth: real return, wealth gap vs simple alternatives, surrender / paid-up / keep verdict — by your insurer's own numbers. Free. Conflict-free.

## What it is

Sach is a free, conflict-free PWA for Indian retail users. A user uploads their life-insurance policy or benefit illustration PDF. Sach reads it, then — using the insurer's own projected numbers — tells them:

- The **real annualised return (IRR)** the policy actually delivers.
- The **wealth gap** vs. simple alternatives (term + index fund / term + PPF / FD).
- The **surrender value, paid-up value**, and break-even math.
- A clear **Keep / Pause / Exit verdict** with reasoning.
- A **shareable result card** and downloadable PDF report.

**Non-negotiables:**

1. All financial math is deterministic TypeScript. The LLM is used **only** to read the document and phrase plain-language explanations. It never computes a number a user relies on.
2. Sach never sells insurance, never recommends a specific product to buy, never touches bank data or money movement.

See [PRD.md](PRD.md) for the full product spec and [TASKS.md](TASKS.md) for the live build tracker.

## Stack

- **Frontend / hosting:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4, PWA · Vercel free tier
- **Auth / DB / Storage:** Supabase free tier (Postgres + Auth + Storage)
- **LLM:** Anthropic Claude Haiku (`claude-haiku-4-5`) — document extraction only, with prompt caching
- **Finance engine:** pure TypeScript in [src/lib/finance/](src/lib/finance/), fully unit-tested

## Local development

```bash
npm install
cp .env.example .env.local   # fill in Anthropic + Supabase keys
npm run dev                   # http://localhost:3000
```

Other useful scripts:

```bash
npm run build    # production build
npm start        # serve the production build locally
npm run lint     # eslint
```

## Repo layout (PRD §4.2)

```
src/
  app/
    page.tsx              landing
    upload/page.tsx       upload + manual-entry entry point
    review/page.tsx       editable extracted fields
    result/[id]/page.tsx  verdict + shareable card
    api/extract/route.ts  POST: PDF -> Claude -> PolicyInput
    api/analyze/route.ts  POST: confirmed fields -> finance engine
    manifest.ts           PWA manifest
  lib/
    finance/              deterministic engine (irr, surrender, benchmarks, verdict)
    claude.ts             Anthropic client + extraction prompt (caching)
    supabase.ts           Supabase clients
    schema.ts             zod schemas — shared client + server
  components/             ResultCard + UI
public/                   icons, manifest assets
```

## Disclaimer

Sach provides educational analysis and calculators based on information you provide. It is not investment or insurance advice and Sach is not an IRDAI-registered intermediary. Confirm exact figures with your insurer. Consider a SEBI-registered fee-only adviser for personal advice.

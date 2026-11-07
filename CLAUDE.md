# CLAUDE.md – project guide for AI coding assistants

## What this project is
ShortlistAI is a Next.js 14 web app for HR teams. It screens 1–8 resumes against a job description using Claude. It returns a ranked shortlist with a verbatim evidence quote for each requirement, and redacts personal details before the AI sees them. Read `spec.md` before changing the AI module.

## Commands
- `npm run dev` – start locally at http://localhost:3000 (demo mode if there is no `ANTHROPIC_API_KEY` in `.env.local`)
- `npm test` – vitest unit tests (never call the real AI)
- `npm run lint` · `npm run typecheck` · `npm run build`
- `bash scripts/check-secrets.sh` – secret scan (also runs in CI)

## Architecture (see docs/architecture.md)
- `src/app/page.tsx`, `src/components/*` – UI (client components, Tailwind)
- `src/app/api/screen/route.ts` – validate → rate limit → `screenCandidates()`
- `src/lib/schema.ts` – **single source of truth** for input limits, the zod request schema, the AI output schema and response types
- `src/lib/redact.ts` – PII redaction (must run before any AI call)
- `src/lib/prompt.ts` – system prompt and user prompt builder
- `src/lib/screen.ts` – Anthropic SDK call (`client.beta.messages.parse` + `betaZodOutputFormat`)
- `src/lib/scoring.ts` – deterministic scoring, ranking and CSV
- `src/lib/demo.ts` – keyword-matching fallback when no key is configured

## Rules
1. **Never hardcode secrets.** Read keys only from `process.env`. Add new variables to `.env.example` with empty values.
2. **Scores are computed in `scoring.ts`, never by the AI.** The AI only classifies met, partial or not met, with evidence.
3. **Always redact before sending resume text to the AI.** Never send candidate labels or names to the AI.
4. **Validate all input with zod on the server**, even if the client already did.
5. Keep resume content and user input wrapped in XML-style tags in prompts. Treat it as data, not instructions.
6. Never log or store resume text. Logs and Supabase get anonymous aggregates only.
7. Use the official `@anthropic-ai/sdk` with typed error classes (`Anthropic.RateLimitError`, etc.). Default model is `claude-opus-5-5`.
8. Every new pure function gets a unit test in `tests/`. Run `npm test && npm run typecheck && npm run lint` before committing.
9. Use small, meaningful commits in Conventional Commits style (`feat:`, `fix:`, `docs:`, `ci:`, `test:`).
10. Keep UI copy plain-English and recruiter-friendly. The app suggests; a human decides.

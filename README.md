# ShortlistAI 🔒

**ShortlistAI screens resumes for small HR teams. It ranks candidates fairly, and every score comes with evidence quoted from the resume.**

Paste a job description and up to 8 resumes. In under a minute you get:

- a **ranked shortlist** with a transparent fit score
- **met / partial / not met** for every requirement, each backed by a **verbatim quote** from the resume
- **3 interview questions** for each candidate, aimed at their gaps
- **CSV export** for Excel or your ATS

Names, contact details, age, sex, civil status, religion and government IDs are **removed before the AI sees anything**.

🌐 **Live app:** https://YOUR-APP.vercel.app  ← _replace after deploying_
🎬 **2-minute demo:** _link to your video_

![CI](https://github.com/Marc-VGC/shortlist-ai/actions/workflows/ci.yml/badge.svg)

---

## Why
HR generalists at Philippine SMEs get dozens to hundreds of applications per role. Applications per job more than doubled between 2022 and 2024, and recruiters spend seconds on each resume. Generic chatbots give no consistent rubric, no evidence and no privacy protection. ShortlistAI fills that gap. See [docs/01-idea-validation.md](docs/01-idea-validation.md).

## Project documents
| Deliverable | File |
|---|---|
| Idea Validation Report (7 steps) | [docs/01-idea-validation.md](docs/01-idea-validation.md) |
| Product Requirements Document | [docs/02-PRD.md](docs/02-PRD.md) |
| Spec (AI module) | [spec.md](spec.md) |
| Architecture notes | [docs/architecture.md](docs/architecture.md) |
| AI assistant config | [CLAUDE.md](CLAUDE.md), [.cursorrules](.cursorrules) |
| User testing log | [docs/user-testing.md](docs/user-testing.md) |
| Reflection | [docs/reflection.md](docs/reflection.md) |

## Tech stack
| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| AI | Claude (`claude-opus-5-5`) via the official Anthropic TypeScript SDK, with structured outputs (zod) |
| Data / analytics | Supabase (optional, anonymous usage only) + Vercel Analytics |
| Deploy | Vercel (auto-deploys from GitHub) |
| CI | GitHub Actions: lint, type-check, unit tests, build, secret scan; plus a daily uptime check |
| Tests | Vitest (22 unit tests) |

## How it works
```
Browser ──POST /api/screen──▶ validate (zod) ▶ rate limit ▶ redact PII ▶ Claude (structured JSON)
                                                                      ▶ score & rank in code ▶ results
```
- **Score formula** (in code, not by the AI): met = 1 and partial = 0.5; must-haves count 2×, nice-to-haves 1×; the score is a percentage of the maximum possible.
- **Recommendation:** Strong yes (≥ 80 and all must-haves met) · Yes (≥ 65) · Maybe (≥ 45) · No.

## Run it locally
Requirements: [Node.js 20+](https://nodejs.org).

```bash
git clone https://github.com/Marc-VGC/shortlist-ai.git
cd shortlist-ai
npm install
cp .env.example .env.local      # then put your Anthropic API key in .env.local
npm run dev                      # open http://localhost:3000
```
Without an API key the app runs in **demo mode**, which uses keyword matching and is clearly labelled, so you can still try the UI.

### Environment variables
| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes, for real AI | Get one at https://console.anthropic.com |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-opus-5-5` |
| `RATE_LIMIT_PER_HOUR` | No | Screenings per IP per hour (default 20) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | No | Anonymous usage analytics. Run `supabase/schema.sql` first. |

Secrets live only in `.env.local` (git-ignored) and in Vercel's environment variables. **None are committed.** CI runs `scripts/check-secrets.sh` to enforce this.

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run the unit tests (never calls the paid AI) |
| `npm run lint` / `npm run typecheck` | Code quality checks |
| `npm run build` | Production build |

## API
`POST /api/screen`
```json
{
  "jobTitle": "Customer Support Team Lead",
  "jobDescription": "…at least 80 characters…",
  "extraRequirements": ["Can start within 30 days"],
  "candidates": [{ "label": "Applicant A", "resumeText": "…" }]
}
```
The response contains `requirements[]`, ranked `candidates[]` (with score, recommendation, requirement matches with evidence, strengths, gaps and interview questions), `mode`, `model` and `durationMs`. `GET /api/health` returns the health status. The full contract is in [spec.md](spec.md).

## Deployment
1. Push to GitHub, then import the repo in [Vercel](https://vercel.com/new).
2. Add `ANTHROPIC_API_KEY` under Project → Settings → Environment Variables, then redeploy.
3. Every push to `main` runs CI and auto-deploys. Pull requests get preview URLs.
4. Optional: set the repo variable `LIVE_URL` so `uptime.yml` checks `/api/health` every day.

## Monitoring
- Vercel Analytics (page views), Vercel Logs (one JSON line per screening), the `/api/health` daily uptime workflow, and an optional Supabase `screenings` table.

## Responsible AI
- Personal details are redacted before the AI call, and candidates are sent as anonymous ids.
- The AI must quote evidence verbatim. Scores are computed by a published formula.
- Resume text is never stored or logged.
- **ShortlistAI suggests; people decide.** Always review the evidence before rejecting anyone.

## Roadmap (v2)
PDF/DOCX upload · saved roles and history (Supabase Auth) · team sharing · Filipino/Taglish resume support · bias audit dashboard. See the GitHub Issues.

## License
MIT

# PRD – ShortlistAI (v1.0 MVP)

**Owner:** Marc · **Status:** Shipped (MVP) · **Last updated:** Nov 2026

## 1. Problem statement
HR generalists at Philippine SMEs receive 50–300 applications per role and must shortlist them within days. Manual screening is slow (resumes get skimmed in seconds), inconsistent between reviewers, and biased by personal details such as names, age, sex and civil status, which are common on local resumes. Generic chatbots don't fix this. They give no fixed rubric, no evidence and no privacy protection. *(Evidence: see the Idea Validation Report, Steps 3–4.)*

## 2. Target users and personas
- **Primary – "Jessa", HR generalist (a 1–2 person HR team, 30–200 staff).** Hires high-volume roles, tracks applicants in Excel and has no ATS budget. Needs a shortlist she can defend.
- **Secondary – the hiring manager.** Receives the shortlist and wants to see *why* each candidate is on it.

## 3. Goals and success metrics
| Goal | Metric | Target (MVP) |
|---|---|---|
| Save screening time | Time from paste to shortlist | < 90 s for 4–8 resumes |
| Trustworthy output | Evidence quotes that appear verbatim in the resume | 100% of spot-checked quotes |
| Fair process | Protected personal fields redacted before the AI call | ≥ 95% on the test set |
| Useful in practice | Testers who would use it for their next role | ≥ 4 of 5 |
| Reliable | Failed screenings (5xx) | < 2% |
| Affordable | AI cost per screening | < US$0.20 |

## 4. Features and user stories, with acceptance criteria
| ID | User story | Acceptance criteria (testable) |
|---|---|---|
| **F1 Job input** | As an HR user, I paste a job title and description, plus optional extra must-haves. | Title 2–120 chars; JD 80–12,000 chars; up to 8 extra requirements. An invalid entry shows a readable error and sends no AI call. |
| **F2 Candidate input** | I add 1–8 resumes by pasting text or uploading a .txt file. | Each resume 80–15,000 chars. Add and remove buttons work. Character counter shown. A 9th candidate is blocked. |
| **F3 PII redaction** | Personal details are removed before the AI sees them. | Emails, phone numbers (PH formats), links, a name on the first line, and Age / Sex / Civil Status / Religion / DOB / Address / SSS / TIN lines are replaced with placeholders. The UI shows how many details were hidden per candidate. Covered by unit tests. |
| **F4 AI requirement extraction** | The AI turns the JD into 4–8 checkable requirements. | Each requirement has an ID, text and a must-have or nice-to-have label. Extra must-haves always appear as must-haves. |
| **F5 Evidence-based assessment** | For each candidate and requirement I see met, partial or not met, with a quote. | Every candidate × requirement cell has a status. A "met" or "partial" has a verbatim quote of 25 words or fewer; a "not met" has an empty quote. The output is schema-validated. |
| **F6 Transparent ranking** | Candidates are ranked by a score I can understand. | Score = (met 1, partial 0.5; must-haves weighted 2×) ÷ maximum × 100, calculated in code. Sorted from highest score. Recommendation labels: strong yes, yes, maybe, no. |
| **F7 Interview questions** | Each candidate gets 3 questions that probe their gaps. | Exactly 3 questions per candidate, with a Copy button. |
| **F8 Export** | I can export the shortlist. | Download CSV gives one row per candidate, with rank, score and the status for each requirement. |
| **F9 Safe failure** | Errors are clear, never a blank screen. | Shows readable messages for 400, 429 (rate limit) and 5xx. Demo mode (clearly labelled) runs when no AI key is configured. |

## 5. Scope and non-goals
**In scope (v1):** a single-page web app; text and .txt input; up to 8 candidates per run; English resumes; CSV export; anonymous usage analytics.
**Out of scope (v1):** user accounts and login, saved roles or history, PDF and DOCX parsing, direct ATS or job-portal integration, automatic rejection emails, payments, non-English resumes. **The app never makes the final hiring decision. A human does.**

## 6. Constraints, risks and assumptions
- **Tech:** Next.js 14 + Tailwind CSS on Vercel; Claude (claude-opus-5-5) through the official Anthropic SDK with structured outputs; Supabase (optional) for anonymous usage logs; GitHub Actions CI.
- **Privacy:** resume text is never stored. Only anonymous aggregates are logged (role title, counts, top score, duration). Personal details are redacted before the AI call (RA 10173).
- **Security:** the API key lives only in environment variables. Input is validated on both client and server. The app has per-IP rate limiting and a guard against prompt injection (resumes are treated as data).
- **Risks and mitigations:** the AI might invent evidence (mitigated by a strict verbatim-quote instruction, an evidence column the user can check, and a test plan); bias might remain in the job-related text (mitigated by redaction, the fairness rules in the system prompt, and the human-in-the-loop disclaimer); cost abuse on a public URL (mitigated by the rate limit and input size caps); serverless timeout (mitigated by the 8-candidate cap and a 120 s function limit; measured 46 s for 4 resumes and 62 s for 6).
- **Assumptions:** users can copy resume text; English JDs; AI cost of about US$0.05–0.15 per run at current pricing.
- **Timeline:** Week 4 sprint, from validation through PRD, spec, build, deploy and demo.

# Reflection – Building ShortlistAI

> ✏️ **Marc: this is a draft. Make it yours before you submit.** Replace anything that doesn't match your real experience, and fill in the `[brackets]`. Graders reward honest, specific reflection. Keep it to about one page.

## What I built
ShortlistAI is a web app that helps HR generalists at small Philippine companies shortlist applicants quickly and fairly. A recruiter pastes a job description and up to 8 resumes. Claude extracts the job's requirements and checks each resume against them, quoting evidence. The app then calculates a transparent score, ranks the candidates and suggests interview questions. Personal details are removed before the AI sees the resumes. The app is live at [URL], has a GitHub Actions pipeline and has 22 unit tests.

## Key learnings
1. **Validation before code changed the product.** I first imagined a "resume chatbot". The validation steps showed that the real problem is *trust and fairness*, not just speed. That led to the two features that make the product different: evidence quotes and PII redaction.
2. **Let the AI judge and let the code do the arithmetic.** My first spec had the AI produce a 0–100 score. During spec review I realised that number couldn't be explained or tested. Moving the score into a simple formula made the app more trustworthy and gave me something to unit-test.
3. **Structured outputs make AI features buildable.** Defining the exact JSON shape with a schema meant the UI could rely on the AI's response. Without that, I'd be parsing free text.
4. **Writing the spec and CLAUDE.md first made AI-assisted coding work better.** When I gave the coding assistant clear rules ("never hardcode secrets", "always redact first"), its output was consistent with my design.
5. **Engineering basics matter even for an MVP.** CI caught [describe anything CI caught, or say it gave you confidence to change code]. Environment variables kept my API key out of GitHub.

## Challenges
- **[Your biggest challenge, e.g. "I had never used Git, GitHub or Vercel before, so connecting the repo and setting environment variables took the longest."]**
- **Bias and privacy.** Philippine resumes often include age, civil status, religion and photos. Writing redaction rules that remove these without deleting job-relevant content took several iterations and tests.
- **Cost and abuse on a public URL.** With no login, anyone could spend my API credits. I added rate limiting, input size caps and a demo mode.
- **[Anything that broke during deployment or user testing, and how you fixed it.]**

## User testing results
> Summarise docs/user-testing.md here, e.g. "I tested with 3 HR practitioners. 3/3 said the evidence quotes made the ranking easier to trust; 2/3 asked for PDF upload, which became my v2 issue."

## What I would improve in v2
1. **PDF and DOCX upload**, because most resumes aren't plain text (GitHub issue #1).
2. **Accounts and saved roles** with Supabase Auth, so recruiters can come back to a shortlist and share it with hiring managers.
3. **A shared rate limit** (Redis) and per-user quotas instead of the in-memory limiter.
4. **An evaluation set** of 30–50 labelled resumes, to measure accuracy and check for bias regressions whenever the prompt changes.
5. **Filipino and Taglish resume support**, and redaction of photos.

## If I started again
I would test with real recruiters even earlier, using a paper or Figma mock-up before writing code, and I would set up deployment on day one so every commit could be tried live.

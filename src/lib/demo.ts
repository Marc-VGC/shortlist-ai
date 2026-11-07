import type { AIScreening, Requirement, ScreenRequest } from "./schema";

/**
 * Demo mode: used when no ANTHROPIC_API_KEY is configured (local dev, CI,
 * or a preview deploy). It does simple keyword matching so the whole UI
 * can be tried without spending API credits. The UI clearly labels it.
 */
const STOPWORDS = new Set(
  "a an and are as at be by for from has have in is it of on or our the to we with you your will must should years year experience".split(" "),
);

function keywords(text: string): string[] {
  return [...new Set(text.toLowerCase().match(/[a-z][a-z+#.-]{2,}/g) ?? [])].filter((w) => !STOPWORDS.has(w));
}

function extractRequirements(req: Pick<ScreenRequest, "jobDescription" | "extraRequirements">): Requirement[] {
  // Prefer bullet points under a "Requirements / Qualifications / Preferred" heading.
  const raw = req.jobDescription.split("\n");
  const bullets: Array<{ text: string; inReqSection: boolean }> = [];
  let inReqSection = false;
  for (const line of raw) {
    const t = line.trim();
    if (/:\s*$/.test(t) && t.length < 60) {
      inReqSection = /require|qualif|prefer|must|skill/i.test(t);
      continue;
    }
    if (/^[•*\-–]|^\d+[.)]/.test(t)) {
      const text = t.replace(/^[\s•*\-–\d.)]+/, "").trim();
      if (text.length > 10 && text.length < 200) bullets.push({ text, inReqSection });
    }
  }
  const reqBullets = bullets.filter((b) => b.inReqSection);
  const lines = (reqBullets.length >= 3 ? reqBullets : bullets).map((b) => b.text);

  const picked = lines.slice(0, 8).map<Requirement>((text, i) => ({
    id: `R${i + 1}`,
    text,
    priority: /prefer|plus|nice|bonus|advantage/i.test(text) ? "nice_to_have" : "must_have",
  }));
  const extras = req.extraRequirements.map<Requirement>((text, i) => ({
    id: `R${picked.length + i + 1}`,
    text,
    priority: "must_have",
  }));
  return [...picked, ...extras];
}

function findEvidence(resume: string, words: string[]): string {
  const sentences = resume.split(/(?<=[.!?])\s+|\n/).map((s) => s.trim()).filter(Boolean);
  let best = "";
  let bestHits = 0;
  for (const s of sentences) {
    const lower = s.toLowerCase();
    const hits = words.filter((w) => lower.includes(w)).length;
    if (hits > bestHits) {
      best = s;
      bestHits = hits;
    }
  }
  return best.split(/\s+/).slice(0, 25).join(" ");
}

export function buildDemoScreening(
  req: Pick<ScreenRequest, "jobDescription" | "extraRequirements">,
  candidates: Array<{ id: string; text: string }>,
): AIScreening {
  const requirements = extractRequirements(req);

  return {
    requirements,
    candidates: candidates.map((c) => {
      const lower = c.text.toLowerCase();
      const requirementMatches = requirements.map((r) => {
        const words = keywords(r.text);
        const hits = words.filter((w) => lower.includes(w)).length;
        const ratio = words.length ? hits / words.length : 0;
        const status = ratio >= 0.5 ? "met" : ratio >= 0.25 ? "partial" : "not_met";
        return {
          requirementId: r.id,
          status,
          evidence: status === "not_met" ? "" : findEvidence(c.text, words),
          reasoning: `Demo mode keyword overlap: ${hits}/${words.length} key terms found.`,
        } as const;
      });
      const met = requirementMatches.filter((m) => m.status === "met").map((m) => m.requirementId);
      const missing = requirementMatches.filter((m) => m.status === "not_met").map((m) => m.requirementId);
      return {
        candidateId: c.id,
        summary: `Demo mode (keyword matching, not AI). Matches ${met.length} of ${requirements.length} requirements.`,
        requirementMatches,
        strengths: met.slice(0, 3).map((id) => `Shows evidence for ${id}`),
        gaps: missing.slice(0, 3).map((id) => `No clear evidence for ${id}`),
        interviewQuestions: [
          "Walk me through your most relevant achievement for this role.",
          "Which part of this job description would be newest to you, and how would you ramp up?",
          "Tell me about a time you had to learn a tool or process quickly.",
        ],
      };
    }),
  };
}

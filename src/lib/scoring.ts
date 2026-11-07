import type {
  AIScreening,
  CandidateAssessment,
  RankedCandidate,
  Recommendation,
  Requirement,
} from "./schema";

/**
 * Scores are computed by the app, not by the AI, so they are
 * transparent and repeatable:
 *   met = 1 point, partial = 0.5, not_met = 0
 *   must-haves weigh 2x, nice-to-haves weigh 1x
 *   score = weighted points / max weighted points * 100
 */
export const WEIGHTS = { must_have: 2, nice_to_have: 1 } as const;
export const STATUS_POINTS = { met: 1, partial: 0.5, not_met: 0 } as const;

export function scoreCandidate(
  assessment: CandidateAssessment,
  requirements: Requirement[],
): { score: number; mustHavesMet: number; mustHavesTotal: number } {
  if (requirements.length === 0) return { score: 0, mustHavesMet: 0, mustHavesTotal: 0 };

  const matchById = new Map(assessment.requirementMatches.map((m) => [m.requirementId, m]));
  let earned = 0;
  let possible = 0;
  let mustHavesMet = 0;
  let mustHavesTotal = 0;

  for (const req of requirements) {
    const weight = WEIGHTS[req.priority];
    const status = matchById.get(req.id)?.status ?? "not_met"; // missing = not met
    possible += weight;
    earned += weight * STATUS_POINTS[status];
    if (req.priority === "must_have") {
      mustHavesTotal += 1;
      if (status === "met") mustHavesMet += 1;
    }
  }

  return { score: Math.round((earned / possible) * 100), mustHavesMet, mustHavesTotal };
}

export function recommend(score: number, mustHavesMet: number, mustHavesTotal: number): Recommendation {
  const missingMustHaves = mustHavesTotal - mustHavesMet;
  if (score >= 80 && missingMustHaves === 0) return "strong_yes";
  if (score >= 65 && missingMustHaves <= 1) return "yes";
  if (score >= 45) return "maybe";
  return "no";
}

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  strong_yes: "Strong yes – interview",
  yes: "Yes – interview",
  maybe: "Maybe – phone screen",
  no: "Not a fit for this role",
};

/** Joins AI output with the original labels, computes scores and sorts best-first. */
export function rankCandidates(
  ai: AIScreening,
  inputs: Array<{ id: string; label: string; redactions: number }>,
): RankedCandidate[] {
  const byId = new Map(ai.candidates.map((c) => [c.candidateId, c]));

  const scored = inputs.map((input) => {
    const assessment: CandidateAssessment =
      byId.get(input.id) ?? {
        candidateId: input.id,
        summary: "The AI did not return an assessment for this candidate. Please re-run the screening.",
        requirementMatches: [],
        strengths: [],
        gaps: [],
        interviewQuestions: [],
      };
    const { score, mustHavesMet, mustHavesTotal } = scoreCandidate(assessment, ai.requirements);
    return {
      ...assessment,
      label: input.label,
      redactions: input.redactions,
      score,
      mustHavesMet,
      mustHavesTotal,
      recommendation: recommend(score, mustHavesMet, mustHavesTotal),
      rank: 0,
    };
  });

  scored.sort((a, b) => b.score - a.score || b.mustHavesMet - a.mustHavesMet || a.label.localeCompare(b.label));
  return scored.map((c, i) => ({ ...c, rank: i + 1 }));
}

/** CSV export for the recruiter's spreadsheet / ATS. */
export function toCSV(requirements: Requirement[], candidates: RankedCandidate[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["Rank", "Candidate", "Score", "Must-haves met", "Recommendation", ...requirements.map((r) => `${r.id}: ${r.text}`)];
  const rows = candidates.map((c) => {
    const statusById = new Map(c.requirementMatches.map((m) => [m.requirementId, m.status]));
    return [
      c.rank,
      c.label,
      c.score,
      `${c.mustHavesMet}/${c.mustHavesTotal}`,
      RECOMMENDATION_LABEL[c.recommendation],
      ...requirements.map((r) => statusById.get(r.id) ?? "not_met"),
    ];
  });
  return [header, ...rows].map((row) => row.map(esc).join(",")).join("\n");
}

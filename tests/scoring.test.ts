import { describe, expect, it } from "vitest";
import type { AIScreening, CandidateAssessment, Requirement } from "@/lib/schema";
import { rankCandidates, recommend, scoreCandidate, toCSV } from "@/lib/scoring";

const requirements: Requirement[] = [
  { id: "R1", text: "2+ years as Team Lead", priority: "must_have" },
  { id: "R2", text: "Zendesk experience", priority: "must_have" },
  { id: "R3", text: "Healthcare account", priority: "nice_to_have" },
];

const assessment = (id: string, statuses: Array<"met" | "partial" | "not_met">): CandidateAssessment => ({
  candidateId: id,
  summary: "s",
  requirementMatches: statuses.map((status, i) => ({ requirementId: `R${i + 1}`, status, evidence: status === "not_met" ? "" : "quote", reasoning: "r" })),
  strengths: [],
  gaps: [],
  interviewQuestions: ["q1", "q2", "q3"],
});

describe("scoreCandidate", () => {
  it("gives 100 when every requirement is met", () => {
    expect(scoreCandidate(assessment("C1", ["met", "met", "met"]), requirements)).toEqual({ score: 100, mustHavesMet: 2, mustHavesTotal: 2 });
  });

  it("weights must-haves 2x and partial as half", () => {
    // earned = 2*1 + 2*0.5 + 1*0 = 3 ; possible = 5 -> 60
    expect(scoreCandidate(assessment("C1", ["met", "partial", "not_met"]), requirements).score).toBe(60);
  });

  it("treats a missing requirement match as not met", () => {
    const a = assessment("C1", ["met"]); // only R1 returned
    // earned = 2 ; possible = 5 -> 40
    expect(scoreCandidate(a, requirements)).toEqual({ score: 40, mustHavesMet: 1, mustHavesTotal: 2 });
  });

  it("returns 0 when there are no requirements", () => {
    expect(scoreCandidate(assessment("C1", []), []).score).toBe(0);
  });
});

describe("recommend", () => {
  it("requires all must-haves for a strong yes", () => {
    expect(recommend(85, 2, 2)).toBe("strong_yes");
    expect(recommend(85, 1, 2)).toBe("yes");
    expect(recommend(50, 0, 2)).toBe("maybe");
    expect(recommend(20, 0, 2)).toBe("no");
  });
});

describe("rankCandidates", () => {
  const ai: AIScreening = {
    requirements,
    candidates: [assessment("C1", ["not_met", "met", "not_met"]), assessment("C2", ["met", "met", "met"])],
  };

  it("sorts best score first and keeps original labels", () => {
    const ranked = rankCandidates(ai, [
      { id: "C1", label: "Applicant A", redactions: 3 },
      { id: "C2", label: "Applicant B", redactions: 1 },
    ]);
    expect(ranked.map((c) => [c.rank, c.label, c.score])).toEqual([
      [1, "Applicant B", 100],
      [2, "Applicant A", 40],
    ]);
    expect(ranked[0].recommendation).toBe("strong_yes");
  });

  it("still returns a row when the AI skipped a candidate", () => {
    const ranked = rankCandidates(ai, [
      { id: "C1", label: "A", redactions: 0 },
      { id: "C2", label: "B", redactions: 0 },
      { id: "C3", label: "C", redactions: 0 },
    ]);
    const missing = ranked.find((c) => c.label === "C")!;
    expect(missing.score).toBe(0);
    expect(missing.summary).toMatch(/did not return/);
  });

  it("exports a CSV with one row per candidate", () => {
    const ranked = rankCandidates(ai, [
      { id: "C1", label: "Applicant A", redactions: 0 },
      { id: "C2", label: 'Applicant "B"', redactions: 0 },
    ]);
    const lines = toCSV(requirements, ranked).split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"Applicant ""B"""');
  });
});

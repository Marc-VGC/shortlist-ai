import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Limits (kept in one place so the UI, API and tests agree)          */
/* ------------------------------------------------------------------ */
export const LIMITS = {
  jobTitleMax: 120,
  jobDescriptionMin: 80,
  jobDescriptionMax: 12_000,
  resumeMin: 80,
  resumeMax: 15_000,
  labelMax: 40,
  candidatesMin: 1,
  candidatesMax: 8,
  extraRequirementsMax: 8,
  extraRequirementMaxLen: 160,
} as const;

/* ------------------------------------------------------------------ */
/*  Request: what the browser sends to POST /api/screen                */
/* ------------------------------------------------------------------ */
export const CandidateInputSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Each candidate needs a label")
    .max(LIMITS.labelMax, `Candidate label must be at most ${LIMITS.labelMax} characters`),
  resumeText: z
    .string()
    .trim()
    .min(LIMITS.resumeMin, `Each resume must be at least ${LIMITS.resumeMin} characters`)
    .max(LIMITS.resumeMax, `Each resume must be at most ${LIMITS.resumeMax.toLocaleString()} characters`),
});

export const ScreenRequestSchema = z.object({
  jobTitle: z
    .string()
    .trim()
    .min(2, "Job title is required")
    .max(LIMITS.jobTitleMax, `Job title must be at most ${LIMITS.jobTitleMax} characters`),
  jobDescription: z
    .string()
    .trim()
    .min(LIMITS.jobDescriptionMin, `Job description must be at least ${LIMITS.jobDescriptionMin} characters`)
    .max(LIMITS.jobDescriptionMax, `Job description must be at most ${LIMITS.jobDescriptionMax.toLocaleString()} characters`),
  extraRequirements: z
    .array(z.string().trim().min(2).max(LIMITS.extraRequirementMaxLen))
    .max(LIMITS.extraRequirementsMax)
    .default([]),
  candidates: z
    .array(CandidateInputSchema)
    .min(LIMITS.candidatesMin, "Add at least one candidate")
    .max(LIMITS.candidatesMax, `You can screen at most ${LIMITS.candidatesMax} candidates at a time`),
});

export type ScreenRequest = z.infer<typeof ScreenRequestSchema>;
export type CandidateInput = z.infer<typeof CandidateInputSchema>;

/* ------------------------------------------------------------------ */
/*  AI output: the exact JSON shape Claude must return                 */
/*  (kept simple - no numeric ranges - so it works with structured     */
/*  outputs; the app computes the scores itself in scoring.ts)         */
/* ------------------------------------------------------------------ */
export const RequirementSchema = z.object({
  id: z.string().describe("Short id like R1, R2, ..."),
  text: z.string().describe("One concrete, checkable requirement taken from the job description"),
  priority: z.enum(["must_have", "nice_to_have"]),
});

export const RequirementMatchSchema = z.object({
  requirementId: z.string(),
  status: z.enum(["met", "partial", "not_met"]),
  evidence: z
    .string()
    .describe("A short verbatim quote from the resume that proves the status. Empty string if not_met."),
  reasoning: z.string().describe("One sentence explaining the status"),
});

export const CandidateAssessmentSchema = z.object({
  candidateId: z.string().describe("Must equal the candidate id given in the input, e.g. C1"),
  summary: z.string().describe("Two-sentence, job-related summary of fit"),
  requirementMatches: z.array(RequirementMatchSchema),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  interviewQuestions: z
    .array(z.string())
    .describe("Exactly 3 questions that probe this candidate's gaps or unverified claims"),
});

export const AIScreeningSchema = z.object({
  requirements: z.array(RequirementSchema),
  candidates: z.array(CandidateAssessmentSchema),
});

export type Requirement = z.infer<typeof RequirementSchema>;
export type RequirementMatch = z.infer<typeof RequirementMatchSchema>;
export type CandidateAssessment = z.infer<typeof CandidateAssessmentSchema>;
export type AIScreening = z.infer<typeof AIScreeningSchema>;

/* ------------------------------------------------------------------ */
/*  API response: what the browser receives                            */
/* ------------------------------------------------------------------ */
export type Recommendation = "strong_yes" | "yes" | "maybe" | "no";

export interface RankedCandidate extends CandidateAssessment {
  label: string;
  rank: number;
  score: number; // 0-100, computed by the app (not the AI)
  mustHavesMet: number;
  mustHavesTotal: number;
  recommendation: Recommendation;
  redactions: number;
}

export interface ScreenResponse {
  jobTitle: string;
  requirements: Requirement[];
  candidates: RankedCandidate[];
  mode: "live" | "demo";
  model: string;
  durationMs: number;
}

/** Turns a zod error into a short, human-readable list of messages. */
export function formatZodError(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

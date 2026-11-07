import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/screen/route";
import { resetRateLimit } from "@/lib/rateLimit";
import { SAMPLE_CANDIDATES, SAMPLE_JOB } from "@/lib/sampleData";
import { ScreenRequestSchema } from "@/lib/schema";
import { buildUserPrompt } from "@/lib/prompt";

const validBody = {
  jobTitle: SAMPLE_JOB.jobTitle,
  jobDescription: SAMPLE_JOB.jobDescription,
  extraRequirements: [],
  candidates: SAMPLE_CANDIDATES,
};

const post = (body: unknown, ip = "1.2.3.4") =>
  POST(
    new Request("http://localhost/api/screen", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

beforeEach(() => {
  resetRateLimit();
  vi.stubEnv("ANTHROPIC_API_KEY", ""); // force demo mode: tests never call the real AI
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("input validation (ScreenRequestSchema)", () => {
  it("accepts the sample data", () => {
    expect(ScreenRequestSchema.safeParse(validBody).success).toBe(true);
  });

  it("rejects an empty candidate list and too-short job descriptions", () => {
    const r = ScreenRequestSchema.safeParse({ ...validBody, jobDescription: "too short", candidates: [] });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toEqual(expect.arrayContaining(["jobDescription", "candidates"]));
    }
  });

  it("rejects more than 8 candidates", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ label: `C${i}`, resumeText: SAMPLE_CANDIDATES[0].resumeText }));
    expect(ScreenRequestSchema.safeParse({ ...validBody, candidates: many }).success).toBe(false);
  });
});

describe("POST /api/screen", () => {
  it("returns 400 with readable details for invalid input", async () => {
    const res = await post({ jobTitle: "", jobDescription: "", candidates: [] });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.details.length).toBeGreaterThan(0);
  });

  it("returns 400 for a non-JSON body", async () => {
    const res = await post("not json");
    expect(res.status).toBe(400);
  });

  it("returns a ranked shortlist in demo mode", async () => {
    const res = await post(validBody);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.mode).toBe("demo");
    expect(json.candidates).toHaveLength(4);
    expect(json.candidates[0].rank).toBe(1);
    const scores = json.candidates.map((c: { score: number }) => c.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    // the fresh graduate (Applicant D) should not rank first
    expect(json.candidates[0].label).not.toBe("Applicant D");
  });

  it("rate-limits repeated requests from the same IP", async () => {
    vi.stubEnv("RATE_LIMIT_PER_HOUR", "2");
    expect((await post(validBody, "9.9.9.9")).status).toBe(200);
    expect((await post(validBody, "9.9.9.9")).status).toBe(200);
    expect((await post(validBody, "9.9.9.9")).status).toBe(429);
  });
});

describe("prompt building", () => {
  it("sends only redacted ids, never candidate labels, and wraps resumes as data", () => {
    const prompt = buildUserPrompt(validBody, [{ id: "C1", text: "[CANDIDATE NAME]\nTeam lead" }]);
    expect(prompt).toContain('<resume candidate_id="C1">');
    expect(prompt).not.toContain("Applicant A");
    expect(prompt).toContain("<job_description>");
  });
});

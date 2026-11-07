import { describe, expect, it } from "vitest";
import { redactPII } from "@/lib/redact";
import { SAMPLE_CANDIDATES } from "@/lib/sampleData";

describe("redactPII", () => {
  it("removes email addresses and PH mobile numbers", () => {
    const r = redactPII("Contact: juan@example.com or 0917 123 4567 or +63 998 765 4321");
    expect(r.text).not.toContain("juan@example.com");
    expect(r.text).not.toContain("0917");
    expect(r.text).not.toContain("998 765");
    expect(r.text).toContain("[EMAIL]");
    expect(r.text).toContain("[PHONE]");
    expect(r.categories).toEqual(expect.arrayContaining(["email", "phone"]));
  });

  it("removes the candidate name on the first line", () => {
    const r = redactPII("Maria Santos Dela Cruz\nTeam Leader with 5 years experience");
    expect(r.text.startsWith("[CANDIDATE NAME]")).toBe(true);
    expect(r.text).not.toContain("Maria");
    expect(r.text).toContain("Team Leader with 5 years experience");
  });

  it("removes protected personal fields common on PH resumes", () => {
    const resume = ["Summary line here that is long enough", "Age: 29", "Civil Status: Married", "Religion: Roman Catholic", "Sex: Female", "Date of Birth: March 3, 1985"].join("\n");
    const r = redactPII(resume);
    for (const leaked of ["29", "Married", "Catholic", "Female", "1985"]) {
      expect(r.text).not.toContain(leaked);
    }
    expect(r.text.match(/\[PERSONAL DETAIL REMOVED\]/g)).toHaveLength(5);
  });

  it("removes inline age mentions and profile links", () => {
    const r = redactPII("I am a 27 years old agent. See linkedin.com/in/someone or https://example.com/cv");
    expect(r.text).toContain("[AGE]");
    expect(r.text).not.toContain("linkedin.com/in/someone");
    expect(r.text).not.toContain("https://example.com/cv");
  });

  it("keeps job-related content intact", () => {
    const r = redactPII(SAMPLE_CANDIDATES[0].resumeText);
    expect(r.text).toContain("Lead a team of 14 inbound voice agents");
    expect(r.text).toContain("COPC Certified Coach");
    expect(r.count).toBeGreaterThanOrEqual(6);
  });

  it("does not treat a normal sentence on the first line as a name", () => {
    const r = redactPII("Experienced customer service professional with 6 years.\nMore text");
    expect(r.text).not.toContain("[CANDIDATE NAME]");
  });
});

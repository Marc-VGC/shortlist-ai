import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { formatZodError, ScreenRequestSchema } from "@/lib/schema";
import { screenCandidates, ScreeningError } from "@/lib/screen";
import { logUsage } from "@/lib/usageLog";

export const runtime = "nodejs";
export const maxDuration = 60; // seconds (Vercel function limit on the free plan)

export async function POST(request: Request) {
  const started = Date.now();

  // 1) Rate limit per IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = checkRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many screenings. Try again in ${Math.ceil(limit.retryAfterSec / 60)} minutes.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  // 2) Parse + validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = ScreenRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please fix the highlighted inputs.", details: formatZodError(parsed.error) }, { status: 400 });
  }

  // 3) Run the AI screening
  try {
    const result = await screenCandidates(parsed.data);
    await logUsage({
      job_title: result.jobTitle,
      candidate_count: result.candidates.length,
      top_score: result.candidates[0]?.score ?? 0,
      mode: result.mode,
      model: result.model,
      duration_ms: result.durationMs,
      success: true,
    });
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ScreeningError ? error.status : 500;
    const message = error instanceof ScreeningError ? error.message : "Something went wrong. Please try again.";
    if (!(error instanceof ScreeningError)) console.error("[api/screen] unexpected error", error);
    await logUsage({
      job_title: parsed.data.jobTitle,
      candidate_count: parsed.data.candidates.length,
      top_score: 0,
      mode: "live",
      model: process.env.ANTHROPIC_MODEL || "default",
      duration_ms: Date.now() - started,
      success: false,
      error_status: status,
    });
    return NextResponse.json({ error: message }, { status });
  }
}

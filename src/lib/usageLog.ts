import { createClient } from "@supabase/supabase-js";

/**
 * Optional usage analytics in Supabase. Only anonymous, aggregate numbers
 * are stored - never resume text or personal data.
 * If SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set this is a no-op.
 */
export interface UsageEvent {
  job_title: string;
  candidate_count: number;
  top_score: number;
  mode: "live" | "demo";
  model: string;
  duration_ms: number;
  success: boolean;
  error_status?: number | null;
}

export async function logUsage(event: UsageEvent): Promise<void> {
  // Always emit a structured log line - visible in Vercel's Logs tab (basic monitoring).
  console.log(JSON.stringify({ type: "screening", ...event }));

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await supabase.from("screenings").insert({
      ...event,
      job_title: event.job_title.slice(0, 120),
    });
    if (error) console.error("[usageLog] supabase insert failed:", error.message);
  } catch (err) {
    console.error("[usageLog] supabase unavailable:", err);
  }
}

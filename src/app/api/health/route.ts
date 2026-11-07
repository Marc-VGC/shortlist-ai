import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/screen";

export const dynamic = "force-dynamic";

/** Uptime check endpoint - safe to expose (no secrets, only booleans). */
export function GET() {
  return NextResponse.json({
    status: "ok",
    aiConfigured: !isDemoMode(),
    analyticsConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    time: new Date().toISOString(),
  });
}

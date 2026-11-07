import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt";
import { redactPII } from "./redact";
import { AIScreeningSchema, type AIScreening, type ScreenRequest, type ScreenResponse } from "./schema";
import { rankCandidates } from "./scoring";
import { buildDemoScreening } from "./demo";

export const DEFAULT_MODEL = "claude-opus-5-5";

/** Error with a message that is safe to show to the user. */
export class ScreeningError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
  ) {
    super(message);
    this.name = "ScreeningError";
  }
}

export function isDemoMode(): boolean {
  return !process.env.ANTHROPIC_API_KEY || process.env.DEMO_MODE === "true";
}

async function callClaude(req: ScreenRequest, redacted: Array<{ id: string; text: string }>, model: string): Promise<AIScreening> {
  // The API key is read from the ANTHROPIC_API_KEY environment variable - never hardcoded.
  const client = new Anthropic({ timeout: 120_000, maxRetries: 2 });

  try {
    const response = await client.beta.messages.parse({
      model,
      max_tokens: 16_000,
      // If a safety classifier ever declines, the API retries on a suitable fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(req, redacted) }],
      output_config: {
        effort: "medium",
        format: betaZodOutputFormat(AIScreeningSchema),
      },
    });

    if (response.stop_reason === "refusal") {
      throw new ScreeningError("The AI declined to assess this input. Please check the text you pasted.", 422);
    }
    if (response.stop_reason === "max_tokens") {
      throw new ScreeningError("The response was too long. Try screening fewer candidates at once.", 422);
    }
    if (!response.parsed_output) {
      throw new ScreeningError("The AI returned an unexpected format. Please try again.", 502);
    }
    return response.parsed_output;
  } catch (error) {
    if (error instanceof ScreeningError) throw error;
    if (error instanceof Anthropic.AuthenticationError) {
      throw new ScreeningError("The server's AI key is invalid. (Admin: check ANTHROPIC_API_KEY.)", 500);
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new ScreeningError("The AI service is busy. Please wait a minute and try again.", 429);
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error("[screen] bad request", error.message);
      throw new ScreeningError("The AI could not process this request. Try shorter inputs.", 400);
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new ScreeningError("Could not reach the AI service. Please try again.", 503);
    }
    if (error instanceof Anthropic.APIError) {
      console.error("[screen] api error", error.status, error.message);
      throw new ScreeningError("The AI service had a problem. Please try again.", 502);
    }
    throw error;
  }
}

/**
 * Core feature: redact -> ask Claude for evidence per requirement -> score & rank in code.
 */
export async function screenCandidates(req: ScreenRequest): Promise<ScreenResponse> {
  const started = Date.now();

  const prepared = req.candidates.map((c, i) => {
    const r = redactPII(c.resumeText);
    return { id: `C${i + 1}`, label: c.label, text: r.text, redactions: r.count };
  });

  const demo = isDemoMode();
  const model = demo ? "demo (no API key)" : process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const ai = demo ? buildDemoScreening(req, prepared) : await callClaude(req, prepared, model);

  return {
    jobTitle: req.jobTitle,
    requirements: ai.requirements,
    candidates: rankCandidates(ai, prepared),
    mode: demo ? "demo" : "live",
    model,
    durationMs: Date.now() - started,
  };
}

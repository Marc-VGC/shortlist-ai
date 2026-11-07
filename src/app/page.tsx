"use client";

import { useEffect, useRef, useState } from "react";
import Results from "@/components/Results";
import ScreenForm, { newCandidate, type FormState } from "@/components/ScreenForm";
import { SAMPLE_CANDIDATES, SAMPLE_JOB } from "@/lib/sampleData";
import { formatZodError, ScreenRequestSchema, type ScreenResponse } from "@/lib/schema";

const emptyForm = (): FormState => ({
  jobTitle: "",
  jobDescription: "",
  extraRequirements: "",
  candidates: [newCandidate(1), newCandidate(2)],
});

export default function Home() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<ScreenResponse | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result) resultsRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [result]);

  const loadSample = () => {
    setForm({
      jobTitle: SAMPLE_JOB.jobTitle,
      jobDescription: SAMPLE_JOB.jobDescription,
      extraRequirements: "",
      candidates: SAMPLE_CANDIDATES.map((c, i) => ({ ...newCandidate(i + 1), ...c })),
    });
    setErrors([]);
    setResult(null);
  };

  const submit = async () => {
    const payload = {
      jobTitle: form.jobTitle,
      jobDescription: form.jobDescription,
      extraRequirements: form.extraRequirements.split("\n").map((s) => s.trim()).filter(Boolean),
      candidates: form.candidates.map(({ label, resumeText }) => ({ label, resumeText })),
    };

    // Validate in the browser first for instant feedback (the server validates again).
    const check = ScreenRequestSchema.safeParse(payload);
    if (!check.success) {
      setErrors(formatZodError(check.error));
      return;
    }

    setErrors([]);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(check.data),
      });
      const data = await res.json().catch(() => ({ error: "The server returned an invalid response." }));
      if (!res.ok) {
        setErrors([data.error ?? "Something went wrong.", ...(data.details ?? [])]);
        return;
      }
      setResult(data as ScreenResponse);
    } catch {
      setErrors(["Network error – please check your connection and try again."]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-100">
            🔒 Personal details are removed before AI analysis
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Shortlist<span className="text-indigo-600">AI</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
            Paste a job description and a few resumes. Get a ranked, evidence-backed shortlist with interview questions in under a minute — fair, explainable, no sign-up.
          </p>
        </header>

        <ScreenForm value={form} onChange={setForm} onSubmit={submit} onLoadSample={loadSample} onReset={() => { setForm(emptyForm()); setResult(null); setErrors([]); }} loading={loading} />

        {errors.length > 0 && (
          <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <ul className="list-disc space-y-1 pl-5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {loading && (
          <div className="mt-8 animate-pulse rounded-2xl border border-indigo-100 bg-white p-6 text-center text-slate-600">
            Removing personal details → extracting requirements → checking each resume for evidence → ranking…
          </div>
        )}

        <div ref={resultsRef} className="mt-10">
          {result && <Results data={result} />}
        </div>

        <footer className="mt-16 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
          ShortlistAI · AI-assisted screening for HR teams · Built with Next.js, Tailwind CSS and Claude · AI output can be wrong – a human makes the final decision.
        </footer>
      </div>
    </main>
  );
}

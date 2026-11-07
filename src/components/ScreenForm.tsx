"use client";

import { useRef } from "react";
import { LIMITS } from "@/lib/schema";

export interface CandidateDraft {
  key: string;
  label: string;
  resumeText: string;
}

export interface FormState {
  jobTitle: string;
  jobDescription: string;
  extraRequirements: string;
  candidates: CandidateDraft[];
}

interface Props {
  value: FormState;
  onChange: (next: FormState) => void;
  onSubmit: () => void;
  onLoadSample: () => void;
  onReset: () => void;
  loading: boolean;
}

let keyCounter = 0;
export const newCandidate = (n: number): CandidateDraft => ({
  key: `cand-${Date.now()}-${keyCounter++}`,
  label: `Applicant ${String.fromCharCode(64 + n)}`,
  resumeText: "",
});

function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className={`text-xs ${over ? "text-red-600 font-semibold" : "text-slate-500"}`}>
      {value.length.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}

export default function ScreenForm({ value, onChange, onSubmit, onLoadSample, onReset, loading }: Props) {
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const set = (patch: Partial<FormState>) => onChange({ ...value, ...patch });

  const updateCandidate = (key: string, patch: Partial<CandidateDraft>) =>
    set({ candidates: value.candidates.map((c) => (c.key === key ? { ...c, ...patch } : c)) });

  const removeCandidate = (key: string) => set({ candidates: value.candidates.filter((c) => c.key !== key) });

  const addCandidate = () => {
    if (value.candidates.length >= LIMITS.candidatesMax) return;
    set({ candidates: [...value.candidates, newCandidate(value.candidates.length + 1)] });
  };

  const loadFile = async (key: string, file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    updateCandidate(key, { resumeText: text.slice(0, LIMITS.resumeMax) });
  };

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {/* Step 1 - Job */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-sm text-white">1</span>
            The job
          </h2>
          <div className="flex gap-2">
            <button type="button" onClick={onLoadSample} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
              Load sample data
            </button>
            <button type="button" onClick={onReset} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
              Clear
            </button>
          </div>
        </div>

        <label className="block text-sm font-medium text-slate-700" htmlFor="jobTitle">
          Job title
        </label>
        <input
          id="jobTitle"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="e.g. Customer Support Team Lead"
          maxLength={LIMITS.jobTitleMax}
          value={value.jobTitle}
          onChange={(e) => set({ jobTitle: e.target.value })}
        />

        <div className="mt-4 flex items-end justify-between">
          <label className="block text-sm font-medium text-slate-700" htmlFor="jobDescription">
            Job description <span className="font-normal text-slate-500">(paste the full posting)</span>
          </label>
          <CharCount value={value.jobDescription} max={LIMITS.jobDescriptionMax} />
        </div>
        <textarea
          id="jobDescription"
          rows={9}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="Responsibilities, requirements, preferred qualifications..."
          value={value.jobDescription}
          onChange={(e) => set({ jobDescription: e.target.value })}
        />

        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="extra">
          Extra must-haves <span className="font-normal text-slate-500">(optional, one per line – e.g. &quot;Can start within 30 days&quot;)</span>
        </label>
        <textarea
          id="extra"
          rows={2}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          value={value.extraRequirements}
          onChange={(e) => set({ extraRequirements: e.target.value })}
        />
      </section>

      {/* Step 2 - Candidates */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-sm text-white">2</span>
            Candidates <span className="text-sm font-normal text-slate-500">({value.candidates.length}/{LIMITS.candidatesMax})</span>
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Paste resume text or upload a .txt file. Names, contact details, age, sex, civil status and religion are{" "}
          <strong>removed automatically</strong> before the AI sees them.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {value.candidates.map((c) => (
            <div key={c.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <input
                  aria-label="Candidate label"
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-900"
                  maxLength={LIMITS.labelMax}
                  value={c.label}
                  onChange={(e) => updateCandidate(c.key, { label: e.target.value })}
                />
                <input
                  type="file"
                  accept=".txt,.md,text/plain"
                  className="hidden"
                  ref={(el) => {
                    fileInputs.current[c.key] = el;
                  }}
                  onChange={(e) => loadFile(c.key, e.target.files?.[0])}
                />
                <button type="button" onClick={() => fileInputs.current[c.key]?.click()} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">
                  Upload .txt
                </button>
                {value.candidates.length > 1 && (
                  <button type="button" onClick={() => removeCandidate(c.key)} aria-label={`Remove ${c.label}`} className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                    Remove
                  </button>
                )}
              </div>
              <textarea
                aria-label={`Resume for ${c.label}`}
                rows={8}
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 font-mono text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Paste the resume text here..."
                value={c.resumeText}
                onChange={(e) => updateCandidate(c.key, { resumeText: e.target.value })}
              />
              <div className="text-right">
                <CharCount value={c.resumeText} max={LIMITS.resumeMax} />
              </div>
            </div>
          ))}
        </div>

        {value.candidates.length < LIMITS.candidatesMax && (
          <button type="button" onClick={addCandidate} className="mt-4 w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-700">
            + Add another candidate
          </button>
        )}
      </section>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 py-4 text-lg font-semibold text-white shadow-md transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? "Screening candidates… (about 20–60 seconds)" : `Screen ${value.candidates.length} candidate${value.candidates.length === 1 ? "" : "s"} with AI`}
      </button>
    </form>
  );
}

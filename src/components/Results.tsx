"use client";

import { useState } from "react";
import type { RankedCandidate, Recommendation, Requirement, ScreenResponse } from "@/lib/schema";
import { RECOMMENDATION_LABEL, toCSV } from "@/lib/scoring";

const BADGE: Record<Recommendation, string> = {
  strong_yes: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  yes: "bg-green-50 text-green-800 ring-green-200",
  maybe: "bg-amber-50 text-amber-800 ring-amber-200",
  no: "bg-slate-100 text-slate-600 ring-slate-200",
};

const STATUS_STYLE = {
  met: { icon: "✓", label: "Met", cls: "bg-emerald-100 text-emerald-800" },
  partial: { icon: "~", label: "Partial", cls: "bg-amber-100 text-amber-800" },
  not_met: { icon: "✗", label: "Not met", cls: "bg-rose-100 text-rose-700" },
} as const;

function scoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-green-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-slate-400";
}

function CandidateCard({ c, requirements, defaultOpen }: { c: RankedCandidate; requirements: Requirement[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);
  const matchById = new Map(c.requirementMatches.map((m) => [m.requirementId, m]));

  const copyQuestions = async () => {
    await navigator.clipboard.writeText(c.interviewQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center gap-4 p-5 text-left" aria-expanded={open}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white">#{c.rank}</span>
        <div className="min-w-[10rem] flex-1">
          <div className="font-semibold text-slate-900">{c.label}</div>
          <div className="text-sm text-slate-500">
            Must-haves met: {c.mustHavesMet}/{c.mustHavesTotal}
            {c.redactions > 0 && <> · {c.redactions} personal detail{c.redactions === 1 ? "" : "s"} hidden from AI</>}
          </div>
        </div>
        <div className="w-40">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Fit score</span>
            <span className="font-bold text-slate-900">{c.score}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100">
            <div className={`h-2 rounded-full ${scoreColor(c.score)}`} style={{ width: `${c.score}%` }} />
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${BADGE[c.recommendation]}`}>{RECOMMENDATION_LABEL[c.recommendation]}</span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-slate-100 p-5">
          <p className="text-slate-700">{c.summary}</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Requirement</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Evidence from resume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requirements.map((r) => {
                  const m = matchById.get(r.id);
                  const st = STATUS_STYLE[m?.status ?? "not_met"];
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="py-2 pr-3 text-slate-800">
                        <span className="font-mono text-xs text-slate-400">{r.id}</span> {r.text}
                        {r.priority === "must_have" && <span className="ml-1 rounded bg-indigo-50 px-1 text-[10px] font-semibold uppercase text-indigo-700">must</span>}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${st.cls}`}>
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td className="py-2 text-slate-600">
                        {m?.evidence ? <q className="italic">{m.evidence}</q> : <span className="text-slate-400">—</span>}
                        {m?.reasoning && <div className="mt-0.5 text-xs text-slate-500">{m.reasoning}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="mb-1 text-sm font-semibold text-emerald-700">Strengths</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{c.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div>
              <h4 className="mb-1 text-sm font-semibold text-rose-700">Gaps</h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{c.gaps.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-indigo-700">Interview questions</h4>
                <button type="button" onClick={copyQuestions} className="text-xs text-indigo-600 hover:underline">
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">{c.interviewQuestions.map((q, i) => <li key={i}>{q}</li>)}</ol>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

export default function Results({ data }: { data: ScreenResponse }) {
  const downloadCSV = () => {
    const blob = new Blob([toCSV(data.requirements, data.candidates)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shortlist-${data.jobTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="results" className="space-y-6">
      {data.mode === "demo" && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Demo mode:</strong> no AI key is configured on this server, so results use simple keyword matching, not AI.
          Add <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code> to enable the real AI screening.
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Shortlist: {data.jobTitle}</h2>
          <p className="text-sm text-slate-500">
            {data.candidates.length} candidates · {data.requirements.length} requirements · {(data.durationMs / 1000).toFixed(1)}s · model: {data.model}
          </p>
        </div>
        <button type="button" onClick={downloadCSV} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Download CSV
        </button>
      </div>

      {/* Comparison matrix */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Side-by-side comparison</h3>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="py-2 pr-3 text-left font-medium text-slate-500">Requirement</th>
              {data.candidates.map((c) => (
                <th key={c.candidateId} className="px-2 py-2 text-center font-semibold text-slate-800">
                  #{c.rank} {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.requirements.map((r) => (
              <tr key={r.id}>
                <td className="py-2 pr-3 text-slate-700">
                  <span className="font-mono text-xs text-slate-400">{r.id}</span> {r.text}
                  {r.priority === "must_have" && <span className="ml-1 rounded bg-indigo-50 px-1 text-[10px] font-semibold uppercase text-indigo-700">must</span>}
                </td>
                {data.candidates.map((c) => {
                  const st = STATUS_STYLE[c.requirementMatches.find((m) => m.requirementId === r.id)?.status ?? "not_met"];
                  return (
                    <td key={c.candidateId} className="px-2 py-2 text-center">
                      <span title={st.label} className={`inline-flex h-7 w-7 items-center justify-center rounded-md font-bold ${st.cls}`}>
                        {st.icon}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2 pr-3 text-slate-900">Fit score</td>
              {data.candidates.map((c) => (
                <td key={c.candidateId} className="px-2 py-2 text-center text-slate-900">{c.score}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="space-y-4">
        {data.candidates.map((c, i) => (
          <CandidateCard key={c.candidateId} c={c} requirements={data.requirements} defaultOpen={i === 0} />
        ))}
      </div>

      <p className="text-center text-xs text-slate-500">
        ShortlistAI suggests; people decide. Always review the evidence before rejecting anyone. Scores = met (1) / partial (0.5) per requirement, must-haves weighted 2×.
      </p>
    </section>
  );
}

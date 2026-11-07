/**
 * PII redaction - runs BEFORE any resume text is sent to the AI.
 *
 * Why: the AI should judge job-related evidence only. Names, contact
 * details, age, sex, civil status, religion, photos etc. are common on
 * Philippine resumes ("personal data sheets") and are a known source of
 * hiring bias. Removing them also limits personal data shared with a
 * third-party processor (Data Privacy Act of 2012, RA 10173).
 */

export interface RedactionResult {
  text: string;
  count: number;
  categories: string[];
}

const PERSONAL_FIELD_LABELS = [
  "date of birth",
  "birth ?date",
  "birthday",
  "dob",
  "place of birth",
  "birth ?place",
  "age",
  "sex",
  "gender",
  "civil status",
  "marital status",
  "religion",
  "nationality",
  "citizenship",
  "height",
  "weight",
  "father'?s name",
  "mother'?s name",
  "spouse",
  "sss(?: no\\.?| number)?",
  "tin(?: no\\.?| number)?",
  "pag-?ibig(?: no\\.?| number)?",
  "philhealth(?: no\\.?| number)?",
  "address",
  "home address",
  "permanent address",
  "present address",
];

const RULES: Array<{ category: string; pattern: RegExp; replacement: string }> = [
  {
    category: "email",
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    replacement: "[EMAIL]",
  },
  {
    category: "url",
    pattern: /\b(?:https?:\/\/|www\.)\S+|\b(?:linkedin|facebook|github)\.com\/\S+/gi,
    replacement: "[LINK]",
  },
  {
    // PH mobile (09xx / +63 9xx) and landlines, plus generic international numbers
    category: "phone",
    pattern: /(?:\+?63[\s-]?|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}\b|\(?\+?\d{1,3}\)?[\s-]?\(?\d{2,4}\)?[\s-]\d{3,4}[\s-]\d{3,4}\b/g,
    replacement: "[PHONE]",
  },
  {
    // "Age: 27", "Civil Status: Single", "Religion - Catholic" ... (whole value up to end of line)
    category: "personal_detail",
    pattern: new RegExp(
      `^([ \\t]*[-•*]?[ \\t]*)(${PERSONAL_FIELD_LABELS.join("|")})[ \\t]*[:\\-–][^\\n]*$`,
      "gim",
    ),
    replacement: "$1[PERSONAL DETAIL REMOVED]",
  },
  {
    // Inline mentions such as "27 years old"
    category: "age",
    pattern: /\b\d{2}\s*(?:years?|yrs?)\s*old\b/gi,
    replacement: "[AGE]",
  },
];

/** A first line that is just 2-4 capitalised words is almost always the candidate's name. */
const NAME_LINE = /^\s*(?:[A-Z][a-zA-Z'.-]*\s+){1,3}[A-Z][a-zA-Z'.-]*\s*$/;

export function redactPII(input: string): RedactionResult {
  let text = input;
  let count = 0;
  const categories = new Set<string>();

  // 1) Name on the first non-empty line
  const lines = text.split("\n");
  const firstIdx = lines.findIndex((l) => l.trim().length > 0);
  if (firstIdx >= 0 && NAME_LINE.test(lines[firstIdx]) && lines[firstIdx].trim().length <= 50) {
    lines[firstIdx] = "[CANDIDATE NAME]";
    text = lines.join("\n");
    count += 1;
    categories.add("name");
  }

  // 2) Pattern rules
  for (const rule of RULES) {
    text = text.replace(rule.pattern, (...args) => {
      count += 1;
      categories.add(rule.category);
      // support "$1" style replacement for the personal-detail rule
      return rule.replacement.replace("$1", typeof args[1] === "string" ? args[1] : "");
    });
  }

  return { text, count, categories: [...categories] };
}

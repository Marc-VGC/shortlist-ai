# GitHub issue to create (required: "one GitHub issue for a v2 improvement")

**Title:** v2: Upload PDF and DOCX resumes

**Labels:** enhancement, v2

**Body:**

### Problem
Most applicants send resumes as PDF or Word files. Today, recruiters must copy and paste the text into ShortlistAI, which is slow and loses formatting. User testing showed this is the most requested improvement.

### Proposal
- Accept `.pdf` and `.docx` uploads (drag and drop, multiple files at once).
- Extract the text **in the browser** (pdf.js / mammoth), so the file itself never leaves the user's device. Then run the existing `redactPII()` before the AI call.
- Show the extracted text for review before screening.
- Detect and remove profile photos.

### Acceptance criteria
- [ ] Uploading a text-based PDF fills the resume box with its text in under 2 s
- [ ] Uploading a .docx does the same
- [ ] A scanned or image-only PDF shows "We couldn't read text from this file – please paste it instead"
- [ ] Files over 5 MB are rejected with a clear message
- [ ] Unit tests cover extraction of a sample PDF and DOCX

### Out of scope
OCR for scanned resumes (separate issue).

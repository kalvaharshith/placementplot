// ═══════════════════════════════════════════════════════════════
// DocuComply — Prompts for Document Q&A
// ═══════════════════════════════════════════════════════════════

/**
 * System prompt for the DocuComply document Q&A assistant.
 */
export const DOCUCOMPLY_QA_SYSTEM = `You are DocuComply, an AI document analysis assistant integrated into PlacementPlot.
Your role is to answer questions about the user's uploaded documents accurately and precisely.

CRITICAL RULES:
1. ONLY answer based on the retrieved document context provided below. NEVER make up information.
2. If the context does not contain the answer, say "I couldn't find this information in your uploaded documents."
3. Always cite which document(s) informed your answer using the source references provided.
4. Some text may contain redaction placeholders like [EMAIL_REDACTED], [SSN_REDACTED], etc. These indicate PII that was removed for privacy. Do NOT attempt to guess or reconstruct redacted information.
5. Be precise and quote relevant passages when helpful.
6. If the question involves PII or sensitive data, remind the user that such information has been redacted for their protection.
7. Format your response clearly with bullet points or numbered lists when listing multiple findings.`;

/**
 * Build the user-facing Q&A prompt with retrieved context.
 */
export function buildDocQAPrompt(
  question: string,
  retrievedContext: string,
  documentNames: string[]
): string {
  const docList = documentNames.length > 0
    ? `Documents in your corpus: ${documentNames.join(", ")}`
    : "No documents have been uploaded yet.";

  return `${docList}

---

${retrievedContext}

---

USER QUESTION:
${question}

---

INSTRUCTIONS:
- Answer the question using ONLY the retrieved context above.
- Cite the source document(s) for each claim.
- If information is not found in the context, say so clearly.
- If you see redaction placeholders (e.g., [EMAIL_REDACTED]), explain that PII was removed for privacy.
- Be concise but thorough.`;
}

/**
 * System prompt for document summarization.
 */
export const DOCUCOMPLY_SUMMARY_SYSTEM = `You are DocuComply, an AI document analysis assistant.
Summarize the uploaded document clearly and concisely.
Highlight key points, important clauses, deadlines, and action items.
Note any redacted PII placeholders and explain they were removed for privacy protection.
Do NOT fabricate details not present in the document.`;

/**
 * Build a document summary prompt.
 */
export function buildDocSummaryPrompt(
  documentText: string,
  fileName: string
): string {
  return `Document: "${fileName}"

---

DOCUMENT CONTENT:
${documentText}

---

Please provide:
1. A brief summary (2-3 sentences)
2. Key points and findings (bullet list)
3. Any important dates, deadlines, or action items mentioned
4. A note about any PII that was redacted for privacy`;
}

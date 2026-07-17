// ═══════════════════════════════════════════════════════════════
// PII Redaction Engine — DocuComply / PlacementPlot
// Philter-inspired, pure regex-based. Zero external dependencies.
// ═══════════════════════════════════════════════════════════════

// ─── Types ─────────────────────────────────────────────────────

export type PIIType =
  | "ssn"
  | "aadhaar"
  | "pan"
  | "email"
  | "phone"
  | "credit_card"
  | "date_of_birth"
  | "bank_account"
  | "passport"
  | "ip_address"
  | "drivers_license";

export interface RedactionEntry {
  type: PIIType;
  original: string;
  replacement: string;
  startIndex: number;
  endIndex: number;
}

export interface PIIDetection {
  type: PIIType;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: "high" | "medium" | "low";
}

export interface RedactionResult {
  redactedText: string;
  redactions: RedactionEntry[];
  piiTypesFound: PIIType[];
  totalRedactions: number;
  originalLength: number;
  redactedLength: number;
}

export interface RedactionOptions {
  /** Which PII types to redact. Defaults to all. */
  types?: PIIType[];
  /** If true, only detect PII without redacting. Default: false */
  detectOnly?: boolean;
  /** Custom replacement format. Default: `[TYPE_REDACTED]` */
  replacementFormat?: (type: PIIType, index: number) => string;
}

// ─── PII Pattern Definitions ───────────────────────────────────

interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  replacement: string;
  confidence: "high" | "medium" | "low";
  /** Optional context validator — pattern must appear near these words */
  contextWords?: string[];
  /** Minimum match length to avoid false positives */
  minLength?: number;
}

const PII_PATTERNS: PIIPattern[] = [
  // ── US Social Security Number ──
  {
    type: "ssn",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: "[SSN_REDACTED]",
    confidence: "high",
  },
  {
    type: "ssn",
    pattern: /\b\d{3}\s\d{2}\s\d{4}\b/g,
    replacement: "[SSN_REDACTED]",
    confidence: "medium",
  },

  // ── Indian Aadhaar Number (12 digits, often grouped 4-4-4) ──
  {
    type: "aadhaar",
    pattern: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
    replacement: "[AADHAAR_REDACTED]",
    confidence: "medium",
    contextWords: ["aadhaar", "aadhar", "uid", "uidai", "unique identification"],
  },

  // ── Indian PAN Card (ABCDE1234F) ──
  {
    type: "pan",
    pattern: /\b[A-Z]{5}\d{4}[A-Z]\b/g,
    replacement: "[PAN_REDACTED]",
    confidence: "high",
  },

  // ── Email Addresses ──
  {
    type: "email",
    pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    replacement: "[EMAIL_REDACTED]",
    confidence: "high",
  },

  // ── Credit Card Numbers (4 groups of 4 digits) ──
  {
    type: "credit_card",
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replacement: "[CC_REDACTED]",
    confidence: "high",
  },
  // Amex format: 4-6-5
  {
    type: "credit_card",
    pattern: /\b3[47]\d{2}[\s-]?\d{6}[\s-]?\d{5}\b/g,
    replacement: "[CC_REDACTED]",
    confidence: "high",
  },

  // ── Phone Numbers (international) ──
  {
    type: "phone",
    pattern: /(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    replacement: "[PHONE_REDACTED]",
    confidence: "medium",
  },
  // Indian mobile: +91 followed by 10 digits
  {
    type: "phone",
    pattern: /\+91[\s-]?\d{5}[\s-]?\d{5}\b/g,
    replacement: "[PHONE_REDACTED]",
    confidence: "high",
  },
  // General international format
  {
    type: "phone",
    pattern: /\+\d{1,3}[\s-]\d{6,14}\b/g,
    replacement: "[PHONE_REDACTED]",
    confidence: "medium",
  },

  // ── Date of Birth (contextual) ──
  {
    type: "date_of_birth",
    pattern: /\b(?:DOB|Date\s+of\s+Birth|Born|Birthday|D\.O\.B)[:\s]+\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/gi,
    replacement: "[DOB_REDACTED]",
    confidence: "high",
  },
  {
    type: "date_of_birth",
    pattern: /\b(?:DOB|Date\s+of\s+Birth|Born|Birthday|D\.O\.B)[:\s]+\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{2,4}\b/gi,
    replacement: "[DOB_REDACTED]",
    confidence: "high",
  },

  // ── IP Addresses ──
  {
    type: "ip_address",
    pattern: /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    replacement: "[IP_REDACTED]",
    confidence: "medium",
  },

  // ── Passport Numbers (contextual) ──
  {
    type: "passport",
    pattern: /(?:passport\s*(?:#|no\.?|number)?[:\s]*)[A-Z]\d{7}\b/gi,
    replacement: "[PASSPORT_REDACTED]",
    confidence: "high",
  },
  // Indian passport: single letter followed by 7 digits
  {
    type: "passport",
    pattern: /\b[A-Z]\d{7}\b/g,
    replacement: "[PASSPORT_REDACTED]",
    confidence: "low",
    contextWords: ["passport"],
  },

  // ── Bank Account Numbers (contextual) ──
  {
    type: "bank_account",
    pattern: /(?:account\s*(?:#|no\.?|number)?[:\s]*)\d{9,18}\b/gi,
    replacement: "[ACCOUNT_REDACTED]",
    confidence: "high",
  },
  // IFSC code (Indian bank branch code)
  {
    type: "bank_account",
    pattern: /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
    replacement: "[IFSC_REDACTED]",
    confidence: "medium",
    contextWords: ["ifsc", "bank", "branch", "account"],
  },

  // ── US Driver's License (varies by state, general patterns) ──
  {
    type: "drivers_license",
    pattern: /(?:driver'?s?\s*license\s*(?:#|no\.?|number)?[:\s]*)[A-Z0-9]{5,15}\b/gi,
    replacement: "[DL_REDACTED]",
    confidence: "high",
  },
];

// ─── Context Validation ────────────────────────────────────────

/**
 * Check if any context words appear within a window around the match position.
 */
function hasContextMatch(
  text: string,
  matchStart: number,
  matchEnd: number,
  contextWords: string[],
  windowSize = 200
): boolean {
  const start = Math.max(0, matchStart - windowSize);
  const end = Math.min(text.length, matchEnd + windowSize);
  const window = text.substring(start, end).toLowerCase();
  return contextWords.some((word) => window.includes(word.toLowerCase()));
}

// ─── Core Redaction Function ───────────────────────────────────

/**
 * Redact PII from text using regex patterns.
 * Returns the redacted text plus a detailed report of what was found.
 */
export function redactPII(
  text: string,
  options?: RedactionOptions
): RedactionResult {
  const allowedTypes = options?.types || undefined; // undefined = all
  const replacementFn =
    options?.replacementFormat ||
    ((type: PIIType) => {
      // Find the default replacement from the pattern definitions
      const pattern = PII_PATTERNS.find((p) => p.type === type);
      return pattern?.replacement || `[${type.toUpperCase()}_REDACTED]`;
    });

  const redactions: RedactionEntry[] = [];
  let workingText = text;

  // Collect all matches first, then apply in reverse order to preserve indices
  const allMatches: {
    type: PIIType;
    match: string;
    start: number;
    end: number;
    replacement: string;
    confidence: "high" | "medium" | "low";
  }[] = [];

  for (const piiPattern of PII_PATTERNS) {
    // Skip if type is not in the allowed list
    if (allowedTypes && !allowedTypes.includes(piiPattern.type)) {
      continue;
    }

    // Reset regex lastIndex
    const regex = new RegExp(piiPattern.pattern.source, piiPattern.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matchStr = match[0];
      const start = match.index;
      const end = start + matchStr.length;

      // Skip short matches that are likely false positives
      if (piiPattern.minLength && matchStr.length < piiPattern.minLength) {
        continue;
      }

      // Context validation for low-confidence patterns
      if (piiPattern.contextWords && piiPattern.contextWords.length > 0) {
        if (!hasContextMatch(text, start, end, piiPattern.contextWords)) {
          continue;
        }
      }

      allMatches.push({
        type: piiPattern.type,
        match: matchStr,
        start,
        end,
        replacement: replacementFn(piiPattern.type, allMatches.length),
        confidence: piiPattern.confidence,
      });
    }
  }

  // Deduplicate overlapping matches (keep the longer/higher-confidence one)
  const sortedMatches = allMatches
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const dedupedMatches: typeof allMatches = [];
  for (const m of sortedMatches) {
    const overlaps = dedupedMatches.some(
      (existing) => m.start < existing.end && m.end > existing.start
    );
    if (!overlaps) {
      dedupedMatches.push(m);
    }
  }

  if (options?.detectOnly) {
    // Return detection-only results
    return {
      redactedText: text,
      redactions: [],
      piiTypesFound: [...new Set(dedupedMatches.map((m) => m.type))],
      totalRedactions: dedupedMatches.length,
      originalLength: text.length,
      redactedLength: text.length,
    };
  }

  // Apply redactions in reverse order to preserve indices
  const reverseSorted = [...dedupedMatches].sort((a, b) => b.start - a.start);

  for (const m of reverseSorted) {
    workingText =
      workingText.substring(0, m.start) +
      m.replacement +
      workingText.substring(m.end);

    redactions.push({
      type: m.type,
      original: m.match,
      replacement: m.replacement,
      startIndex: m.start,
      endIndex: m.end,
    });
  }

  // Reverse redactions array so it's in document order
  redactions.reverse();

  return {
    redactedText: workingText,
    redactions,
    piiTypesFound: [...new Set(redactions.map((r) => r.type))],
    totalRedactions: redactions.length,
    originalLength: text.length,
    redactedLength: workingText.length,
  };
}

// ─── Detection-Only Convenience ────────────────────────────────

/**
 * Detect PII in text without redacting. Returns a list of detections.
 */
export function detectPII(text: string): PIIDetection[] {
  const detections: PIIDetection[] = [];

  for (const piiPattern of PII_PATTERNS) {
    const regex = new RegExp(piiPattern.pattern.source, piiPattern.pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const matchStr = match[0];
      const start = match.index;
      const end = start + matchStr.length;

      // Context validation
      if (piiPattern.contextWords && piiPattern.contextWords.length > 0) {
        if (!hasContextMatch(text, start, end, piiPattern.contextWords)) {
          continue;
        }
      }

      detections.push({
        type: piiPattern.type,
        value: matchStr,
        startIndex: start,
        endIndex: end,
        confidence: piiPattern.confidence,
      });
    }
  }

  // Deduplicate overlapping
  const sorted = detections.sort((a, b) => a.startIndex - b.startIndex);
  const deduped: PIIDetection[] = [];
  for (const d of sorted) {
    const overlaps = deduped.some(
      (existing) =>
        d.startIndex < existing.endIndex && d.endIndex > existing.startIndex
    );
    if (!overlaps) {
      deduped.push(d);
    }
  }

  return deduped;
}

// ─── Summary Helper ────────────────────────────────────────────

/**
 * Get a human-readable summary of redaction results.
 */
export function getRedactionSummary(result: RedactionResult): string {
  if (result.totalRedactions === 0) {
    return "No PII detected in the document.";
  }

  const typeCounts: Record<string, number> = {};
  for (const r of result.redactions) {
    typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
  }

  const parts = Object.entries(typeCounts)
    .map(([type, count]) => `${count} ${formatPIITypeName(type)}`)
    .join(", ");

  return `Redacted ${result.totalRedactions} PII instance(s): ${parts}`;
}

function formatPIITypeName(type: string): string {
  const names: Record<string, string> = {
    ssn: "SSN(s)",
    aadhaar: "Aadhaar number(s)",
    pan: "PAN number(s)",
    email: "email(s)",
    phone: "phone number(s)",
    credit_card: "credit card number(s)",
    date_of_birth: "date(s) of birth",
    bank_account: "bank account number(s)",
    passport: "passport number(s)",
    ip_address: "IP address(es)",
    drivers_license: "driver's license number(s)",
  };
  return names[type] || type;
}

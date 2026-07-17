import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { redactPII, getRedactionSummary } from "@/lib/pii-redact";
import { chunkDocument } from "@/lib/chunker";
import { indexChunks } from "@/lib/rag";
import { extractText, getDocumentProxy } from "unpdf";
import {
  FraudShield,
  getClientIP,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/fraud-shield";

// ─── Constants ─────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_DOCUMENTS_PER_USER = 20;
const UPLOAD_RATE_LIMIT = {
  maxRequests: 3,
  windowMs: 600_000, // 10 minutes
  label: "docucomply:upload",
};

// ─── POST /api/docucomply/upload ───────────────────────────────

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);
  const userAgent = request.headers.get("user-agent") || undefined;

  // ── FraudShield: Rate limit ──
  const rateCheck = FraudShield.checkRateLimit(
    `docucomply:upload:${ip}`,
    UPLOAD_RATE_LIMIT
  );
  if (!rateCheck.allowed) {
    FraudShield.logFraudEvent({
      eventType: "rate_limit",
      severity: "medium",
      ipAddress: ip,
      userAgent,
      route: "/api/docucomply/upload",
      details: { hits: rateCheck.totalHits },
      actionTaken: "rate_limited",
      riskScore: 50,
    });
    return rateLimitResponse(rateCheck, "docucomply:upload");
  }

  try {
    const supabase = createServerSupabase();

    // ── Auth check ──
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in to upload documents." },
        { status: 401 }
      );
    }

    // ── Check document limit ──
    const { count: docCount } = await supabase
      .from("user_documents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((docCount || 0) >= MAX_DOCUMENTS_PER_USER) {
      return NextResponse.json(
        {
          error: `You've reached the maximum of ${MAX_DOCUMENTS_PER_USER} documents. Please delete some before uploading more.`,
        },
        { status: 400 }
      );
    }

    // ── Parse form data ──
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    let rawText = (formData.get("text") as string) || "";
    let fileName = (formData.get("fileName") as string) || "Untitled Document";

    // ── Extract text from PDF ──
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum allowed size is 10MB.`,
          },
          { status: 400 }
        );
      }

      fileName = file.name || fileName;

      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uint8Array = new Uint8Array(buffer);
        const pdf = await getDocumentProxy(uint8Array);
        const { text } = await extractText(pdf, { mergePages: true });
        rawText = text;
      } catch (pdfErr: any) {
        console.error("PDF parsing error:", pdfErr);
        return NextResponse.json(
          {
            error: `Could not read the uploaded PDF. It may be corrupted, password-protected, or a scanned image. (${pdfErr.message || "Parse error"})`,
          },
          { status: 400 }
        );
      }
    }

    if (!rawText || rawText.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            "Document text is too short. Please provide at least 50 characters of content.",
        },
        { status: 400 }
      );
    }

    // ── FraudShield: AI abuse check ──
    const abuseCheck = FraudShield.checkAIAbuse({
      ipAddress: ip,
      userId: user.id,
      route: "/api/docucomply/upload",
      inputText: rawText.substring(0, 5000),
      userAgent,
      payloadSizeBytes: new Blob([rawText]).size,
    });

    if (!abuseCheck.allowed) {
      FraudShield.logFraudEvent({
        eventType: "ai_abuse",
        severity: "high",
        userId: user.id,
        ipAddress: ip,
        userAgent,
        route: "/api/docucomply/upload",
        details: { signals: abuseCheck.signals },
        actionTaken: "blocked",
        riskScore: abuseCheck.riskScore,
      });
      return NextResponse.json(
        { error: "Upload blocked by security system." },
        { status: 403 }
      );
    }

    // ── Create user_documents record (status: processing) ──
    const { data: docRecord, error: insertErr } = await supabase
      .from("user_documents")
      .insert({
        user_id: user.id,
        file_name: fileName,
        original_size_bytes: new Blob([rawText]).size,
        status: "processing",
      })
      .select("id")
      .single();

    if (insertErr || !docRecord) {
      console.error("Failed to create document record:", insertErr);
      return NextResponse.json(
        { error: "Failed to create document record." },
        { status: 500 }
      );
    }

    const documentId = docRecord.id;

    try {
      // ── Step 1: PII Redaction ──
      const redactionResult = redactPII(rawText);

      // ── Step 2: Chunk the redacted text ──
      const chunks = chunkDocument(redactionResult.redactedText, {
        fileName,
        userId: user.id,
        documentId,
      });

      // ── Step 3: Embed & index chunks ──
      const { indexed, errors } = await indexChunks(
        chunks,
        "user_documents",
        50
      );

      // ── Step 4: Update document record ──
      await supabase
        .from("user_documents")
        .update({
          chunk_count: indexed,
          pii_types_found: redactionResult.piiTypesFound,
          pii_redaction_count: redactionResult.totalRedactions,
          status: errors > 0 && indexed === 0 ? "failed" : "indexed",
        })
        .eq("id", documentId);

      return NextResponse.json({
        success: true,
        documentId,
        fileName,
        chunks: indexed,
        indexingErrors: errors,
        redaction: {
          totalRedacted: redactionResult.totalRedactions,
          piiTypesFound: redactionResult.piiTypesFound,
          summary: getRedactionSummary(redactionResult),
        },
      });
    } catch (processingErr: any) {
      // Mark document as failed
      await supabase
        .from("user_documents")
        .update({ status: "failed" })
        .eq("id", documentId);

      console.error("Document processing failed:", processingErr);
      return NextResponse.json(
        {
          error: "Failed to process document. Please try again.",
          details: processingErr.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("DocuComply upload error:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}

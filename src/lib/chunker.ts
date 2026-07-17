// ─── Intelligent Document Chunking ──────────────────────────────
// Different data types require different chunking strategies to
// preserve semantic meaning and keep chunks self-contained.

export interface Chunk {
  content: string;
  metadata: Record<string, unknown>;
}

// ─── Resume Bullet Chunking ────────────────────────────────────

/**
 * Splits resume text into individual bullet points.
 * Each bullet is a self-contained, embeddable chunk.
 */
export function chunkResumeBullets(
  text: string,
  sectionHeader?: string
): Chunk[] {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 10);

  const bullets: Chunk[] = [];

  for (const line of lines) {
    // Skip lines that look like section headers
    if (line.match(/^(education|experience|skills|projects|certifications)/i)) {
      continue;
    }

    // Clean common bullet prefixes
    const cleaned = line
      .replace(/^[-•*▪▸►◦⁃]\s*/, "")
      .replace(/^\d+[.)]\s*/, "")
      .trim();

    if (cleaned.length > 15) {
      bullets.push({
        content: cleaned,
        metadata: {
          chunk_type: "resume_bullet",
          section: sectionHeader || "general",
        },
      });
    }
  }

  return bullets;
}

// ─── Q&A Pair Chunking ─────────────────────────────────────────

/**
 * Keeps question + answer as an atomic unit.
 * Each Q&A pair is a single chunk.
 */
export function chunkQAPairs(
  pairs: { question: string; answer: string; metadata?: Record<string, unknown> }[]
): Chunk[] {
  return pairs.map((pair) => ({
    content: `Q: ${pair.question}\nA: ${pair.answer}`,
    metadata: {
      chunk_type: "qa_pair",
      question: pair.question,
      ...pair.metadata,
    },
  }));
}

// ─── Header-aware Markdown Chunking ────────────────────────────

/**
 * Splits markdown by headers, preserving heading hierarchy.
 * Each section under a heading becomes a chunk with its heading as context.
 */
export function chunkByHeaders(
  markdown: string,
  baseMetadata?: Record<string, unknown>
): Chunk[] {
  const chunks: Chunk[] = [];
  const sections = markdown.split(/(?=^#{1,3}\s)/m);

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length < 20) continue;

    // Extract the heading
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);
    const heading = headingMatch ? headingMatch[2].trim() : "";
    const level = headingMatch ? headingMatch[1].length : 0;

    chunks.push({
      content: trimmed,
      metadata: {
        chunk_type: "section",
        heading,
        heading_level: level,
        ...baseMetadata,
      },
    });
  }

  return chunks;
}

// ─── Recursive Character Splitting ─────────────────────────────

/**
 * General-purpose text chunking with overlap.
 * Splits by paragraphs first, then sentences, then characters.
 */
export function chunkRecursive(
  text: string,
  maxSize = 400,
  overlap = 50,
  baseMetadata?: Record<string, unknown>
): Chunk[] {
  const chunks: Chunk[] = [];

  // Split into paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    // If adding this paragraph would exceed maxSize, finalize current chunk
    if (currentChunk && (currentChunk.length + trimmed.length + 2) > maxSize) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          chunk_type: "text",
          chunk_index: chunkIndex,
          ...baseMetadata,
        },
      });
      chunkIndex++;

      // Keep overlap from the end of the current chunk
      if (overlap > 0) {
        const words = currentChunk.split(/\s+/);
        const overlapWords = words.slice(-Math.ceil(overlap / 5));
        currentChunk = overlapWords.join(" ") + "\n\n" + trimmed;
      } else {
        currentChunk = trimmed;
      }
    } else {
      currentChunk = currentChunk ? currentChunk + "\n\n" + trimmed : trimmed;
    }
  }

  // Add the final chunk
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: {
        chunk_type: "text",
        chunk_index: chunkIndex,
        ...baseMetadata,
      },
    });
  }

  return chunks;
}

// ─── Company Profile Chunking ──────────────────────────────────

/**
 * Specialized chunking for company profiles.
 * Preserves company context in each chunk.
 */
export function chunkCompanyProfile(
  profile: {
    company: string;
    sections: { title: string; content: string }[];
  }
): Chunk[] {
  return profile.sections.map((section) => ({
    content: `Company: ${profile.company}\n\n## ${section.title}\n\n${section.content}`,
    metadata: {
      chunk_type: "company_section",
      company: profile.company,
      section: section.title,
    },
  }));
}

// ─── Document Q&A Chunking (DocuComply) ────────────────────────

/**
 * Chunk a document for DocuComply Q&A.
 * Uses recursive splitting with larger chunks (500 chars, 75 overlap)
 * optimized for document paragraph retrieval.
 * Each chunk is tagged with user_id and file context for scoped search.
 */
export function chunkDocument(
  text: string,
  metadata: { fileName: string; userId: string; documentId?: string; [key: string]: unknown }
): Chunk[] {
  const { fileName, userId, documentId, ...extraMeta } = metadata;

  // Use recursive chunking with larger sizes for document paragraphs
  const rawChunks = chunkRecursive(text, 500, 75, {
    chunk_type: "user_document",
    user_id: userId,
    file_name: fileName,
    document_id: documentId || undefined,
    ...extraMeta,
  });

  // Prepend file context to each chunk for better retrieval
  return rawChunks.map((chunk, i) => ({
    ...chunk,
    content: `[Document: ${fileName}]\n\n${chunk.content}`,
    metadata: {
      ...chunk.metadata,
      chunk_index: i,
      total_chunks: rawChunks.length,
    },
  }));
}

-- =====================================================
-- PlacementPlot AI — User Documents Table (DocuComply)
-- Run this in Supabase SQL Editor after 002_fraud_events.sql
-- =====================================================

-- User-uploaded documents for DocuComply Q&A
CREATE TABLE IF NOT EXISTS user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  original_size_bytes INT,
  chunk_count INT DEFAULT 0,
  pii_types_found TEXT[] DEFAULT '{}',
  pii_redaction_count INT DEFAULT 0,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'indexed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_documents_user_idx ON user_documents (user_id);
CREATE INDEX IF NOT EXISTS user_documents_status_idx ON user_documents (status);
CREATE INDEX IF NOT EXISTS user_documents_created_idx ON user_documents (created_at DESC);

-- RLS: Users can only see/manage their own documents
ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON user_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON user_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON user_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Also add an index on the documents table for user_id metadata filtering
-- (the existing documents table stores user_documents chunks with user_id in metadata)
CREATE INDEX IF NOT EXISTS documents_metadata_user_idx
  ON documents USING gin ((metadata->'user_id'));

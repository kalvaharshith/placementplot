-- =====================================================
-- PlacementPlot AI — pgvector Tables & RPC Functions
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Unified documents table for all knowledge bases
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(3072),  -- Gemini embedding model dimension
  metadata JSONB DEFAULT '{}',
  kb_type TEXT NOT NULL,  -- 'ats_rules' | 'resume_examples' | 'interview_bank' | 'company_profiles' | 'learning_resources'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HNSW index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS documents_embedding_idx
  ON documents USING hnsw (embedding vector_cosine_ops);

-- 4. Index for filtering by knowledge base type
CREATE INDEX IF NOT EXISTS documents_kb_type_idx
  ON documents (kb_type);

-- 5. GIN index for metadata filtering
CREATE INDEX IF NOT EXISTS documents_metadata_idx
  ON documents USING gin (metadata jsonb_path_ops);

-- 6. Full-text search column (auto-generated)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS documents_fts_idx
  ON documents USING gin (fts);

-- 7. Hybrid search RPC function (vector + full-text)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding VECTOR(3072),
  query_text TEXT,
  filter_kb_type TEXT,
  filter_metadata JSONB DEFAULT '{}',
  match_count INT DEFAULT 5,
  vector_weight FLOAT DEFAULT 0.7,
  text_weight FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      d.id,
      d.content,
      d.metadata,
      1 - (d.embedding <=> query_embedding) AS vec_similarity
    FROM documents d
    WHERE d.kb_type = filter_kb_type
      AND (filter_metadata = '{}'::JSONB OR d.metadata @> filter_metadata)
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  text_results AS (
    SELECT
      d.id,
      d.content,
      d.metadata,
      ts_rank(d.fts, plainto_tsquery('english', query_text)) AS text_rank
    FROM documents d
    WHERE d.kb_type = filter_kb_type
      AND d.fts @@ plainto_tsquery('english', query_text)
      AND (filter_metadata = '{}'::JSONB OR d.metadata @> filter_metadata)
    ORDER BY text_rank DESC
    LIMIT match_count * 2
  ),
  combined AS (
    SELECT
      COALESCE(v.id, t.id) AS id,
      COALESCE(v.content, t.content) AS content,
      COALESCE(v.metadata, t.metadata) AS metadata,
      (COALESCE(v.vec_similarity, 0) * vector_weight +
       COALESCE(t.text_rank, 0) * text_weight) AS combined_score
    FROM vector_results v
    FULL OUTER JOIN text_results t ON v.id = t.id
  )
  SELECT
    combined.id,
    combined.content,
    combined.metadata,
    combined.combined_score AS similarity
  FROM combined
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- 8. Pure vector search (fallback)
CREATE OR REPLACE FUNCTION vector_search(
  query_embedding VECTOR(3072),
  filter_kb_type TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    (1 - (d.embedding <=> query_embedding))::FLOAT AS similarity
  FROM documents d
  WHERE d.kb_type = filter_kb_type
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =====================================================
-- Application Tables
-- =====================================================

-- Users (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  college TEXT,
  year INT,
  branch TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  resume_credits INT DEFAULT 2,
  interview_credits INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resumes
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT,
  parsed_text TEXT,
  ats_score INT,
  analysis JSONB,
  job_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mock Interviews
CREATE TABLE IF NOT EXISTS mock_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT DEFAULT 'SDE',
  round TEXT DEFAULT 'Technical',
  difficulty TEXT DEFAULT 'Medium',
  messages JSONB DEFAULT '[]',
  score INT,
  feedback JSONB,
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview Packs (purchasable)
CREATE TABLE IF NOT EXISTS interview_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  price INT NOT NULL DEFAULT 9900, -- in paise
  description TEXT,
  question_count INT DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Purchases
CREATE TABLE IF NOT EXISTS user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pack_id UUID REFERENCES interview_packs(id),
  payment_id TEXT,
  amount INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  razorpay_subscription_id TEXT,
  plan TEXT DEFAULT 'premium',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'expired')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roadmap Plans
CREATE TABLE IF NOT EXISTS roadmap_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_companies TEXT[] DEFAULT '{}',
  skill_level TEXT DEFAULT 'intermediate',
  available_hours INT DEFAULT 10,
  timeline_months INT DEFAULT 3,
  weeks JSONB DEFAULT '[]',
  progress INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_plans ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can manage their own resumes
CREATE POLICY "Users can view own resumes" ON resumes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own resumes" ON resumes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can manage their own interviews
CREATE POLICY "Users can view own interviews" ON mock_interviews
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own interviews" ON mock_interviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own interviews" ON mock_interviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can view their purchases
CREATE POLICY "Users can view own purchases" ON user_purchases
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view their subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can manage their roadmap
CREATE POLICY "Users can view own roadmap" ON roadmap_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own roadmap" ON roadmap_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own roadmap" ON roadmap_plans
  FOR UPDATE USING (auth.uid() = user_id);

-- Documents table is public read (knowledge base)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Documents are publicly readable" ON documents
  FOR SELECT USING (true);

-- Interview packs are publicly readable
ALTER TABLE interview_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Interview packs are publicly readable" ON interview_packs
  FOR SELECT USING (true);

-- =====================================================
-- Auto-create profile on signup (trigger)
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

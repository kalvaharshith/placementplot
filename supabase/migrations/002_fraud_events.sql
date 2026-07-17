-- =====================================================
-- PlacementPlot AI — Fraud Events Table
-- Run this in Supabase SQL Editor after 001_vector_tables.sql
-- =====================================================

-- Fraud events audit log
CREATE TABLE IF NOT EXISTS fraud_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,        -- 'rate_limit' | 'payment_fraud' | 'ai_abuse' | 'auth_abuse' | 'replay_attack' | 'prompt_injection' | 'amount_tamper' | 'duplicate_order' | 'suspicious_pattern'
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  route TEXT,
  details JSONB DEFAULT '{}',
  action_taken TEXT NOT NULL DEFAULT 'logged' CHECK (action_taken IN ('blocked', 'warned', 'logged', 'rate_limited')),
  risk_score INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for querying fraud patterns
CREATE INDEX IF NOT EXISTS fraud_events_type_idx ON fraud_events (event_type);
CREATE INDEX IF NOT EXISTS fraud_events_severity_idx ON fraud_events (severity);
CREATE INDEX IF NOT EXISTS fraud_events_user_idx ON fraud_events (user_id);
CREATE INDEX IF NOT EXISTS fraud_events_ip_idx ON fraud_events (ip_address);
CREATE INDEX IF NOT EXISTS fraud_events_created_idx ON fraud_events (created_at DESC);

-- Composite index for common admin queries (type + severity + time)
CREATE INDEX IF NOT EXISTS fraud_events_type_severity_idx ON fraud_events (event_type, severity, created_at DESC);

-- RLS: Only service role can insert; admins can read via service role
ALTER TABLE fraud_events ENABLE ROW LEVEL SECURITY;

-- No public read access — fraud data is sensitive
-- Access is via service role key (createServerSupabase) only

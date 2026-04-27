-- Migration 036: AI Usage Log
-- Tracks every Gemini API call for cost analysis and monitoring

CREATE TABLE ai_usage_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    feature TEXT NOT NULL CHECK (feature IN (
        'categorization',
        'outfit_gen',
        'event_outfit_gen',
        'listing_gen',
        'bg_removal',
        'extraction',
        'steal_look',
        'event_classify',
        'gap_analysis',
        'shopping_analysis'
    )),
    model_used TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
    tokens_input INTEGER,
    tokens_output INTEGER,
    latency_ms INTEGER NOT NULL,
    cost_usd NUMERIC(10, 6),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for per-user cost queries
CREATE INDEX idx_ai_usage_log_user_id ON ai_usage_log(user_id);

-- Index for feature-level aggregation
CREATE INDEX idx_ai_usage_log_feature ON ai_usage_log(feature);

-- Index for time-range queries (daily/weekly cost reports)
CREATE INDEX idx_ai_usage_log_created_at ON ai_usage_log(created_at);

-- RLS: users can read their own logs
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI usage"
    ON ai_usage_log
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI usage"
    ON ai_usage_log
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

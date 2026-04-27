-- Migration 030: Create wardrobe extraction jobs table
-- Story 10.1: Bulk Photo Upload
--
-- Storage bucket setup (manual step in Supabase dashboard):
--   - Create bucket: extraction-uploads
--   - Public: false
--   - Max file size: 10 MB
--   - Allowed MIME types: image/jpeg, image/png, image/heic
--   - Cleanup policy: photos deleted after extraction job completes (Story 10.2)

CREATE TABLE wardrobe_extraction_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Job details
  photo_urls TEXT[],
  total_photos INT NOT NULL,
  processed_photos INT DEFAULT 0,

  -- Results
  detected_items JSONB,
  items_added_count INT DEFAULT 0,

  -- Status
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_extraction_jobs_user_id ON wardrobe_extraction_jobs(user_id);
CREATE INDEX idx_extraction_jobs_status ON wardrobe_extraction_jobs(status);

ALTER TABLE wardrobe_extraction_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own extraction jobs"
  ON wardrobe_extraction_jobs FOR ALL
  USING (auth.uid() = user_id);

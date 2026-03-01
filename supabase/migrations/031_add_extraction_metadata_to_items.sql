-- Migration 031: Add extraction metadata columns to items table
-- Story 10.5: Auto-Categorization for Extracted Items
-- Tracks how items were created (manual, AI extraction, screenshot import)

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS creation_method TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS extraction_source TEXT,
  ADD COLUMN IF NOT EXISTS extraction_job_id UUID REFERENCES wardrobe_extraction_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ai_confidence INT;

-- Index for filtering by creation method (e.g., show only AI-extracted items)
CREATE INDEX IF NOT EXISTS idx_items_creation_method ON items(creation_method);

-- Index for linking items back to their extraction job
CREATE INDEX IF NOT EXISTS idx_items_extraction_job_id ON items(extraction_job_id);

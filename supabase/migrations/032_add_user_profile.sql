-- Migration 032: Add user profile fields (gender, birth_year, measurements, style_tags)
-- Story: Profile Setup Onboarding

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('man', 'woman', 'non-binary', 'prefer-not-to-say')),
  ADD COLUMN IF NOT EXISTS birth_year INTEGER CHECK (birth_year > 1900 AND birth_year <= EXTRACT(YEAR FROM NOW())::INTEGER),
  ADD COLUMN IF NOT EXISTS height_cm INTEGER CHECK (height_cm > 0 AND height_cm < 300),
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5, 1) CHECK (weight_kg > 0 AND weight_kg < 500),
  ADD COLUMN IF NOT EXISTS style_tags TEXT[] DEFAULT '{}';

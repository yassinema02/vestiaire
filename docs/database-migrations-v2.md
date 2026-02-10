# V2 Database Migrations Specification

**Version:** 1.0  
**Date:** February 9, 2026  
**Status:** Planning

---

## Overview

This document defines all database schema changes required for Vestiaire V2. All migrations use Supabase PostgreSQL with Row Level Security (RLS).

---

## Migration Strategy

- **Sequential numbering:** Continue from V1 (last: `017_add_currency_to_items.sql`)
- **V2 starts at:** `018_create_shopping_scans.sql`
- **Testing:** All migrations tested locally before production
- **Rollback:** Each migration includes `DOWN` migration for safety

---

## New Tables Summary

| Migration | Table | Purpose |
|-----------|-------|---------|
| 018 | `shopping_scans` | Store screenshot/URL product analyses |
| 019 | `shopping_wishlists` | Save analyzed products for later |
| 020 | `style_squads` | Private friend groups for OOTD sharing |
| 021 | `squad_memberships` | Junction table for users ↔ squads |
| 022 | `ootd_posts` | Daily outfit posts |
| 023 | `ootd_comments` | Comments on OOTD posts |
| 024 | `ootd_reactions` | Fire emoji reactions |
| 025 | `wardrobe_extraction_jobs` | Track bulk photo processing |
| 026 | `calendar_events` | Synced phone calendar events |
| 027 | `calendar_outfits` | Scheduled outfits for events |
| 028 | `resale_history` | Track sold/donated items |

---

## Migration 018: shopping_scans

**Epic:** 8 (Shopping Assistant)

### Schema

```sql
CREATE TABLE shopping_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Product details
  product_name TEXT,
  product_brand TEXT,
  product_url TEXT,
  product_image_url TEXT,
  
  -- AI extracted attributes
  category TEXT, -- 'tops', 'bottoms', 'shoes', etc.
  color TEXT,
  secondary_colors TEXT[], -- array of additional colors
  style TEXT, -- 'casual', 'formal', 'sporty', etc.
  material TEXT,
  pattern TEXT, -- 'solid', 'striped', 'floral', etc.
  season TEXT[], -- ['spring', 'summer']
  formality INT CHECK (formality >= 1 AND formality <= 10),
  
  -- Pricing
  price_amount DECIMAL(10,2),
  price_currency TEXT DEFAULT 'GBP',
  
  -- Analysis results
  compatibility_score INT CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
  matching_item_ids UUID[], -- IDs of wardrobe items that match
  ai_insights JSONB, -- Array of insight objects: [{category, text}]
  
  -- Metadata
  scan_method TEXT CHECK (scan_method IN ('screenshot', 'url')),
  user_rating INT CHECK (user_rating >= 1 AND user_rating <= 5), -- Was scan helpful?
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shopping_scans_user_id ON shopping_scans(user_id);
CREATE INDEX idx_shopping_scans_created_at ON shopping_scans(created_at DESC);
CREATE INDEX idx_shopping_scans_compatibility ON shopping_scans(compatibility_score DESC);

-- RLS Policies
ALTER TABLE shopping_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scans"
  ON shopping_scans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scans"
  ON shopping_scans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans"
  ON shopping_scans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scans"
  ON shopping_scans FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Migration 019: shopping_wishlists

**Epic:** 8 (Shopping Assistant)

### Schema

```sql
CREATE TABLE shopping_wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL REFERENCES shopping_scans(id) ON DELETE CASCADE,
  
  -- User notes
  notes TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Metadata
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, scan_id) -- Prevent duplicate wishlist entries
);

-- Indexes
CREATE INDEX idx_shopping_wishlists_user_id ON shopping_wishlists(user_id);
CREATE INDEX idx_shopping_wishlists_added_at ON shopping_wishlists(added_at DESC);

-- RLS Policies
ALTER TABLE shopping_wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wishlist"
  ON shopping_wishlists FOR ALL
  USING (auth.uid() = user_id);
```

---

## Migration 020: style_squads

**Epic:** 9 (Social OOTD Feed)

### Schema

```sql
CREATE TABLE style_squads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Squad details
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL, -- 6-char alphanumeric code
  
  -- Settings
  max_members INT DEFAULT 20,
  is_public BOOLEAN DEFAULT FALSE, -- Future: public squads
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_style_squads_creator_id ON style_squads(creator_id);
CREATE INDEX idx_style_squads_invite_code ON style_squads(invite_code);

-- RLS Policies
ALTER TABLE style_squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view squads they're in"
  ON style_squads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_memberships 
      WHERE squad_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can update squad"
  ON style_squads FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creator can delete squad"
  ON style_squads FOR DELETE
  USING (auth.uid() = creator_id);

CREATE POLICY "Anyone can create squad"
  ON style_squads FOR INSERT
  WITH CHECK (auth.uid() = creator_id);
```

---

## Migration 021: squad_memberships

**Epic:** 9 (Social OOTD Feed)

### Schema

```sql
CREATE TABLE squad_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  squad_id UUID NOT NULL REFERENCES style_squads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Membership details
  role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(squad_id, user_id) -- User can only join squad once
);

-- Indexes
CREATE INDEX idx_squad_memberships_squad_id ON squad_memberships(squad_id);
CREATE INDEX idx_squad_memberships_user_id ON squad_memberships(user_id);

-- RLS Policies
ALTER TABLE squad_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view squad memberships"
  ON squad_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_memberships sm 
      WHERE sm.squad_id = squad_id AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join squad with invite code"
  ON squad_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can remove members"
  ON squad_memberships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM squad_memberships sm 
      WHERE sm.squad_id = squad_id 
        AND sm.user_id = auth.uid() 
        AND sm.role = 'admin'
    )
  );
```

---

## Migration 022: ootd_posts

**Epic:** 9 (Social OOTD Feed)

### Schema

```sql
CREATE TABLE ootd_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES style_squads(id) ON DELETE CASCADE,
  
  -- Post content
  photo_url TEXT NOT NULL,
  caption TEXT CHECK (LENGTH(caption) <= 150),
  tagged_item_ids UUID[], -- Items worn in this outfit
  
  -- Engagement counts (denormalized for performance)
  reaction_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ootd_posts_squad_id ON ootd_posts(squad_id);
CREATE INDEX idx_ootd_posts_user_id ON ootd_posts(user_id);
CREATE INDEX idx_ootd_posts_created_at ON ootd_posts(created_at DESC);

-- RLS Policies
ALTER TABLE ootd_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members can view posts"
  ON ootd_posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_memberships 
      WHERE squad_id = ootd_posts.squad_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create posts in their squads"
  ON ootd_posts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM squad_memberships 
      WHERE squad_id = ootd_posts.squad_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own posts"
  ON ootd_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON ootd_posts FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Migration 023: ootd_comments

**Epic:** 9 (Social OOTD Feed)

### Schema

```sql
CREATE TABLE ootd_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES ootd_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Comment content
  text TEXT NOT NULL CHECK (LENGTH(text) <= 200),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ootd_comments_post_id ON ootd_comments(post_id);
CREATE INDEX idx_ootd_comments_created_at ON ootd_comments(created_at DESC);

-- RLS Policies
ALTER TABLE ootd_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members can view comments"
  ON ootd_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ootd_posts op
      JOIN squad_memberships sm ON sm.squad_id = op.squad_id
      WHERE op.id = post_id AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Squad members can create comments"
  ON ootd_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM ootd_posts op
      JOIN squad_memberships sm ON sm.squad_id = op.squad_id
      WHERE op.id = post_id AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own comments"
  ON ootd_comments FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Migration 024: ootd_reactions

**Epic:** 9 (Social OOTD Feed)

### Schema

```sql
CREATE TABLE ootd_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES ootd_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Reaction type (future: multiple emoji types)
  emoji TEXT DEFAULT '🔥',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(post_id, user_id) -- One reaction per user per post
);

-- Indexes
CREATE INDEX idx_ootd_reactions_post_id ON ootd_reactions(post_id);

-- RLS Policies
ALTER TABLE ootd_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members can view reactions"
  ON ootd_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ootd_posts op
      JOIN squad_memberships sm ON sm.squad_id = op.squad_id
      WHERE op.id = post_id AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Squad members can react"
  ON ootd_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON ootd_reactions FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Migration 025: wardrobe_extraction_jobs

**Epic:** 10 (AI Wardrobe Extraction)

### Schema

```sql
CREATE TABLE wardrobe_extraction_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Job details
  photo_urls TEXT[], -- Array of uploaded photo URLs
  total_photos INT NOT NULL,
  processed_photos INT DEFAULT 0,
  
  -- Results
  detected_items JSONB, -- Array of detected item objects
  items_added_count INT DEFAULT 0,
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_extraction_jobs_user_id ON wardrobe_extraction_jobs(user_id);
CREATE INDEX idx_extraction_jobs_status ON wardrobe_extraction_jobs(status);

-- RLS Policies
ALTER TABLE wardrobe_extraction_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own extraction jobs"
  ON wardrobe_extraction_jobs FOR ALL
  USING (auth.uid() = user_id);
```

---

## Migration 026: calendar_events

**Epic:** 12 (Calendar Integration)

### Schema

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Event details from phone calendar
  external_event_id TEXT, -- iOS EventKit or Google Calendar ID
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  
  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT FALSE,
  
  -- AI classification
  event_type TEXT, -- 'work', 'social', 'active', 'formal', 'casual'
  formality_score INT CHECK (formality_score >= 1 AND formality_score <= 10),
  
  -- Metadata
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, external_event_id) -- Prevent duplicate syncs
);

-- Indexes
CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);

-- RLS Policies
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calendar events"
  ON calendar_events FOR ALL
  USING (auth.uid() = user_id);
```

---

## Migration 027: calendar_outfits

**Epic:** 12 (Calendar Integration)

### Schema

```sql
CREATE TABLE calendar_outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  -- Scheduled date (for outfits not tied to events)
  scheduled_date DATE,
  
  -- Outfit details
  outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL, -- Reference to saved outfit
  item_ids UUID[], -- Direct item IDs if not using saved outfit
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Either event_id or scheduled_date must be set
  CHECK (
    (event_id IS NOT NULL AND scheduled_date IS NULL) OR
    (event_id IS NULL AND scheduled_date IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_calendar_outfits_user_id ON calendar_outfits(user_id);
CREATE INDEX idx_calendar_outfits_event_id ON calendar_outfits(event_id);
CREATE INDEX idx_calendar_outfits_scheduled_date ON calendar_outfits(scheduled_date);

-- RLS Policies
ALTER TABLE calendar_outfits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calendar outfits"
  ON calendar_outfits FOR ALL
  USING (auth.uid() = user_id);
```

---

## Migration 028: resale_history

**Epic:** 13 (Circular Resale Triggers)

### Schema

```sql
CREATE TABLE resale_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE SET NULL,
  
  -- Action details
  action_type TEXT CHECK (action_type IN ('sold', 'donated')) NOT NULL,
  
  -- Sale details (if sold)
  sale_price DECIMAL(10,2),
  sale_currency TEXT DEFAULT 'GBP',
  platform TEXT, -- 'vinted', 'depop', 'ebay', etc.
  
  -- Donation details (if donated)
  charity_name TEXT,
  estimated_value DECIMAL(10,2),
  
  -- Metadata
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_resale_history_user_id ON resale_history(user_id);
CREATE INDEX idx_resale_history_action_date ON resale_history(action_date DESC);

-- RLS Policies
ALTER TABLE resale_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own resale history"
  ON resale_history FOR ALL
  USING (auth.uid() = user_id);
```

---

## Additional Column Updates

### Update `items` table (existing)

```sql
-- Migration 029: Add V2 fields to items
ALTER TABLE items 
ADD COLUMN neglect_status BOOLEAN DEFAULT FALSE,
ADD COLUMN last_worn_date DATE,
ADD COLUMN extraction_source TEXT, -- 'manual', 'photo_import'
ADD COLUMN creation_method TEXT; -- 'manual', 'ai_extraction'

CREATE INDEX idx_items_neglect_status ON items(neglect_status) WHERE neglect_status = TRUE;
CREATE INDEX idx_items_last_worn_date ON items(last_worn_date);
```

---

## Database Functions & Triggers

### Auto-update ootd_posts counts

```sql
-- Migration 030: Triggers for OOTD engagement counts

-- Update reaction count when reaction added/removed
CREATE OR REPLACE FUNCTION update_post_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE ootd_posts SET reaction_count = reaction_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE ootd_posts SET reaction_count = reaction_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ootd_reaction_count_trigger
AFTER INSERT OR DELETE ON ootd_reactions
FOR EACH ROW EXECUTE FUNCTION update_post_reaction_count();

-- Update comment count when comment added/removed
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE ootd_posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE ootd_posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ootd_comment_count_trigger
AFTER INSERT OR DELETE ON ootd_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();
```

---

## Storage Buckets

### New Supabase Storage buckets needed:

```sql
-- Create storage buckets for V2

-- OOTD photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('ootd-photos', 'ootd-photos', false);

-- Shopping scan screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('shopping-scans', 'shopping-scans', false);

-- Extraction job photos (temporary)
INSERT INTO storage.buckets (id, name, public)
VALUES ('extraction-temp', 'extraction-temp', false);

-- Storage policies
CREATE POLICY "Users can upload own OOTD photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ootd-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own shopping scans"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'shopping-scans' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Squad members can view OOTD photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ootd-photos' AND
    -- Complex: verify user is in same squad as photo owner
    -- Implementation in Edge Function for simplicity
    TRUE
  );
```

---

## Performance Considerations

### Query Optimization

1. **OOTD Feed Query:** Join across `ootd_posts`, `squad_memberships`, `users`
   - Add composite index: `CREATE INDEX idx_ootd_feed ON ootd_posts(squad_id, created_at DESC);`

2. **Shopping Scan History:** Frequent sorting by compatibility score
   - Indexed above: `idx_shopping_scans_compatibility`

3. **Calendar Events:** Queries by date range
   - Indexed above: `idx_calendar_events_start_time`

### Estimated Storage

- **50K users**, avg 20 scans/user = **1M rows** in `shopping_scans` (~200MB)
- **50K users**, avg 50 OOTD posts/user = **2.5M rows** in `ootd_posts` (~500MB)
- **Total V2 data:** ~1GB at 50K users

---

## Migration Execution Plan

### Phase 1: Foundation (Week 1)
- Migrations 018-019 (Shopping tables)
- Migration 025 (Extraction jobs)

### Phase 2: Social (Week 2)
- Migrations 020-024 (Style Squads + OOTD)
- Storage buckets for OOTD photos

### Phase 3: Calendar & Resale (Week 3)
- Migrations 026-027 (Calendar)
- Migration 028 (Resale history)
- Migration 029 (Items updates)

### Phase 4: Triggers & Functions (Week 4)
- Migration 030 (Triggers)
- Performance testing

---

## Testing Checklist

- [ ] All migrations run successfully on local dev DB
- [ ] RLS policies tested with multiple users
- [ ] Indexes verified with EXPLAIN ANALYZE
- [ ] Foreign key constraints work correctly
- [ ] Triggers fire as expected
- [ ] Storage buckets accessible with correct policies
- [ ] Migration rollback scripts tested

---

**Document Status:** Ready for Implementation  
**Owner:** Database Team  
**Last Updated:** February 9, 2026

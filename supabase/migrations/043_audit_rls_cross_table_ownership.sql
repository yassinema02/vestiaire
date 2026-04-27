-- Migration 043: Cross-Table Ownership RLS (Audit 2026-04-15)
-- Closes remaining RLS gaps identified in prior audits:
--   * outfit_items INSERT/UPDATE did not verify item_id belongs to the outfit owner
--   * ootd_posts UPDATE did not verify squad membership (kicked users could still edit)
--   * donation_log INSERT did not verify the user owns the item being donated
--
-- Rule being enforced: RLS INSERT/UPDATE policies must validate cross-table
-- ownership, not just the row's own user_id column.

-- ============================================================
-- 1. outfit_items: add cross-user item ownership check
-- ============================================================
-- An outfit owner must not be able to pin another user's item into their
-- outfit. Previous policy (migration 003) only verified outfit ownership.
DROP POLICY IF EXISTS "Users can create own outfit items" ON outfit_items;
DROP POLICY IF EXISTS "Users can update own outfit items" ON outfit_items;

CREATE POLICY "Users can create own outfit items"
  ON outfit_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
        AND outfits.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM items
      WHERE items.id = outfit_items.item_id
        AND items.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own outfit items"
  ON outfit_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
        AND outfits.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM outfits
      WHERE outfits.id = outfit_items.outfit_id
        AND outfits.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM items
      WHERE items.id = outfit_items.item_id
        AND items.user_id = auth.uid()
    )
  );

-- ============================================================
-- 2. ootd_posts: UPDATE must re-check squad membership
-- ============================================================
-- A user who is removed from a squad should lose edit ability on their
-- historical posts in that squad (they can still delete them).
DROP POLICY IF EXISTS "Users can update own posts" ON ootd_posts;

CREATE POLICY "Users can update own posts"
  ON ootd_posts FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM squad_memberships
      WHERE squad_memberships.squad_id = ootd_posts.squad_id
        AND squad_memberships.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM squad_memberships
      WHERE squad_memberships.squad_id = ootd_posts.squad_id
        AND squad_memberships.user_id = auth.uid()
    )
  );

-- ============================================================
-- 3. donation_log: INSERT must verify item ownership
-- ============================================================
-- Prevents logging a donation against someone else's item (which would
-- inflate another user's charitable-value stats).
DROP POLICY IF EXISTS "Users can insert own donations" ON donation_log;

CREATE POLICY "Users can insert own donations"
  ON donation_log FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM items
      WHERE items.id = donation_log.item_id
        AND items.user_id = auth.uid()
    )
  );

-- Migration 026: Engagement count triggers
-- Story 9.4: Auto-update reaction_count and comment_count on ootd_posts

-- Reaction count trigger
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

-- Comment count trigger
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

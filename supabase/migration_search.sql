-- Full-text search function for alumni directory
-- Supports both prefix-ILiKE (autocomplete) and PostgreSQL full-text search
CREATE OR REPLACE FUNCTION search_alumni(
  search_query TEXT DEFAULT '',
  current_profile_id UUID DEFAULT NULL,
  result_limit INT DEFAULT 20,
  result_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  first_name VARCHAR,
  last_name VARCHAR,
  middle_name VARCHAR,
  avatar_url TEXT,
  headline VARCHAR,
  bio TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  available_for_referral BOOLEAN,
  available_for_mentoring BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT p.*
    FROM profiles p
    WHERE (current_profile_id IS NULL OR p.id != current_profile_id)
      AND (
        search_query = '' OR search_query IS NULL
        OR p.first_name ILIKE search_query || '%'
        OR p.last_name ILIKE search_query || '%'
        OR to_tsvector('english',
            coalesce(p.first_name,'') || ' ' ||
            coalesce(p.last_name,'') || ' ' ||
            coalesce(p.headline,'')
          ) @@ plainto_tsquery('english', search_query)
      )
  )
  SELECT
    f.id, f.user_id, f.first_name, f.last_name, f.middle_name,
    f.avatar_url, f.headline, f.bio, f.linkedin_url, f.github_url,
    f.portfolio_url, f.available_for_referral, f.available_for_mentoring,
    COUNT(*) OVER() AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN f.first_name ILIKE search_query || '%' THEN 0
         WHEN f.last_name ILIKE search_query || '%' THEN 1
         ELSE 2
    END,
    f.first_name ASC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

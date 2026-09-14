-- Migration: Ensure artworks, artwork_likes, and artwork_ratings tables exist with RLS policies
-- Supports the public ranked gallery system

CREATE TABLE IF NOT EXISTS "public"."artworks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artist_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "likes_count" INT DEFAULT 0,
    "average_rating" NUMERIC DEFAULT 0,
    "ratings_count" INT DEFAULT 0
);

-- Ensure columns exist if table was created previously without them
ALTER TABLE "public"."artworks"
ADD COLUMN IF NOT EXISTS "likes_count" INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS "average_rating" NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS "ratings_count" INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS "public"."artwork_likes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artwork_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE("artwork_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "public"."artwork_ratings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artwork_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" INT NOT NULL CHECK ("rating" >= 1 AND "rating" <= 5),
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE("artwork_id", "user_id")
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS "idx_artworks_artist_id" ON "public"."artworks" ("artist_id");
CREATE INDEX IF NOT EXISTS "idx_artworks_created_at" ON "public"."artworks" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_artwork_likes_artwork_id" ON "public"."artwork_likes" ("artwork_id");
CREATE INDEX IF NOT EXISTS "idx_artwork_likes_user_id" ON "public"."artwork_likes" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_artwork_ratings_artwork_id" ON "public"."artwork_ratings" ("artwork_id");

-- Enable RLS
ALTER TABLE "public"."artworks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."artwork_likes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."artwork_ratings" ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artworks' AND policyname = 'Artworks are publicly readable') THEN
    CREATE POLICY "Artworks are publicly readable" ON "public"."artworks" FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artwork_likes' AND policyname = 'Artwork likes are publicly readable') THEN
    CREATE POLICY "Artwork likes are publicly readable" ON "public"."artwork_likes" FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artwork_likes' AND policyname = 'Authenticated users can manage likes') THEN
    CREATE POLICY "Authenticated users can manage likes" ON "public"."artwork_likes" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artwork_ratings' AND policyname = 'Artwork ratings are publicly readable') THEN
    CREATE POLICY "Artwork ratings are publicly readable" ON "public"."artwork_ratings" FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artwork_ratings' AND policyname = 'Authenticated users can manage ratings') THEN
    CREATE POLICY "Authenticated users can manage ratings" ON "public"."artwork_ratings" FOR ALL USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

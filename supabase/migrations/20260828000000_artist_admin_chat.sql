-- Create Artwork table
CREATE TABLE IF NOT EXISTS "public"."Artwork" (
    "id" "text" NOT NULL PRIMARY KEY,
    "artistId" "text" NOT NULL REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "title" "text" NOT NULL,
    "description" "text",
    "imageUrl" "text" NOT NULL,
    "price" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);
ALTER TABLE "public"."Artwork" OWNER TO "postgres";

-- Create ChatConnection table
CREATE TABLE IF NOT EXISTS "public"."ChatConnection" (
    "id" "text" NOT NULL PRIMARY KEY,
    "clientId" "text" NOT NULL REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "artistId" "text" NOT NULL REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "chatEnabled" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    UNIQUE("clientId", "artistId")
);
ALTER TABLE "public"."ChatConnection" OWNER TO "postgres";

-- Set up RLS for Artwork
ALTER TABLE "public"."Artwork" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artworks are visible to everyone" ON "public"."Artwork" FOR SELECT USING (true);
CREATE POLICY "Artists can insert their own artworks" ON "public"."Artwork" FOR INSERT WITH CHECK (auth.uid()::text = "artistId");
CREATE POLICY "Artists can update their own artworks" ON "public"."Artwork" FOR UPDATE USING (auth.uid()::text = "artistId") WITH CHECK (auth.uid()::text = "artistId");
CREATE POLICY "Artists can delete their own artworks" ON "public"."Artwork" FOR DELETE USING (auth.uid()::text = "artistId");
CREATE POLICY "Admins have full access to artworks" ON "public"."Artwork" USING (
  EXISTS (
    SELECT 1 FROM "public"."User" WHERE "id" = auth.uid()::text AND "role" = 'ADMIN'
  )
);

-- Set up RLS for ChatConnection
ALTER TABLE "public"."ChatConnection" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own chat connections" ON "public"."ChatConnection" FOR SELECT USING (
    auth.uid()::text = "clientId" OR auth.uid()::text = "artistId" OR
    EXISTS (SELECT 1 FROM "public"."User" WHERE "id" = auth.uid()::text AND "role" = 'ADMIN')
);
CREATE POLICY "Users can insert chat connections involving them" ON "public"."ChatConnection" FOR INSERT WITH CHECK (
    auth.uid()::text = "clientId" OR auth.uid()::text = "artistId"
);
-- Only admins can update ChatConnections (specifically to toggle chatEnabled)
CREATE POLICY "Admins can update chat connections" ON "public"."ChatConnection" FOR UPDATE USING (
    EXISTS (SELECT 1 FROM "public"."User" WHERE "id" = auth.uid()::text AND "role" = 'ADMIN')
);
CREATE POLICY "Admins can delete chat connections" ON "public"."ChatConnection" FOR DELETE USING (
    EXISTS (SELECT 1 FROM "public"."User" WHERE "id" = auth.uid()::text AND "role" = 'ADMIN')
);

-- Add 'artworks' bucket to storage if using Supabase Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('artworks', 'artworks', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'artworks' bucket
CREATE POLICY "Artworks images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'artworks');
CREATE POLICY "Anyone can upload artworks" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'artworks');
CREATE POLICY "Users can update their own artworks" ON storage.objects FOR UPDATE USING (bucket_id = 'artworks' AND auth.uid() = owner);
CREATE POLICY "Users can delete their own artworks" ON storage.objects FOR DELETE USING (bucket_id = 'artworks' AND auth.uid() = owner);

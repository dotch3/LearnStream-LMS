-- CreateTable: junction table for track-video many-to-many
CREATE TABLE "track_videos" (
    "trackId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "order"   INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "track_videos_pkey" PRIMARY KEY ("trackId","videoId")
);

-- AddForeignKey
ALTER TABLE "track_videos" ADD CONSTRAINT "track_videos_trackId_fkey"
    FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "track_videos" ADD CONSTRAINT "track_videos_videoId_fkey"
    FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: copy trackId + order from videos into junction
INSERT INTO "track_videos" ("trackId", "videoId", "order")
SELECT "trackId", "id", "order" FROM "videos"
WHERE "trackId" IS NOT NULL;

-- Drop old columns from videos
ALTER TABLE "videos" DROP COLUMN IF EXISTS "trackId";
ALTER TABLE "videos" DROP COLUMN IF EXISTS "order";

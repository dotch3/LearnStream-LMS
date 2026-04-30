-- CreateEnum
CREATE TYPE "TrackVisibility" AS ENUM ('PUBLIC', 'LINK_ONLY', 'DRAFT');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ENROLLMENT_APPROVED', 'ENROLLMENT_DENIED', 'NEW_ENROLLMENT_REQUEST');

-- Add visibility column to tracks (default PUBLIC for existing active, backfill DRAFT for inactive)
ALTER TABLE "tracks" ADD COLUMN "visibility" "TrackVisibility" NOT NULL DEFAULT 'PUBLIC';
UPDATE "tracks" SET "visibility" = 'DRAFT' WHERE "isActive" = false;
ALTER TABLE "tracks" DROP COLUMN "isActive";

-- CreateTable enrollments
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "enrollments_userId_trackId_key" ON "enrollments"("userId", "trackId");

ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable enrollment_codes
CREATE TABLE "enrollment_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollment_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "enrollment_codes_code_key" ON "enrollment_codes"("code");

-- CreateTable enrollment_code_tracks
CREATE TABLE "enrollment_code_tracks" (
    "codeId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,

    CONSTRAINT "enrollment_code_tracks_pkey" PRIMARY KEY ("codeId", "trackId")
);

ALTER TABLE "enrollment_code_tracks" ADD CONSTRAINT "enrollment_code_tracks_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "enrollment_codes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "enrollment_code_tracks" ADD CONSTRAINT "enrollment_code_tracks_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable notifications
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Admin-authored literature articles (replaces the former live PubMed feed).
-- A flat scalar table mirroring AtlasEntry conventions: cuid id, createdAt, and a
-- createdAt index for the newest-first public list. No backfill — PubMed results
-- were never persisted, so this only creates an empty table.

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "url" TEXT,
    "source" TEXT,
    "publishedAt" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Article_createdAt_idx" ON "Article"("createdAt");

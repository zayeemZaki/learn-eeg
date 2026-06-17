-- CreateTable
CREATE TABLE "QuestionImage" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionImage_questionId_idx" ON "QuestionImage"("questionId");

-- AddForeignKey
ALTER TABLE "QuestionImage" ADD CONSTRAINT "QuestionImage_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: preserve existing single-image data. Every Question with a non-empty
-- imageUrl becomes its first QuestionImage (position 0). The id only needs to be
-- unique text; gen_random_uuid()::text is fine here (no cuid required for DB rows).
-- Question.imageUrl is intentionally KEPT (deprecated mirror) and is not dropped
-- in this migration — a later pass removes the column once nothing reads it.
INSERT INTO "QuestionImage" ("id", "questionId", "url", "position", "createdAt")
SELECT gen_random_uuid()::text, "id", "imageUrl", 0, CURRENT_TIMESTAMP
FROM "Question"
WHERE "imageUrl" IS NOT NULL AND "imageUrl" <> '';

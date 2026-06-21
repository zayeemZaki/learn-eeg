-- Add a stable, human-friendly ordinal to Question, surfaced as "Question #N".
--
-- This mirrors what Prisma emits for `number Int @unique @default(autoincrement())`
-- (a SERIAL-style owned sequence), but in an order that lets us deterministically
-- backfill existing rows 1..N by createdAt before the sequence takes over. Doing
-- it by hand avoids the default-sequence assigning arbitrary numbers to old rows.
--
-- The number is purely an ordinal: it never shifts when other questions are added
-- or deleted, exposes nothing sensitive, and is unrelated to the isCorrect boundary.

-- 1. Add the column nullable first so existing rows survive the backfill below.
ALTER TABLE "Question" ADD COLUMN "number" INTEGER;

-- 2. Backfill: number existing questions 1..N ordered by createdAt (id as a stable
--    tiebreaker for rows sharing a createdAt), so the current bank gets 1..N
--    deterministically.
WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "Question"
)
UPDATE "Question" q
SET "number" = ordered.rn
FROM ordered
WHERE q."id" = ordered."id";

-- 3. Lock it down: every row now has a value, so enforce NOT NULL.
ALTER TABLE "Question" ALTER COLUMN "number" SET NOT NULL;

-- 4. Owned sequence (matches Prisma's autoincrement representation). Start it after
--    the highest backfilled number so new questions continue 1..N → N+1, N+2, …
--    (start at 1 when the table is empty).
CREATE SEQUENCE "Question_number_seq" AS INTEGER OWNED BY "Question"."number";
SELECT setval(
  '"Question_number_seq"',
  COALESCE((SELECT MAX("number") FROM "Question"), 0) + 1,
  false
);
ALTER TABLE "Question" ALTER COLUMN "number" SET DEFAULT nextval('"Question_number_seq"');

-- 5. Unique constraint on the ordinal.
CREATE UNIQUE INDEX "Question_number_key" ON "Question"("number");

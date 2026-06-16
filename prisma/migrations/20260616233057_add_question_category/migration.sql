-- CreateEnum
CREATE TYPE "QuestionCategory" AS ENUM ('NORMAL_VARIANT', 'EPILEPTIFORM', 'SEIZURE', 'ARTIFACT', 'ENCEPHALOPATHY', 'FOCAL', 'OTHER');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "category" "QuestionCategory" NOT NULL DEFAULT 'OTHER';

-- CreateIndex
CREATE INDEX "Question_category_idx" ON "Question"("category");

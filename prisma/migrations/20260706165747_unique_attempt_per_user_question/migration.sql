-- CreateIndex
CREATE UNIQUE INDEX "Attempt_userId_questionId_key" ON "Attempt"("userId", "questionId");

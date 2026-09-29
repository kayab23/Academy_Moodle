-- AlterTable
ALTER TABLE "sso_tokens" ADD COLUMN "company_override_id" TEXT;

-- CreateIndex
CREATE INDEX "sso_tokens_company_override_id_idx" ON "sso_tokens"("company_override_id");

-- AddForeignKey
ALTER TABLE "sso_tokens" ADD CONSTRAINT "sso_tokens_company_override_id_fkey" FOREIGN KEY ("company_override_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

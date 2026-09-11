-- CreateTable
CREATE TABLE "sso_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sso_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sso_tokens_token_hash_key" ON "sso_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "sso_tokens_user_id_idx" ON "sso_tokens"("user_id");

-- CreateIndex
CREATE INDEX "sso_tokens_expires_at_idx" ON "sso_tokens"("expires_at");

-- AddForeignKey
ALTER TABLE "sso_tokens" ADD CONSTRAINT "sso_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `target_field` on the `contract_comments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX IF EXISTS "idx_contract_comments_target_field";

-- CreateTable
CREATE TABLE "comment_field_references" (
    "id" SERIAL NOT NULL,
    "comment_id" INTEGER NOT NULL,
    "field_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_field_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comment_field_references_field_name_idx" ON "comment_field_references"("field_name");

-- CreateIndex
CREATE UNIQUE INDEX "comment_field_references_comment_id_field_name_key" ON "comment_field_references"("comment_id", "field_name");

-- AddForeignKey
ALTER TABLE "comment_field_references" ADD CONSTRAINT "comment_field_references_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "contract_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing CSV data before dropping the column
INSERT INTO "comment_field_references" ("comment_id", "field_name")
SELECT c.id, trim(unnest(string_to_array(c.target_field, ',')))
FROM "contract_comments" c
WHERE c.target_field IS NOT NULL AND c.target_field != '';

-- AlterTable
ALTER TABLE "contract_comments" DROP COLUMN "target_field";

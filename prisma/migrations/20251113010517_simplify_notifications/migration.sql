/*
  Warnings:

  - You are about to drop the column `related_comment_id` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `related_event_id` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `notifications` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "notifications_created_at_idx";

-- DropIndex
DROP INDEX "notifications_read_idx";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "related_comment_id",
DROP COLUMN "related_event_id",
DROP COLUMN "updated_at";

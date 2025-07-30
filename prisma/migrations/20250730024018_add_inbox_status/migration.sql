-- CreateEnum
CREATE TYPE "public"."InboxItemStatus" AS ENUM ('ACTIVE', 'READ', 'ARCHIVED', 'DELETED');

-- AlterTable
ALTER TABLE "public"."inbox_items" ADD COLUMN     "status" "public"."InboxItemStatus" NOT NULL DEFAULT 'ACTIVE';

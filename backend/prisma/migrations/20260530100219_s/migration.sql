/*
  Warnings:

  - The values [BLOCKED] on the enum `TaskStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `blockedReason` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `completedWorkDescription` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `completionPercentage` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `isReviewSubmitted` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `screenshotUrl` on the `Task` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TaskStatus_new" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'ON_HOLD');
ALTER TABLE "public"."Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "status" TYPE "TaskStatus_new" USING ("status"::text::"TaskStatus_new");
ALTER TABLE "TaskUpdate" ALTER COLUMN "statusBefore" TYPE "TaskStatus_new" USING ("statusBefore"::text::"TaskStatus_new");
ALTER TABLE "TaskUpdate" ALTER COLUMN "statusAfter" TYPE "TaskStatus_new" USING ("statusAfter"::text::"TaskStatus_new");
ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
ALTER TYPE "TaskStatus_new" RENAME TO "TaskStatus";
DROP TYPE "public"."TaskStatus_old";
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_createdById_fkey";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "blockedReason",
DROP COLUMN "completedWorkDescription",
DROP COLUMN "completionPercentage",
DROP COLUMN "createdById",
DROP COLUMN "isReviewSubmitted",
DROP COLUMN "screenshotUrl";

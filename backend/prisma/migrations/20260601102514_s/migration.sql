/*
  Warnings:

  - You are about to drop the column `assignedByAdmin` on the `TaskProject` table. All the data in the column will be lost.
  - You are about to drop the column `editedByAdmin` on the `TaskProject` table. All the data in the column will be lost.
  - You are about to drop the column `originalTaskDescription` on the `TaskProject` table. All the data in the column will be lost.
  - You are about to drop the `ProjectAllocation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProjectAllocation" DROP CONSTRAINT "ProjectAllocation_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectAllocation" DROP CONSTRAINT "ProjectAllocation_projectId_fkey";

-- AlterTable
ALTER TABLE "TaskProject" DROP COLUMN "assignedByAdmin",
DROP COLUMN "editedByAdmin",
DROP COLUMN "originalTaskDescription";

-- DropTable
DROP TABLE "ProjectAllocation";

-- DropEnum
DROP TYPE "AllocationStatus";

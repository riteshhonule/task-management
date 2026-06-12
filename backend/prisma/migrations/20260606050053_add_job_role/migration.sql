-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('NEW_TASK', 'CARRY_FORWARD_TASK', 'ADMIN_ASSIGNED_TASK', 'EMPLOYEE_ASSIGNED_TASK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "TaskStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "TaskStatus" ADD VALUE 'REVIEW_PENDING';
ALTER TYPE "TaskStatus" ADD VALUE 'APPROVED';
ALTER TYPE "TaskStatus" ADD VALUE 'REVISION_REQUIRED';

-- AlterTable
ALTER TABLE "TaskProject" ADD COLUMN     "adminComment" TEXT,
ADD COLUMN     "adminCommentUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "adminCommentUpdatedById" INTEGER,
ADD COLUMN     "approvalComment" TEXT,
ADD COLUMN     "approvedById" INTEGER,
ADD COLUMN     "approvedDate" TIMESTAMP(3),
ADD COLUMN     "assignedByUserId" INTEGER,
ADD COLUMN     "assignedToUserId" INTEGER,
ADD COLUMN     "assignmentType" TEXT,
ADD COLUMN     "blockers" TEXT,
ADD COLUMN     "customJobRole" TEXT,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "estimatedEffort" DOUBLE PRECISION,
ADD COLUMN     "jobRoleType" TEXT,
ADD COLUMN     "proofRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewStatus" TEXT DEFAULT 'PENDING',
ADD COLUMN     "startTime" TEXT,
ADD COLUMN     "taskType" "TaskType" NOT NULL DEFAULT 'NEW_TASK',
ADD COLUMN     "timeSpent" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "jobRole" TEXT;

-- CreateTable
CREATE TABLE "TaskSubmission" (
    "id" SERIAL NOT NULL,
    "taskProjectId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeSpent" DOUBLE PRECISION,
    "blockers" TEXT,
    "notes" TEXT,

    CONSTRAINT "TaskSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskProof" (
    "id" SERIAL NOT NULL,
    "taskSubmissionId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskRevision" (
    "id" SERIAL NOT NULL,
    "taskSubmissionId" INTEGER NOT NULL,
    "reviewerId" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskApproval" (
    "id" SERIAL NOT NULL,
    "taskSubmissionId" INTEGER NOT NULL,
    "reviewerId" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTimeline" (
    "id" SERIAL NOT NULL,
    "taskProjectId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "performedById" INTEGER NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTimeline_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TaskProject" ADD CONSTRAINT "TaskProject_adminCommentUpdatedById_fkey" FOREIGN KEY ("adminCommentUpdatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskProject" ADD CONSTRAINT "TaskProject_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskProject" ADD CONSTRAINT "TaskProject_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskProject" ADD CONSTRAINT "TaskProject_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSubmission" ADD CONSTRAINT "TaskSubmission_taskProjectId_fkey" FOREIGN KEY ("taskProjectId") REFERENCES "TaskProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSubmission" ADD CONSTRAINT "TaskSubmission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskProof" ADD CONSTRAINT "TaskProof_taskSubmissionId_fkey" FOREIGN KEY ("taskSubmissionId") REFERENCES "TaskSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRevision" ADD CONSTRAINT "TaskRevision_taskSubmissionId_fkey" FOREIGN KEY ("taskSubmissionId") REFERENCES "TaskSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRevision" ADD CONSTRAINT "TaskRevision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskApproval" ADD CONSTRAINT "TaskApproval_taskSubmissionId_fkey" FOREIGN KEY ("taskSubmissionId") REFERENCES "TaskSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskApproval" ADD CONSTRAINT "TaskApproval_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTimeline" ADD CONSTRAINT "TaskTimeline_taskProjectId_fkey" FOREIGN KEY ("taskProjectId") REFERENCES "TaskProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTimeline" ADD CONSTRAINT "TaskTimeline_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

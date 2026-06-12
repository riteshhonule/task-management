-- AlterTable
ALTER TABLE "Leave" ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "leaveType" TEXT NOT NULL DEFAULT 'Casual Leave',
ALTER COLUMN "status" SET DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "seenAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TaskCarryForward" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "isDeadlineCarryForward" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCarryForward_pkey" PRIMARY KEY ("id")
);

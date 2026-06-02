-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "isDelivered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "relatedTaskId" INTEGER,
ADD COLUMN     "senderId" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SENT';

-- AlterTable
ALTER TABLE "TaskProject" ADD COLUMN     "acceptanceStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "rejectionReason" TEXT;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

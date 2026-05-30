-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isEveryone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recipientIds" INTEGER[];

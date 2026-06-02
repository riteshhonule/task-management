-- AlterTable
ALTER TABLE "TaskProject" ADD COLUMN     "editedByAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalTaskDescription" TEXT;

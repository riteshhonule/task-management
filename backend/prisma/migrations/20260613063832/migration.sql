-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "expectedEndDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TaskProject" ADD COLUMN     "expectedEndDate" TIMESTAMP(3);

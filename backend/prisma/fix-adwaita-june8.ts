import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.taskProject.update({
    where: { id: 82 },
    data: {
      status: 'COMPLETED',
      completionPercentage: 100,
      reviewStatus: 'APPROVED',
    }
  });
  const verify = await prisma.taskProject.findUnique({ where: { id: 82 }, include: { project: true } });
  console.log(`✅ Updated: id=${verify?.id}, project="${verify?.project?.name}", status=${verify?.status}, completion=${verify?.completionPercentage}%`);
  await prisma.$disconnect();
}
main().catch(console.error);

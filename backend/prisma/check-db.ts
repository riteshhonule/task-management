import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const incompleteTasks = await prisma.task.findMany({
    where: {
      employeeId: 3,
      deletedAt: null,
      startDate: { lt: startOfToday },
      projects: { some: { status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.DELAYED] } } },
      carryForwardedTo: null,
    },
    include: { projects: { include: { project: true } } },
  });

  console.log('checkCarryForward query results:', JSON.stringify(incompleteTasks, null, 2));
}

main().finally(() => prisma.$disconnect());

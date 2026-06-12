import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany({
    where: {
      startDate: {
        gte: new Date('2026-06-01T00:00:00Z'),
        lte: new Date('2026-06-10T23:59:59Z'),
      },
    },
    include: {
      employee: {
        select: {
          name: true,
          email: true,
        }
      },
      projects: {
        include: {
          project: true,
        }
      }
    },
    orderBy: {
      startDate: 'asc',
    }
  });
  console.log(JSON.stringify(tasks.map(t => ({
    id: t.id,
    employee: t.employee.name,
    startDate: t.startDate.toISOString(),
    expectedEndDate: t.expectedEndDate?.toISOString(),
    projects: t.projects.map(p => ({
      id: p.id,
      projectName: p.project.name,
      taskDescription: p.taskDescription,
      status: p.status,
    }))
  })), null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

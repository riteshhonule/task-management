const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Users in database:', users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));

  const tasks = await prisma.task.findMany({
    include: {
      employee: { select: { name: true } },
      projects: { include: { project: true } }
    }
  });
  console.log('All Tasks:', JSON.stringify(tasks, null, 2));

  const carryForwards = await prisma.taskCarryForward.findMany();
  console.log('All Carry Forwards:', carryForwards);
}

main().finally(() => prisma.$disconnect());

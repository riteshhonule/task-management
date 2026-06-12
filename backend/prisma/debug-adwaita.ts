import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const adwaita = await prisma.user.findFirst({ where: { name: { contains: 'Adwaita', mode: 'insensitive' } } });
  if (!adwaita) { console.log('not found'); return; }
  console.log('Adwaita id=', adwaita.id);
  const tasks = await prisma.task.findMany({
    where: { employeeId: adwaita.id },
    include: { projects: { include: { project: true } } },
    orderBy: { startDate: 'desc' }
  });
  tasks.slice(0, 6).forEach(t => {
    console.log('Task id=' + t.id + ' startDate=' + t.startDate.toISOString());
    t.projects.forEach(p => console.log('  proj=' + p.project?.name + ' status=' + p.status + ' id=' + p.id + ' deletedAt=' + p.deletedAt));
  });
  await prisma.$disconnect();
}
main().catch(console.error);

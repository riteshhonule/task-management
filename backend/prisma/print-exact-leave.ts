import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const leaves = await prisma.leave.findMany({
    include: {
      employee: {
        select: { name: true, email: true }
      }
    }
  });

  for (const l of leaves) {
    console.log(`Leave ID: ${l.id}`);
    console.log(`Employee: ${l.employee.name}`);
    console.log(`startDate (Raw Date):`, l.startDate);
    console.log(`startDate (ISO):`, l.startDate.toISOString());
    console.log(`endDate (Raw Date):`, l.endDate);
    console.log(`endDate (ISO):`, l.endDate.toISOString());
    console.log('---');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

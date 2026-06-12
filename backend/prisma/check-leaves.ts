import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const leaves = await prisma.leave.findMany({
    include: {
      employee: {
        select: {
          name: true,
          email: true,
        }
      }
    }
  });
  console.log(JSON.stringify(leaves, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

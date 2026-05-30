import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default projects
  const projects = [
    { name: 'SHG', description: 'Self Help Group Portal' },
    { name: 'Transporter', description: 'Logistics and Transporter Management' },
    { name: 'GMU HUB', description: 'GMU Hub System' },
    { name: 'ERP', description: 'Enterprise Resource Planning' },
    { name: 'CRM', description: 'Customer Relationship Management' },
    { name: 'IOT', description: 'Internet of Things Integrations' },
  ];

  for (const proj of projects) {
    await prisma.project.upsert({
      where: { name: proj.name },
      update: {},
      create: {
        name: proj.name,
        description: proj.description,
        isArchived: false,
      },
    });
  }
  console.log('Projects seeded successfully.');

  // Create default admin password hash
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@12345', salt);

  // Seed Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      name: 'System Admin',
      password: passwordHash,
      role: Role.SUPER_ADMIN,
    },
  });
  console.log(`Super Admin seeded successfully: ${adminUser.email}`);

  // Seed standard Admin (for testing)
  const regularAdminHash = await bcrypt.hash('Admin@12345', salt);
  await prisma.user.upsert({
    where: { email: 'regularadmin@company.com' },
    update: {},
    create: {
      email: 'regularadmin@company.com',
      name: 'Abhijeet Sir',
      password: regularAdminHash,
      role: Role.ADMIN,
    },
  });
  console.log('Regular Admin seeded successfully.');

  // Seed default Employee
  const employeeHash = await bcrypt.hash('Employee@12345', salt);
  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@company.com' },
    update: {},
    create: {
      email: 'employee@company.com',
      name: 'John Doe',
      password: employeeHash,
      role: Role.EMPLOYEE,
    },
  });
  console.log(`Employee seeded successfully: ${employeeUser.email}`);
  
  console.log('Database seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

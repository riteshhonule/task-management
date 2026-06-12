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
    { name: 'Task Management System', description: 'Task Management System' },
    { name: 'Sevastu', description: 'Sevastu Application' }
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
  const passwordHash = await bcrypt.hash('superadmin@12345', salt);

  // Seed Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'superadmin@gmark.com' },
    update: {
      password: passwordHash,
    },
    create: {
      email: 'superadmin@gmark.com',
      name: 'Super Admin',
      password: passwordHash,
      role: Role.SUPER_ADMIN,
    },
  });
  console.log(`Super Admin seeded successfully: ${adminUser.email}`);

  // Seed standard Admin (for testing)
  const regularAdminHash = await bcrypt.hash('Admin@12345', salt);
  await prisma.user.upsert({
    where: { email: 'admin@gmark.com' },
    update: {
      password: regularAdminHash,
    },
    create: {
      email: 'admin@gmark.com',
      name: 'Admin',
      password: regularAdminHash,
      role: Role.ADMIN,
    },
  });
  console.log('Admin seeded successfully.');

  // // Seed default Employee
  // const employeeHash = await bcrypt.hash('Employee@12345', salt);
  // const employeeUser = await prisma.user.upsert({
  //   where: { email: 'employee@company.com' },
  //   update: {},
  //   create: {
  //     email: 'employee@company.com',
  //     name: 'John Doe',
  //     password: employeeHash,
  //     role: Role.EMPLOYEE,
  //   },
  // });
  // console.log(`Employee seeded successfully: ${employeeUser.email}`);

  // // Seed second Employee (Adwaita)
  // const adwaitaHash = await bcrypt.hash('Adwaita@12345', salt);
  // const adwaitaUser = await prisma.user.upsert({
  //   where: { email: 'adwaita@company.com' },
  //   update: {},
  //   create: {
  //     email: 'adwaita@company.com',
  //     name: 'Adwaita',
  //     password: adwaitaHash,
  //     role: Role.EMPLOYEE,
  //   },
  // });
  // console.log(`Employee seeded successfully: ${adwaitaUser.email}`);

  // Fetch all projects for random assignment
  const dbProjects = await prisma.project.findMany();

  // // Seed Tasks for the last 5 days
  // console.log('Seeding dummy tasks for the last 5 days...');
  // const employees = [employeeUser, adwaitaUser];

  // for (let i = 0; i < 5; i++) {
  //   const targetDate = new Date();
  //   targetDate.setDate(targetDate.getDate() - i);
  //   targetDate.setHours(0, 0, 0, 0); // normalize date

  //   for (const emp of employees) {
  //     // Check if task already exists for this date and employee to avoid unique constraints if any
  //     const existingTask = await prisma.task.findFirst({
  //       where: {
  //         employeeId: emp.id,
  //         startDate: targetDate,
  //       }
  //     });

  //     if (!existingTask) {
  //       const proj = dbProjects[Math.floor(Math.random() * dbProjects.length)];

  //       // Vary statuses based on how old the task is
  //       let status = 'COMPLETED';
  //       let completionPercentage = 100;
  //       let completedWorkDescription = 'Finished all assigned modules successfully.';
  //       let delayReason = null;
  //       let blockedReason = null;

  //       if (i === 0) {
  //         status = 'IN_PROGRESS';
  //         completionPercentage = 45;
  //         completedWorkDescription = null;
  //       } else if (i === 1 && emp.name === 'Adwaita') {
  //         status = 'DELAYED';
  //         completionPercentage = 80;
  //         delayReason = 'Waiting on client approval for UI designs.';
  //         completedWorkDescription = 'Completed API integration, waiting for UI.';
  //       } else if (i === 2 && emp.name === 'John Doe') {
  //         status = 'BLOCKED';
  //         completionPercentage = 20;
  //         blockedReason = 'Server access revoked, raised IT ticket.';
  //         completedWorkDescription = null;
  //       }

  //       const expectedEnd = new Date(targetDate);
  //       expectedEnd.setHours(18, 0, 0, 0); // 6 PM

  //       await prisma.task.create({
  //         data: {
  //           employeeId: emp.id,
  //           startDate: targetDate,
  //           startTime: '10:00 AM',
  //           expectedEndDate: expectedEnd,
  //           projects: {
  //             create: [
  //               {
  //                 projectId: proj.id,
  //                 taskDescription: `Work on ${proj.name} phase ${i + 1} deliverables.`,
  //                 status: status as any,
  //                 completionPercentage,
  //                 completedWorkDescription,
  //                 delayReason,
  //                 blockedReason,
  //               }
  //             ]
  //           }
  //         }
  //       });
  //     }
  //   }
  // }
  // console.log('Dummy tasks seeded successfully.');

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

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting employee seed...');

  const employees = [
    {
      name: 'Adwaita Shinde',
      mobileNumber: '8459722082',
      email: 'sadwaita2001@gmail.com',
      password: 'Adwaita@12345',
      role: Role.EMPLOYEE,
    },
    {
      name: 'Vallabh Ghatge',
      mobileNumber: '7057914950',
      email: 'ghatgevallabh03@gmail.com',
      password: 'Vallabh@12345',
      role: Role.EMPLOYEE,
    },
    {
      name: 'Mahadev Patil',
      mobileNumber: '8484830180',
      email: 'mahadev.smp1@gmail.com',
      password: 'Mahadev@12345',
      role: Role.EMPLOYEE,
    },
    {
      name: 'Mahendra Powar',
      mobileNumber: '9860157649',
      email: 'mahendrapowar07@gmail.com',
      password: 'Mahendra@12345',
      role: Role.EMPLOYEE,
    },
    {
      name: 'Vaishnavi Chandilkar',
      mobileNumber: '7019387579',
      email: 'vaishnavichandilkar26@gmail.com',
      password: 'Vaishnavi@12345',
      role: Role.EMPLOYEE,
    },
    {
      name: 'Shridhar Patil',
      mobileNumber: '8494833669',
      email: 'shridharpatil723@gmail.com',
      password: 'Shridhar@12345',
      role: Role.EMPLOYEE,
    },
    {
      name: 'Ritesh Honule',
      mobileNumber: '8861120023',
      email: 'riteshhonule@gmail.com',
      password: 'Ritesh@12345',
      role: Role.EMPLOYEE,
    },
  ];

  let addedCount = 0;

  for (const emp of employees) {
    // Check if the employee already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: emp.email },
    });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(emp.password, salt);

    if (existingUser) {
      console.log(`Employee Already Exists: ${emp.name} (${emp.email})`);
    } else {
      console.log(`Employee Created: ${emp.name} (${emp.email})`);
      addedCount++;
    }

    // Upsert the employee record
    await prisma.user.upsert({
      where: { email: emp.email },
      update: {
        name: emp.name,
        mobileNumber: emp.mobileNumber,
        password: passwordHash,
        role: emp.role,
      },
      create: {
        email: emp.email,
        name: emp.name,
        mobileNumber: emp.mobileNumber,
        password: passwordHash,
        role: emp.role,
      },
    });
  }

  console.log(`Total Employees Added: ${addedCount}`);
  console.log('Employee seeding finished.');
}

main()
  .catch((e) => {
    console.error('Error seeding employees:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

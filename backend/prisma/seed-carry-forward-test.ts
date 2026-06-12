import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const isRollback = process.argv.includes('--rollback') || process.argv.includes('--delete');

  if (isRollback) {
    console.log('Rolling back carry forward test data...');
  } else {
    console.log('Seeding carry forward test data...');
  }

  const employee = await prisma.user.findUnique({
    where: { email: 'sadwaita2001@gmail.com' },
  });

  if (!employee) {
    throw new Error('Employee "Adwaita Shinde" with email "sadwaita2001@gmail.com" not found. Please seed employees first.');
  }

  const project = await prisma.project.findUnique({
    where: { name: 'SHG' },
  });

  if (!project) {
    throw new Error('Project "SHG" not found. Please run the main seed first.');
  }

  // 1. Clean up existing test tasks to make it idempotent
  const testDates = [
    new Date('2026-06-02T00:00:00.000Z'),
    new Date('2026-06-03T00:00:00.000Z'),
    new Date('2026-06-04T00:00:00.000Z')
  ];

  await prisma.taskCarryForward.deleteMany({
    where: {
      employeeId: employee.id,
      fromDate: { in: testDates }
    }
  });

  // Fetch task IDs on those dates to delete updates and project links first
  const tasksToDelete = await prisma.task.findMany({
    where: {
      employeeId: employee.id,
      startDate: { in: testDates }
    },
    select: { id: true }
  });
  const taskIds = tasksToDelete.map(t => t.id);

  if (taskIds.length > 0) {
    // Delete TaskUpdates
    const taskProjects = await prisma.taskProject.findMany({
      where: { taskId: { in: taskIds } },
      select: { id: true }
    });
    const taskProjectIds = taskProjects.map(tp => tp.id);

    if (taskProjectIds.length > 0) {
      await prisma.taskUpdate.deleteMany({
        where: { taskProjectId: { in: taskProjectIds } }
      });
    }

    // Delete TaskProjects
    await prisma.taskProject.deleteMany({
      where: { taskId: { in: taskIds } }
    });

    // Delete Tasks
    await prisma.task.deleteMany({
      where: { id: { in: taskIds } }
    });
  }

  console.log('Cleaned up existing test tasks.');

  if (isRollback) {
    console.log('Rollback finished successfully.');
    return;
  }

  // 2. Create Day 1 Task (02 June 2026)
  const day1Task = await prisma.task.create({
    data: {
      employeeId: employee.id,
      startDate: new Date('2026-06-02T00:00:00.000Z'),
      startTime: '09:00 AM',
      expectedEndDate: new Date('2026-06-02T18:00:00.000Z'),
      projects: {
        create: [
          {
            projectId: project.id,
            taskDescription: 'Review complete SHG application flow.\nCheck UI alignment and responsiveness.\nVerify navigation and screen transitions.',
            status: TaskStatus.DELAYED, // Updated to DELAYED on carry-forward
            completionPercentage: 35,
            completedWorkDescription: 'Checked application flow.\nReviewed UI screens.\nVerified navigation.',
            notes: 'Carried forward to next day.',
            delayReason: 'Initial design flow review took longer than expected due to complex screens.',
            acceptanceStatus: 'ACCEPTED',
          }
        ]
      }
    }
  });

  // 3. Create Day 2 Task (03 June 2026)
  const day2Task = await prisma.task.create({
    data: {
      employeeId: employee.id,
      startDate: new Date('2026-06-03T00:00:00.000Z'),
      startTime: '09:00 AM',
      expectedEndDate: new Date('2026-06-03T18:00:00.000Z'),
      carryForwardedFromId: day1Task.id,
      projects: {
        create: [
          {
            projectId: project.id,
            taskDescription: 'Review complete SHG application flow.\nCheck UI alignment and responsiveness.\nVerify navigation and screen transitions.',
            status: TaskStatus.IN_PROGRESS, // Unfinished triggers carry forward on 04 June!
            completionPercentage: 50,
            completedWorkDescription: 'Continued UI review.\nVerified additional screens.',
            notes: 'Carried forward from previous day.',
            acceptanceStatus: 'ACCEPTED',
          }
        ]
      }
    }
  });

  // 4. Create the TaskCarryForward record for the Day 1 -> Day 2 transition
  await prisma.taskCarryForward.create({
    data: {
      taskId: day1Task.id,
      employeeId: employee.id,
      fromDate: day1Task.startDate,
      toDate: day2Task.startDate,
      reason: 'Initial design flow review took longer than expected due to complex screens.',
      isDeadlineCarryForward: true,
    }
  });

  console.log('Seeded carry forward test tasks successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

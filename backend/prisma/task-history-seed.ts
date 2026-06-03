import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';

const prisma = new PrismaClient();

const seedData = [
  {
    email: 'shridharpatil723@gmail.com',
    tasks: [
      {
        date: '2026-06-01',
        title: 'GitHub Issue Resolution',
        projects: ['SHG', 'Transporter'],
        description: `Investigated and resolved GitHub-related issues in the SHG and Transporter projects.
* Fixed repository synchronization issues.
* Fixed code integration issues.
* Verified project stability.
* Coordinated with team members.
* Ensured smooth development workflow.`,
        status: TaskStatus.COMPLETED,
        completionPercentage: 100,
        completedWorkDescription: 'GitHub issues identified and resolved successfully for SHG and Transporter projects.',
        delayReason: null,
      },
      {
        date: '2026-06-02',
        title: 'Sevastu Testing & APK Build Support',
        projects: ['SHG', 'Transporter'],
        description: `* Conducted Sevastu application testing.
* Verified workflows and functionality.
* Assisted Mahendra with APK build issues.
* Supported build troubleshooting.
* Validated deployment process.`,
        status: TaskStatus.COMPLETED,
        completionPercentage: 100,
        completedWorkDescription: 'Testing completed and APK build issues resolved.',
        delayReason: null,
      }
    ]
  },
  {
    email: 'ghatgevallabh03@gmail.com',
    tasks: [
      {
        date: '2026-06-01',
        title: 'SHG UI Improvements',
        projects: ['SHG'],
        description: `* Screen redesign improvements.
* Navigation updates.
* Responsive layout improvements.
* Styling enhancements.
* Form validation implementation.
* Error handling improvements.
* Notifications implementation.
* Swipe action support.
* Order flow optimization.`,
        status: TaskStatus.COMPLETED,
        completionPercentage: 100,
        completedWorkDescription: 'UI improvements and workflow enhancements completed.',
        delayReason: null,
      },
      {
        date: '2026-06-02',
        title: 'Transporter APK Build Support',
        projects: ['Transporter'],
        description: `* Assisted Mahendra with APK generation.
* Guided Transporter APK setup.
* Build troubleshooting support.`,
        status: TaskStatus.COMPLETED,
        completionPercentage: 100,
        completedWorkDescription: 'Transporter APK successfully generated.',
        delayReason: null,
      }
    ]
  },
  {
    email: 'mahendrapowar07@gmail.com',
    tasks: [
      {
        date: '2026-06-01',
        title: 'Order Management Integration',
        projects: ['Transporter'],
        description: `* Integrated frontend and backend.
* Connected APIs.
* Implemented order creation.
* Implemented order retrieval.
* Implemented status management.
* Verified data flow.`,
        status: TaskStatus.COMPLETED,
        completionPercentage: 100,
        completedWorkDescription: 'Order Management integration completed successfully.',
        delayReason: null,
      },
      {
        date: '2026-06-02',
        title: 'Error Resolution and Flow Testing',
        projects: ['Transporter'],
        description: `* Fixed API issues.
* Resolved flow problems.
* Performed end-to-end testing.
* Validated order processing.`,
        status: TaskStatus.COMPLETED,
        completionPercentage: 100,
        completedWorkDescription: 'Application flow tested and verified successfully.',
        delayReason: null,
      }
    ]
  },
  {
    email: 'mahadev.smp1@gmail.com',
    tasks: [
      {
        date: '2026-06-02',
        title: 'SHG UI Issue Resolution and API Testing',
        projects: ['SHG'],
        description: `* Solved UI problems.
* Tested APIs in Swagger.
* Fixed identified mistakes.
* Supported integration validation.`,
        status: TaskStatus.DELAYED,
        completionPercentage: 75,
        completedWorkDescription: 'UI issues fixed and API testing completed.',
        delayReason: 'While performing API integration, UI changes unexpectedly occurred and integration work had to be paused to resolve UI issues first.',
      }
    ]
  },
  {
    email: 'vaishnavichandilkar26@gmail.com',
    tasks: [
      {
        date: '2026-06-01',
        title: 'Settlement Module Development',
        projects: ['ERP'],
        description: `* Developed Settlement module.
* Implemented business logic.
* Integrated finance workflows.
* Performed testing.`,
        status: TaskStatus.COMPLETED,
        completionPercentage: 100,
        completedWorkDescription: 'Settlement module completed and tested.',
        delayReason: null,
      },
      {
        date: '2026-06-02',
        title: 'Change Request Implementation',
        projects: ['ERP'],
        description: `* Implemented Gurudas Sir's change requests.
* Updated functionality.
* Tested revised features.
* Fixed identified issues.`,
        status: TaskStatus.COMPLETED,
        completionPercentage: 100,
        completedWorkDescription: 'All requested changes implemented successfully.',
        delayReason: null,
      }
    ]
  },
  {
    email: 'sadwaita2001@gmail.com',
    tasks: [
      {
        date: '2026-06-01',
        title: 'Task Management Development',
        projects: ['Task Management System'],
        description: `* Developed task management functionality.
* Implemented required modules.
* Improved workflow management.`,
        status: TaskStatus.COMPLETED,
        completionPercentage: 100,
        completedWorkDescription: 'Task management updates completed successfully.',
        delayReason: null,
      },
      {
        date: '2026-06-02',
        title: 'Task Management Project Completion',
        projects: ['Task Management System'],
        description: `* Completed remaining project features.
* Finalized implementation.
* Performed testing and validation.
* Prepared project for usage.`,
        status: TaskStatus.COMPLETED,
        completionPercentage: 100,
        completedWorkDescription: 'Task Management project completed successfully.',
        delayReason: null,
      }
    ]
  }
];

async function main() {
  console.log('Starting historical task seed...');

  for (const item of seedData) {
    // 1. Automatically find employee by email
    const employee = await prisma.user.findUnique({
      where: { email: item.email },
    });

    if (!employee) {
      console.warn(`Employee NOT found for email: ${item.email}`);
      continue;
    }
    console.log(`Employee found: ${employee.name} (${employee.email})`);

    for (const taskData of item.tasks) {
      // 2. Automatically find projects by name
      const dbProjects = [];
      for (const projName of taskData.projects) {
        const dbProj = await prisma.project.findUnique({
          where: { name: projName },
        });

        if (dbProj) {
          dbProjects.push(dbProj);
          console.log(`Project found: ${dbProj.name}`);
        } else {
          console.warn(`Project NOT found: ${projName}`);
        }
      }

      // Dates parsing
      const startOfDay = new Date(`${taskData.date}T00:00:00Z`);
      const endOfDay = new Date(`${taskData.date}T23:59:59Z`);
      const expectedEnd = new Date(`${taskData.date}T18:00:00Z`); // 6:00 PM

      // 3. Create or find Task (daily sheet)
      let task = await prisma.task.findFirst({
        where: {
          employeeId: employee.id,
          startDate: { gte: startOfDay, lte: endOfDay },
          deletedAt: null,
        },
      });

      if (!task) {
        task = await prisma.task.create({
          data: {
            employeeId: employee.id,
            startDate: startOfDay,
            startTime: '10:00 AM',
            expectedEndDate: expectedEnd,
          },
        });
        console.log(`Task created: Daily task sheet for ${employee.name} on ${taskData.date}`);
      } else {
        console.log(`Task already exists: Daily task sheet for ${employee.name} on ${taskData.date}`);
      }

      // 4. Create or update TaskProject assignments & daily reviews
      for (const dbProj of dbProjects) {
        const existingTaskProject = await prisma.taskProject.findFirst({
          where: {
            taskId: task.id,
            projectId: dbProj.id,
            deletedAt: null,
          },
        });

        const taskProjectData = {
          taskId: task.id,
          projectId: dbProj.id,
          taskDescription: `${taskData.title}\n\n${taskData.description}`,
          priority: TaskPriority.MEDIUM,
          status: taskData.status,
          completionPercentage: taskData.completionPercentage,
          completedWorkDescription: taskData.completedWorkDescription,
          delayReason: taskData.delayReason,
          acceptanceStatus: 'ACCEPTED',
        };

        let taskProject;
        if (existingTaskProject) {
          taskProject = await prisma.taskProject.update({
            where: { id: existingTaskProject.id },
            data: taskProjectData,
          });
          console.log(`Task Project updated: ${dbProj.name} assignment for ${employee.name}`);
        } else {
          taskProject = await prisma.taskProject.create({
            data: taskProjectData,
          });
          console.log(`Task Project created: ${dbProj.name} assignment for ${employee.name}`);
        }

        // 5. Create daily review / progress log (TaskUpdate)
        const existingUpdate = await prisma.taskUpdate.findFirst({
          where: {
            taskProjectId: taskProject.id,
            statusAfter: taskData.status,
          },
        });

        if (!existingUpdate) {
          await prisma.taskUpdate.create({
            data: {
              taskProjectId: taskProject.id,
              statusBefore: TaskStatus.PENDING,
              statusAfter: taskData.status,
              remarks: 'Evening review submitted',
            },
          });
          console.log(`Review created: Progress log for ${employee.name} - ${dbProj.name} (${taskData.status})`);
        } else {
          console.log(`Review already exists: Progress log for ${employee.name} - ${dbProj.name} (${taskData.status})`);
        }
      }
    }
  }

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error('Error seeding historical tasks:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

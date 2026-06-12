import { PrismaClient, TaskStatus, TaskPriority, TaskType, LeaveStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up existing historical data in range 2026-06-01 to 2026-06-05...');
  const startRange = new Date('2026-06-01T00:00:00Z');
  const endRange = new Date('2026-06-05T23:59:59Z');

  await prisma.taskApproval.deleteMany({
    where: { createdAt: { gte: startRange, lte: endRange } }
  });

  await prisma.taskSubmission.deleteMany({
    where: { createdAt: { gte: startRange, lte: endRange } }
  });

  await prisma.taskTimeline.deleteMany({
    where: { createdAt: { gte: startRange, lte: endRange } }
  });

  await prisma.taskUpdate.deleteMany({
    where: { createdAt: { gte: startRange, lte: endRange } }
  });

  await prisma.taskProject.deleteMany({
    where: {
      task: {
        startDate: { gte: startRange, lte: endRange }
      }
    }
  });

  await prisma.task.deleteMany({
    where: { startDate: { gte: startRange, lte: endRange } }
  });

  await prisma.leave.deleteMany({
    where: { startDate: { gte: startRange, lte: endRange } }
  });

  console.log('Cleanup completed.');

  // Find admin or superadmin dynamically to act as the assigner/approver
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });
  const reviewer = admin || superAdmin;
  if (!reviewer) {
    throw new Error('Admin/SuperAdmin user not found. Please run seed.ts first.');
  }

  console.log(`Reviewer found: ${reviewer.name} (${reviewer.email})`);

  // Seed Leaves
  const leavesToSeed = [
    {
      email: 'mahendrapowar07@gmail.com',
      leaveType: 'Emergency Leave',
      startDate: new Date('2026-06-04T00:00:00Z'),
      endDate: new Date('2026-06-06T23:59:59Z'),
      reason: 'Project submission in college',
    },
    {
      email: 'ghatgevallabh03@gmail.com',
      leaveType: 'Emergency Leave',
      startDate: new Date('2026-06-04T00:00:00Z'),
      endDate: new Date('2026-06-04T23:59:59Z'),
      reason: 'Project submission in college',
    }
  ];

  for (const leaveData of leavesToSeed) {
    const user = await prisma.user.findUnique({ where: { email: leaveData.email } });
    if (!user) {
      console.warn(`User ${leaveData.email} not found for leave seeding.`);
      continue;
    }
    await prisma.leave.create({
      data: {
        employeeId: user.id,
        leaveType: leaveData.leaveType,
        startDate: leaveData.startDate,
        endDate: leaveData.endDate,
        reason: leaveData.reason,
        status: LeaveStatus.APPROVED,
        approvedById: reviewer.id,
        remarks: 'Approved emergency leave',
      }
    });
    console.log(`Leave seeded for ${user.name} from ${leaveData.startDate.toISOString().slice(0, 10)} to ${leaveData.endDate.toISOString().slice(0, 10)}`);
  }

  // Employee details and timings mapping
  const employeeMap: Record<string, { roleType: string, startTime: string, endTime: string, hours: number }> = {
    'sadwaita2001@gmail.com': { roleType: 'Frontend Developer', startTime: '10:00 AM', endTime: '06:00 PM', hours: 8 },
    'ghatgevallabh03@gmail.com': { roleType: 'Frontend Developer', startTime: '10:00 AM', endTime: '06:00 PM', hours: 8 },
    'mahadev.smp1@gmail.com': { roleType: 'Frontend Developer', startTime: '10:00 AM', endTime: '06:00 PM', hours: 8 },
    'mahendrapowar07@gmail.com': { roleType: 'Frontend Developer', startTime: '10:00 AM', endTime: '06:00 PM', hours: 8 },
    'vaishnavichandilkar26@gmail.com': { roleType: 'Full Stack Developer', startTime: '11:00 AM', endTime: '05:00 PM', hours: 6 },
    'shridharpatil723@gmail.com': { roleType: 'Full Stack Developer', startTime: '10:00 AM', endTime: '06:00 PM', hours: 8 },
    'riteshhonule@gmail.com': { roleType: 'Full Stack Developer', startTime: '10:00 AM', endTime: '06:00 PM', hours: 8 },
  };

  const tasksData = [
    // === 2026-06-01 ===
    {
      date: '2026-06-01',
      email: 'riteshhonule@gmail.com',
      projectNames: ['IOT'],
      title: 'IoT Dashboard UI Started',
      description: 'The IoT dashboard UI started. Coordinated with Yogesh Sir. Investigated login-related issues and began dashboard setup.',
      completedWork: 'Initial IoT dashboard setup completed and login issue investigation performed.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-01',
      email: 'sadwaita2001@gmail.com',
      projectNames: ['Task Management System'],
      title: 'Task Management Development',
      description: 'Developed task management functionality. Implemented required modules. Improved workflow management.',
      completedWork: 'Task management updates completed successfully.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-01',
      email: 'vaishnavichandilkar26@gmail.com',
      projectNames: ['ERP'],
      title: 'Settlement Module Development',
      description: 'Developed settlement module, implemented business logic, integrated finance workflows and tested module.',
      completedWork: 'Settlement module completed and tested successfully.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-01',
      email: 'mahendrapowar07@gmail.com',
      projectNames: ['Transporter'],
      title: 'Order Management Integration',
      description: 'Integrated order management frontend and backend. Connected APIs, and verified data flow.',
      completedWork: 'Order management integration completed successfully.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-01',
      email: 'ghatgevallabh03@gmail.com',
      projectNames: ['SHG'],
      title: 'SHG UI Improvements',
      description: 'Screen redesign improvements, responsive layout improvements, styling enhancements and navigation updates.',
      completedWork: 'UI improvements and workflow enhancements completed.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-01',
      email: 'shridharpatil723@gmail.com',
      projectNames: ['SHG', 'Transporter'],
      title: 'GitHub Issue Resolution',
      description: 'Investigated and resolved GitHub issues. Fixed repository synchronization and code integration issues.',
      completedWork: 'GitHub issues identified and resolved successfully.',
      priority: TaskPriority.MEDIUM,
    },

    // === 2026-06-02 ===
    {
      date: '2026-06-02',
      email: 'riteshhonule@gmail.com',
      projectNames: ['IOT'],
      title: 'MQTT Integration and Login Issue Investigation',
      description: 'MQTT integration setup completed and login issues analyzed.',
      completedWork: 'MQTT integration setup completed and login issues analyzed.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-02',
      email: 'sadwaita2001@gmail.com',
      projectNames: ['Task Management System'],
      title: 'Task Management Project Completion',
      description: 'Completed remaining project features. Finalized implementation. Performed testing and validation. Prepared project for usage.',
      completedWork: 'Task Management project completed successfully.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-02',
      email: 'vaishnavichandilkar26@gmail.com',
      projectNames: ['ERP'],
      title: 'Change Request Implementation',
      description: 'Implemented Gurudas Sir\'s change requests. Updated functionality and tested revised features.',
      completedWork: 'All requested ERP changes implemented successfully.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-02',
      email: 'mahadev.smp1@gmail.com',
      projectNames: ['SHG'],
      title: 'SHG UI Issue Resolution and API Testing',
      description: 'Solved UI problems. Tested APIs in Swagger. Fixed identified mistakes. Supported integration validation.',
      completedWork: 'UI issues fixed and API testing completed.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-02',
      email: 'mahendrapowar07@gmail.com',
      projectNames: ['Transporter'],
      title: 'Error Resolution and Flow Testing',
      description: 'Fixed API issues, resolved flow problems, and performed end-to-end testing.',
      completedWork: 'Application flow tested and verified successfully.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-02',
      email: 'ghatgevallabh03@gmail.com',
      projectNames: ['Transporter'],
      title: 'Transporter APK Build Support',
      description: 'Assisted with APK build configuration, dependency checks, and troubleshooting.',
      completedWork: 'Transporter APK generated successfully.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-02',
      email: 'shridharpatil723@gmail.com',
      projectNames: ['Sevastu'],
      title: 'Sevastu Testing and APK Build Support',
      description: 'Conducted Sevastu application testing. Verified workflows and functionality. Assisted with APK build issues.',
      completedWork: 'Testing completed and APK build issues resolved.',
      priority: TaskPriority.MEDIUM,
    },

    // === 2026-06-03 ===
    {
      date: '2026-06-03',
      email: 'riteshhonule@gmail.com',
      projectNames: ['IOT'],
      title: 'IoT Sensor Data Pipeline Setup',
      description: 'Configured MQTT broker connection, established topic subscriptions, and parsed sensor payloads for telemetry.',
      completedWork: 'IoT Sensor Data Pipeline successfully integrated and tested.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-03',
      email: 'sadwaita2001@gmail.com',
      projectNames: ['Task Management System'],
      title: 'Task Management Enhancement & SMTP Notification',
      description: 'Integrated SMTP notification systems for password recovery and system alerts. Added notification sound settings.',
      completedWork: 'SMTP notifications and sounds fully integrated and verified.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-03',
      email: 'vaishnavichandilkar26@gmail.com',
      projectNames: ['ERP'],
      title: 'HSN Master Development',
      description: 'Developing master data management functionality for HSN codes. Created validations and UI schemas.',
      completedWork: 'HSN Master data screens and validations completed.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-03',
      email: 'mahadev.smp1@gmail.com',
      projectNames: ['SHG'],
      title: 'SHG Member Profile Cards UI',
      description: 'Created profile cards component showing status badges and dynamic contact numbers.',
      completedWork: 'Member profiles UI cards completed and styled.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-03',
      email: 'mahendrapowar07@gmail.com',
      projectNames: ['Transporter'],
      title: 'Transporter APK Generation & Deployment Setup',
      description: 'Configured build scripts to export APK files and tested installation on physical devices.',
      completedWork: 'Transporter APK generated and verified successfully.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-03',
      email: 'ghatgevallabh03@gmail.com',
      projectNames: ['SHG'],
      title: 'SHG Registration Form Validation',
      description: 'Added custom regex validation rules for phone numbers and dynamic address dropdowns.',
      completedWork: 'Registration form client-side validations completed.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-03',
      email: 'shridharpatil723@gmail.com',
      projectNames: ['SHG', 'Transporter'],
      title: 'SHG-Transporter API Sync Gateway',
      description: 'Developed gateway sync endpoints to keep data models of both projects in sync.',
      completedWork: 'API gateway sync endpoints completed and tested.',
      priority: TaskPriority.MEDIUM,
    },

    // === 2026-06-04 ===
    {
      date: '2026-06-04',
      email: 'riteshhonule@gmail.com',
      projectNames: ['IOT'],
      title: 'Telemetry Database Schema Optimization',
      description: 'Optimized PostgreSQL telemetry tables, created necessary indices, and tested query retrieval performance.',
      completedWork: 'Telemetry schema indexing completed, query latency reduced.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-04',
      email: 'sadwaita2001@gmail.com',
      projectNames: ['Task Management System'],
      title: 'Task Assignment UI & Filter Optimizations',
      description: 'Enhanced UI layouts for task assignment page. Optimized search and filters for large lists.',
      completedWork: 'Task assignment filter UI redesigned and integrated.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-04',
      email: 'vaishnavichandilkar26@gmail.com',
      projectNames: ['ERP'],
      title: 'Invoice PDF Generator Implementation',
      description: 'Configured backend PDF generator using template mapping. Handled invoice calculations.',
      completedWork: 'Invoice PDF generation endpoint implemented and verified.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-04',
      email: 'mahadev.smp1@gmail.com',
      projectNames: ['SHG'],
      title: 'SHG Loan Application UI Development',
      description: 'Implemented multi-step wizard UI for SHG micro-finance loan applications.',
      completedWork: 'Multi-step loan wizard completed successfully.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-04',
      email: 'shridharpatil723@gmail.com',
      projectNames: ['SHG', 'Transporter'],
      title: 'Database Migration scripts for SHG & Transporter',
      description: 'Wrote database migration scripts and optimized relations between transport logs and SHG users.',
      completedWork: 'Schema migrations successfully applied and tested.',
      priority: TaskPriority.MEDIUM,
    },

    // === 2026-06-05 ===
    {
      date: '2026-06-05',
      email: 'riteshhonule@gmail.com',
      projectNames: ['IOT'],
      title: 'IoT REST APIs for Historical Telemetry',
      description: 'Implemented API endpoints to fetch telemetry history with pagination and date range filters.',
      completedWork: 'Telemetry history APIs developed, documented, and tested.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-05',
      email: 'sadwaita2001@gmail.com',
      projectNames: ['Task Management System'],
      title: 'Interactive Kanban Board Implementation',
      description: 'Built drag-and-drop support for board status transitions and customized cards styling.',
      completedWork: 'Drag-and-drop Kanban Board page completed and tested.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-05',
      email: 'vaishnavichandilkar26@gmail.com',
      projectNames: ['ERP'],
      title: 'ERP Tax Ledger Reconciliation',
      description: 'Wrote reconciliation scripts to match invoice taxes with ledgers and generate discrepancy logs.',
      completedWork: 'Ledger reconciliation algorithms created and verified.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-05',
      email: 'mahadev.smp1@gmail.com',
      projectNames: ['SHG'],
      title: 'SHG Transaction History Table',
      description: 'Built dynamic data table with filtering, search, and CSV export for transaction records.',
      completedWork: 'Transaction list UI with export capabilities verified.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-05',
      email: 'ghatgevallabh03@gmail.com',
      projectNames: ['IOT'],
      title: 'Booster Dashboard UI Improvements',
      description: 'Worked on frontend improvements for the IoT project, focusing on enhancing the overall user experience and refining key interface components. Designed and structured the Booster Dashboard layout, ensuring clear data visualization and improved accessibility of critical metrics. Also reviewed the dashboard flow and incorporated UI enhancements to support better usability and responsiveness across different screens.',
      completedWork: 'Booster Dashboard UI completed and frontend improvements successfully implemented and tested.',
      priority: TaskPriority.MEDIUM,
    },
    {
      date: '2026-06-05',
      email: 'shridharpatil723@gmail.com',
      projectNames: ['SHG', 'Transporter'],
      title: 'Gateway Load Testing and Security Audit',
      description: 'Performed API load testing using Autocannon and executed a basic security validation check.',
      completedWork: 'Security audit and rate limiting setup completed.',
      priority: TaskPriority.MEDIUM,
    },
  ];

  console.log(`Starting historical tasks seeding (${tasksData.length} entries)...`);

  for (const item of tasksData) {
    const employee = await prisma.user.findUnique({ where: { email: item.email } });
    if (!employee) {
      console.warn(`Employee not found for email: ${item.email}`);
      continue;
    }

    const config = employeeMap[item.email];
    if (!config) {
      console.warn(`Timing config not found for email: ${item.email}`);
      continue;
    }

    // Dates parsing
    const startOfDay = new Date(`${item.date}T00:00:00Z`);
    const endOfDay = new Date(`${item.date}T23:59:59Z`);

    // Parse start/end working hours for specific dates
    const startHours = config.startTime === '11:00 AM' ? 11 : 10;
    const endHours = config.endTime === '05:00 PM' ? 17 : 18;

    const taskStartTimeDate = new Date(`${item.date}T${startHours.toString().padStart(2, '0')}:00:00Z`);
    const taskExpectedEndDate = new Date(`${item.date}T${endHours.toString().padStart(2, '0')}:00:00Z`);

    // Create or find Task daily sheet
    let task = await prisma.task.findFirst({
      where: {
        employeeId: employee.id,
        startDate: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
      }
    });

    if (!task) {
      task = await prisma.task.create({
        data: {
          employeeId: employee.id,
          startDate: startOfDay,
          startTime: config.startTime,
          expectedEndDate: taskExpectedEndDate,
          createdAt: new Date(`${item.date}T09:30:00Z`),
        }
      });
    }

    // Allocate time spent across projects (equal distribution if multiple projects)
    const timeSpentPerProject = config.hours / item.projectNames.length;

    for (const projName of item.projectNames) {
      const project = await prisma.project.findUnique({ where: { name: projName } });
      if (!project) {
        console.warn(`Project not found: ${projName}`);
        continue;
      }

      // Create TaskProject
      const taskProject = await prisma.taskProject.create({
        data: {
          taskId: task.id,
          projectId: project.id,
          taskDescription: `${item.title}\n\n${item.description}`,
          priority: item.priority,
          status: TaskStatus.COMPLETED,
          completionPercentage: 100,
          completedWorkDescription: item.completedWork,
          acceptanceStatus: 'ACCEPTED',
          reviewStatus: 'APPROVED',
          startTime: config.startTime,
          endTime: config.endTime,
          jobRoleType: config.roleType,
          assignedByUserId: employee.id,
          assignedToUserId: employee.id,
          approvedById: reviewer.id,
          approvedDate: new Date(`${item.date}T${endHours.toString().padStart(2, '0')}:15:00Z`),
          approvalComment: 'Approved after review',
          timeSpent: timeSpentPerProject,
          taskType: TaskType.EMPLOYEE_ASSIGNED_TASK,
          createdAt: new Date(`${item.date}T09:30:00Z`),
        }
      });

      // Create TaskUpdate
      await prisma.taskUpdate.create({
        data: {
          taskProjectId: taskProject.id,
          statusBefore: TaskStatus.PENDING,
          statusAfter: TaskStatus.COMPLETED,
          remarks: 'Evening review submitted',
          createdAt: new Date(`${item.date}T${endHours.toString().padStart(2, '0')}:00:00Z`),
        }
      });

      // Create TaskSubmission
      const submission = await prisma.taskSubmission.create({
        data: {
          taskProjectId: taskProject.id,
          employeeId: employee.id,
          comment: 'Completed all daily update goals.',
          timeSpent: timeSpentPerProject,
          createdAt: new Date(`${item.date}T${(endHours - 1).toString().padStart(2, '0')}:55:00Z`),
        }
      });

      // Create TaskApproval
      await prisma.taskApproval.create({
        data: {
          taskSubmissionId: submission.id,
          reviewerId: reviewer.id,
          comment: 'Task approved after review',
          createdAt: new Date(`${item.date}T${endHours.toString().padStart(2, '0')}:15:00Z`),
        }
      });

      // Create TaskTimeline records
      const timelineEvents = [
        { action: 'Task Created', offsetHours: -1, offsetMins: 30, details: `Task created for project ${project.name}` },
        { action: 'Work Started', offsetHours: 0, offsetMins: 0, details: `Employee started working on ${project.name}` },
        { action: 'Progress Updated', offsetHours: 4, offsetMins: 0, details: 'Mid-day status: progressing on deliverables' },
        { action: 'Work Review Submitted', offsetHours: endHours - startHours - 1, offsetMins: 55, details: 'Task submission sent for approval' },
        { action: 'Review Approved', offsetHours: endHours - startHours, offsetMins: 15, details: `Review approved by ${reviewer.name}` },
        { action: 'Task Completed', offsetHours: endHours - startHours, offsetMins: 16, details: 'Task status updated to COMPLETED' },
      ];

      for (const event of timelineEvents) {
        const eventDate = new Date(taskStartTimeDate);
        eventDate.setHours(eventDate.getHours() + event.offsetHours);
        eventDate.setMinutes(eventDate.getMinutes() + event.offsetMins);

        await prisma.taskTimeline.create({
          data: {
            taskProjectId: taskProject.id,
            action: event.action,
            performedById: event.action.includes('Approved') ? reviewer.id : employee.id,
            details: event.details,
            createdAt: eventDate,
          }
        });
      }
    }
    console.log(`Successfully seeded tasks for ${employee.name} on ${item.date}`);
  }

  console.log('Historical tasks seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error in historical task seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ─── Find users ─────────────────────────────────────────────────────────────
  const shridhar = await prisma.user.findFirst({
    where: { name: { contains: 'Shridhar', mode: 'insensitive' } }
  });
  const adwaita = await prisma.user.findFirst({
    where: { name: { contains: 'Adwaita', mode: 'insensitive' } }
  });

  if (!shridhar) throw new Error('Shridhar user not found');
  if (!adwaita) throw new Error('Adwaita user not found');

  console.log(`Found Shridhar: ${shridhar.name} (id=${shridhar.id})`);
  console.log(`Found Adwaita: ${adwaita.name} (id=${adwaita.id})`);

  // ─── CHANGE 1: Shridhar June 9 task → IN_PROGRESS ───────────────────────────
  const shridharJune9Projects = await prisma.taskProject.findMany({
    where: {
      task: {
        employeeId: shridhar.id,
        startDate: {
          gte: new Date('2026-06-09T00:00:00Z'),
          lte: new Date('2026-06-09T23:59:59Z'),
        }
      },
      deletedAt: null,
    },
    include: { project: true, task: true }
  });

  console.log(`\nShridhar June 9 task projects: ${shridharJune9Projects.length}`);
  for (const tp of shridharJune9Projects) {
    console.log(`  - Project: ${tp.project?.name}, Status: ${tp.status}`);
    await prisma.taskProject.update({
      where: { id: tp.id },
      data: { status: TaskStatus.IN_PROGRESS }
    });
    console.log(`  ✅ Updated to IN_PROGRESS`);
  }

  // ─── CHANGE 2: Adwaita June 8 task → COMPLETED, remove carry forward ────────
  const adwaitaJune8Projects = await prisma.taskProject.findMany({
    where: {
      task: {
        employeeId: adwaita.id,
        startDate: {
          gte: new Date('2026-06-08T00:00:00Z'),
          lte: new Date('2026-06-08T23:59:59Z'),
        }
      },
      deletedAt: null,
    },
    include: { project: true, task: true }
  });

  console.log(`\nAdwaita June 8 task projects: ${adwaitaJune8Projects.length}`);
  for (const tp of adwaitaJune8Projects) {
    console.log(`  - Project: ${tp.project?.name}, Status: ${tp.status}`);
    await prisma.taskProject.update({
      where: { id: tp.id },
      data: {
        status: TaskStatus.COMPLETED,
        completionPercentage: 100,
        reviewStatus: 'APPROVED',
        completedWorkDescription: tp.completedWorkDescription || tp.taskDescription || 'Task completed.',
      }
    });
    console.log(`  ✅ Updated to COMPLETED`);
  }

  // Remove carry forward records for Adwaita's June 8 task
  const adwaitaTask8 = await prisma.task.findFirst({
    where: {
      employeeId: adwaita.id,
      startDate: {
        gte: new Date('2026-06-08T00:00:00Z'),
        lte: new Date('2026-06-08T23:59:59Z'),
      }
    }
  });

  if (adwaitaTask8) {
    // Delete carry forward records FROM this task
    const deletedCf = await prisma.taskCarryForward.deleteMany({
      where: { taskId: adwaitaTask8.id }
    });
    if (deletedCf.count > 0) {
      console.log(`\n  ✅ Deleted ${deletedCf.count} carry forward records for Adwaita June 8 task`);
    }

    // Find any task with carryForwardedFromId = adwaitaTask8.id and clear it
    const carryForwardedTasks = await prisma.task.findMany({
      where: { carryForwardedFromId: adwaitaTask8.id }
    });
    for (const cft of carryForwardedTasks) {
      await prisma.task.update({
        where: { id: cft.id },
        data: { carryForwardedFromId: null }
      });
      console.log(`  ✅ Cleared carryForwardedFromId on task id=${cft.id} (was forwarded from Adwaita June 8)`);
    }
  }

  // ─── CHANGE 3: Remove Adwaita "Task Management System" tasks on June 9 & 10 ─
  // Keep GMU HUB project tasks, only remove Task Management System project tasks

  const taskMgmtProject = await prisma.project.findFirst({
    where: { name: { contains: 'Task Management', mode: 'insensitive' } }
  });

  if (!taskMgmtProject) {
    console.log('\n⚠️  Task Management System project not found by name search');
    // Try alternative names
    const allProjects = await prisma.project.findMany({ select: { id: true, name: true } });
    console.log('Available projects:', allProjects.map(p => `${p.id}: ${p.name}`).join(', '));
  } else {
    console.log(`\nTask Management System project: id=${taskMgmtProject.id}, name=${taskMgmtProject.name}`);
  }

  for (const dayStr of ['2026-06-09', '2026-06-10']) {
    const dayStart = new Date(`${dayStr}T00:00:00Z`);
    const dayEnd = new Date(`${dayStr}T23:59:59Z`);

    const adwaitaDayProjects = await prisma.taskProject.findMany({
      where: {
        task: {
          employeeId: adwaita.id,
          startDate: { gte: dayStart, lte: dayEnd }
        },
        deletedAt: null,
      },
      include: { project: true, task: true }
    });

    console.log(`\nAdwaita ${dayStr} task projects: ${adwaitaDayProjects.length}`);
    for (const tp of adwaitaDayProjects) {
      console.log(`  - Project: "${tp.project?.name}" (id=${tp.projectId}), Status: ${tp.status}`);
    }

    // Filter to only Task Management System projects
    const toDelete = adwaitaDayProjects.filter(tp => {
      if (!taskMgmtProject) return false;
      return tp.projectId === taskMgmtProject.id;
    });

    // Also try by project name contains "Task Management"
    const toDeleteByName = adwaitaDayProjects.filter(tp =>
      tp.project?.name?.toLowerCase().includes('task management')
    );

    const finalToDelete = toDelete.length > 0 ? toDelete : toDeleteByName;

    for (const tp of finalToDelete) {
      console.log(`  🗑️  Deleting Task Management System project task: id=${tp.id}, project="${tp.project?.name}"`);

      // Delete child records first
      await prisma.taskApproval.deleteMany({
        where: { taskSubmission: { taskProjectId: tp.id } }
      });
      await prisma.taskSubmission.deleteMany({
        where: { taskProjectId: tp.id }
      });
      await prisma.taskTimeline.deleteMany({
        where: { taskProjectId: tp.id }
      });
      await prisma.taskUpdate.deleteMany({
        where: { taskProjectId: tp.id }
      });

      // Hard delete the task project
      await prisma.taskProject.delete({
        where: { id: tp.id }
      });
      console.log(`  ✅ Deleted Task Management System task project for Adwaita on ${dayStr}`);

      // If parent task has no more projects, optionally clean it up too
      const remainingProjects = await prisma.taskProject.count({
        where: { taskId: tp.taskId, deletedAt: null }
      });
      console.log(`  → Remaining projects in parent task (id=${tp.taskId}): ${remainingProjects}`);

      if (remainingProjects === 0) {
        // Delete carry forward records and the parent task
        await prisma.taskCarryForward.deleteMany({ where: { taskId: tp.taskId } });
        await prisma.task.delete({ where: { id: tp.taskId } });
        console.log(`  ✅ Deleted empty parent task id=${tp.taskId}`);
      }
    }

    if (finalToDelete.length === 0) {
      console.log(`  ℹ️  No Task Management System tasks found for Adwaita on ${dayStr}`);
    }
  }

  console.log('\n✅ All changes applied successfully!');
}

main()
  .catch(e => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

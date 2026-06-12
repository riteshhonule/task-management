import { PrismaClient, TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {

    // Mahendra Leave 4-6 June
    await prisma.leave.updateMany({
        where: {
            employee: {
                email: 'mahendrapowar07@gmail.com'
            }
        },
        data: {
            endDate: new Date('2026-06-06T23:59:59Z')
        }
    });

    // Vallabh Leave only 4 June
    await prisma.leave.updateMany({
        where: {
            employee: {
                email: 'ghatgevallabh03@gmail.com'
            }
        },
        data: {
            endDate: new Date('2026-06-04T23:59:59Z')
        }
    });

    // Vallabh 5 June Task Update
    const taskProject = await prisma.taskProject.findFirst({
        where: {
            assignedTo: {
                email: 'ghatgevallabh03@gmail.com'
            },
            task: {
                startDate: {
                    gte: new Date('2026-06-05T00:00:00Z'),
                    lte: new Date('2026-06-05T23:59:59Z')
                }
            }
        }
    });

    const iotProject = await prisma.project.findUnique({
        where: {
            name: 'IOT'
        }
    });

    if (taskProject && iotProject) {
        await prisma.taskProject.update({
            where: { id: taskProject.id },
            data: {
                projectId: iotProject.id,
                taskDescription: `IoT Booster Dashboard UI Improvements

Worked on frontend improvements for the IoT project, focusing on enhancing the overall user experience and refining key interface components. Designed and structured the Booster Dashboard layout, ensuring clear data visualization and improved accessibility of critical metrics. Also reviewed the dashboard flow and incorporated UI enhancements to support better usability and responsiveness across different screens.`,
                completedWorkDescription:
                    'Booster Dashboard UI completed and frontend improvements successfully implemented and tested.',
                status: TaskStatus.COMPLETED,
                completionPercentage: 100
            }
        });
    }

    // Remove Vallabh 6 June Transporter Task
    const vallabhTaskProjects = await prisma.taskProject.findMany({
        where: {
            assignedTo: {
                email: 'ghatgevallabh03@gmail.com'
            },
            task: {
                startDate: {
                    gte: new Date('2026-06-06T00:00:00Z'),
                    lte: new Date('2026-06-06T23:59:59Z')
                }
            }
        }
    });

    for (const tp of vallabhTaskProjects) {
        await prisma.taskApproval.deleteMany({
            where: {
                taskSubmission: {
                    taskProjectId: tp.id
                }
            }
        });

        await prisma.taskSubmission.deleteMany({
            where: {
                taskProjectId: tp.id
            }
        });

        await prisma.taskTimeline.deleteMany({
            where: {
                taskProjectId: tp.id
            }
        });

        await prisma.taskUpdate.deleteMany({
            where: {
                taskProjectId: tp.id
            }
        });

        await prisma.taskProject.delete({
            where: {
                id: tp.id
            }
        });

    }

    // CHANGE 1: Mahadev Patil leave on June 1, 2026
    const mahadev = await prisma.user.findFirst({
        where: { email: 'mahadev.smp1@gmail.com' }
    });
    if (!mahadev) {
        throw new Error('Mahadev Patil user not found');
    }

    const reviewer = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    }) || await prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN' }
    });
    if (!reviewer) {
        throw new Error('Reviewer admin not found');
    }

    const existingLeave = await prisma.leave.findFirst({
        where: {
            employeeId: mahadev.id,
            startDate: new Date('2026-06-01T00:00:00Z'),
        }
    });

    if (!existingLeave) {
        await prisma.leave.create({
            data: {
                employeeId: mahadev.id,
                leaveType: 'Emergency Leave',
                startDate: new Date('2026-06-01T00:00:00Z'),
                endDate: new Date('2026-06-01T23:59:59Z'),
                reason: 'Personal Work',
                status: 'APPROVED',
                approvedById: reviewer.id,
                remarks: 'Approved emergency leave',
            }
        });
        console.log('Change 1: Created approved leave for Mahadev Patil on June 1, 2026');
    } else {
        await prisma.leave.update({
            where: { id: existingLeave.id },
            data: {
                leaveType: 'Emergency Leave',
                endDate: new Date('2026-06-01T23:59:59Z'),
                reason: 'Personal Work',
                status: 'APPROVED',
                approvedById: reviewer.id,
            }
        });
        console.log('Change 1: Updated leave for Mahadev Patil on June 1, 2026');
    }

    // CHANGE 2: Add Mahendra Powar task on 02 June 2026
    const mahendra = await prisma.user.findFirst({
        where: { email: 'mahendrapowar07@gmail.com' }
    });
    if (!mahendra) {
        throw new Error('Mahendra Powar user not found');
    }

    const transporterProject = await prisma.project.findUnique({
        where: { name: 'Transporter' }
    });
    if (!transporterProject) {
        throw new Error('Transporter project not found');
    }

    let mahendraTask = await prisma.task.findFirst({
        where: {
            employeeId: mahendra.id,
            startDate: {
                gte: new Date('2026-06-02T00:00:00Z'),
                lte: new Date('2026-06-02T23:59:59Z'),
            }
        }
    });

    if (!mahendraTask) {
        mahendraTask = await prisma.task.create({
            data: {
                employeeId: mahendra.id,
                startDate: new Date('2026-06-02T00:00:00Z'),
                startTime: '10:00 AM',
                expectedEndDate: new Date('2026-06-02T18:00:00Z'),
                createdAt: new Date('2026-06-02T09:30:00Z'),
            }
        });
    }

    let tp = await prisma.taskProject.findFirst({
        where: {
            taskId: mahendraTask.id,
            projectId: transporterProject.id,
        }
    });

    const description = `Error Resolution and Flow Testing\n\nDate: 02 June 2026\nTask: Error Resolution and Flow Testing\n• Resolved issues identified during Order Management integration.\n• Fixed API-related errors and application flow issues.\n• Performed end-to-end testing of the order management workflow.\n• Validated order processing and status update functionality.`;
    const completedWork = `Order management workflow tested successfully.\nAPI issues resolved.\nFlow validation completed.`;

    if (!tp) {
        tp = await prisma.taskProject.create({
            data: {
                taskId: mahendraTask.id,
                projectId: transporterProject.id,
                taskDescription: description,
                completedWorkDescription: completedWork,
                status: 'COMPLETED',
                completionPercentage: 100,
                acceptanceStatus: 'ACCEPTED',
                reviewStatus: 'APPROVED',
                startTime: '10:00 AM',
                endTime: '06:00 PM',
                jobRoleType: 'Frontend Developer',
                assignedByUserId: mahendra.id,
                assignedToUserId: mahendra.id,
                assignmentType: 'SELF',
                taskType: 'NEW_TASK',
                approvedById: reviewer.id,
                approvedDate: new Date('2026-06-02T18:15:00Z'),
                approvalComment: 'Auto-approved (no proof required)',
                createdAt: new Date('2026-06-02T09:30:00Z'),
            }
        });
        console.log('Change 2: Created Transporter task project for Mahendra Powar on June 2, 2026');
    } else {
        await prisma.taskProject.update({
            where: { id: tp.id },
            data: {
                taskDescription: description,
                completedWorkDescription: completedWork,
                status: 'COMPLETED',
                completionPercentage: 100,
                acceptanceStatus: 'ACCEPTED',
                reviewStatus: 'APPROVED',
                approvedById: reviewer.id,
            }
        });
        console.log('Change 2: Updated Transporter task project for Mahendra Powar on June 2, 2026');
    }

    // Ensure TaskSubmission, TaskApproval, TaskUpdate and TaskTimeline exist for Change 2
    let submission = await prisma.taskSubmission.findFirst({
        where: { taskProjectId: tp.id }
    });
    if (!submission) {
        submission = await prisma.taskSubmission.create({
            data: {
                taskProjectId: tp.id,
                employeeId: mahendra.id,
                comment: completedWork,
                createdAt: new Date('2026-06-02T17:55:00Z'),
            }
        });
    }

    const approval = await prisma.taskApproval.findFirst({
        where: { taskSubmissionId: submission.id }
    });
    if (!approval) {
        await prisma.taskApproval.create({
            data: {
                taskSubmissionId: submission.id,
                reviewerId: reviewer.id,
                comment: 'Task approved after review',
                createdAt: new Date('2026-06-02T18:15:00Z'),
            }
        });
    }

    const update = await prisma.taskUpdate.findFirst({
        where: { taskProjectId: tp.id }
    });
    if (!update) {
        await prisma.taskUpdate.create({
            data: {
                taskProjectId: tp.id,
                statusBefore: 'PENDING',
                statusAfter: 'COMPLETED',
                remarks: 'Evening review submitted',
                createdAt: new Date('2026-06-02T18:00:00Z'),
            }
        });
    }

    const timelineEvents = await prisma.taskTimeline.findMany({
        where: { taskProjectId: tp.id }
    });
    if (timelineEvents.length === 0) {
        const events = [
            { action: 'Task Created', performedById: mahendra.id, details: 'Task created', createdAt: new Date('2026-06-02T10:00:00Z') },
            { action: 'Completed', performedById: mahendra.id, details: `Completed task: ${completedWork}`, createdAt: new Date('2026-06-02T17:55:00Z') },
            { action: 'Review Approved', performedById: reviewer.id, details: `Review approved by ${reviewer.name}`, createdAt: new Date('2026-06-02T18:15:00Z') },
            { action: 'Task Completed', performedById: mahendra.id, details: 'Task status updated to COMPLETED', createdAt: new Date('2026-06-02T18:16:00Z') },
        ];
        for (const event of events) {
            await prisma.taskTimeline.create({
                data: {
                    taskProjectId: tp.id,
                    action: event.action,
                    performedById: event.performedById,
                    details: event.details,
                    createdAt: event.createdAt,
                }
            });
        }
    }

    // CHANGES 3 & 4: Remove Mahendra Powar GMU HUB task on June 8, 2026 and related assignments
    const gmuHubProj = await prisma.project.findUnique({
        where: { name: 'GMU HUB' }
    });
    const adwaita = await prisma.user.findFirst({
        where: { email: 'sadwaita2001@gmail.com' }
    });

    if (gmuHubProj && adwaita) {
        const tpToRemove = await prisma.taskProject.findFirst({
            where: {
                assignedToUserId: mahendra.id,
                assignedByUserId: adwaita.id,
                projectId: gmuHubProj.id,
                task: {
                    startDate: {
                        gte: new Date('2026-06-08T00:00:00Z'),
                        lte: new Date('2026-06-08T23:59:59Z'),
                    }
                }
            }
        });

        if (tpToRemove) {
            console.log(`Found GMU HUB task project to remove (ID: ${tpToRemove.id})`);

            await prisma.taskApproval.deleteMany({
                where: { taskSubmission: { taskProjectId: tpToRemove.id } }
            });

            await prisma.taskSubmission.deleteMany({
                where: { taskProjectId: tpToRemove.id }
            });

            await prisma.taskUpdate.deleteMany({
                where: { taskProjectId: tpToRemove.id }
            });

            await prisma.taskTimeline.deleteMany({
                where: { taskProjectId: tpToRemove.id }
            });

            await prisma.taskProject.delete({
                where: { id: tpToRemove.id }
            });

            console.log('Change 3 & 4: Removed GMU HUB task project and associated records');
        }

        // Delete TaskCarryForward pointing to Mahendra's June 8 task (ID 71)
        const taskOn8 = await prisma.task.findFirst({
            where: {
                employeeId: mahendra.id,
                startDate: {
                    gte: new Date('2026-06-08T00:00:00Z'),
                    lte: new Date('2026-06-08T23:59:59Z'),
                }
            }
        });

        if (taskOn8) {
            const deletedCf = await prisma.taskCarryForward.deleteMany({
                where: {
                    taskId: taskOn8.id,
                    employeeId: mahendra.id,
                }
            });
            if (deletedCf.count > 0) {
                console.log(`Change 4: Deleted ${deletedCf.count} carry forward records for task on June 8`);
            }
        }

        // Clean up carryForwardedFromId reference in subsequent task on June 9 (ID 77)
        const taskOn9 = await prisma.task.findFirst({
            where: {
                employeeId: mahendra.id,
                startDate: {
                    gte: new Date('2026-06-09T00:00:00Z'),
                    lte: new Date('2026-06-09T23:59:59Z'),
                }
            }
        });

        if (taskOn9 && taskOn9.carryForwardedFromId === taskOn8?.id) {
            await prisma.task.update({
                where: { id: taskOn9.id },
                data: {
                    carryForwardedFromId: null
                }
            });
            console.log('Change 4: Cleared carryForwardedFromId on June 9 task to prevent orphans/errors');
        }
    }

    console.log('Historical records updated successfully');
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });

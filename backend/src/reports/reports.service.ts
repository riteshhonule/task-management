import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus, Role } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { Writable } from 'stream';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDailyReviewData(dateStr?: string, tab?: string, projectId?: string, search?: string) {
    const whereClause: any = { deletedAt: null };

    // Handle Date/Day/Month/Year filtering on the startDate field
    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 1 && parts[0].length === 4) {
        // Year filter: YYYY
        const year = parseInt(parts[0]);
        whereClause.startDate = {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59, 999),
        };
      } else if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 2) {
        // Month filter: YYYY-MM
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        whereClause.startDate = {
          gte: new Date(year, month, 1),
          lte: new Date(year, month + 1, 0, 23, 59, 59, 999),
        };
      } else {
        // Full Date filter: YYYY-MM-DD
        const targetDate = new Date(dateStr);
        if (!isNaN(targetDate.getTime())) {
          whereClause.startDate = {
            gte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()),
            lte: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999),
          };
        }
      }
    } else if (tab === 'TODAY') {
      const today = new Date();
      whereClause.startDate = {
        gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        lte: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999),
      };
    } else if (tab === 'YESTERDAY') {
      const yesterday = new Date(Date.now() - 86400000);
      whereClause.startDate = {
        gte: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
        lte: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999),
      };
    }

    const tasks = await this.prisma.task.findMany({
      where: whereClause,
      include: {
        employee: {
          select: { name: true, email: true },
        },
        projects: {
          include: {
            project: { select: { name: true } },
            assignedBy: { select: { name: true } },
            assignedTo: { select: { name: true } },
            submissions: {
              include: { proofs: true },
              orderBy: { createdAt: 'desc' },
            },
            updates: {
              orderBy: { createdAt: 'desc' },
            }
          }
        }
      },
      orderBy: { employee: { name: 'asc' } },
    });

    let flattenedRows = [];
    for (const t of tasks) {
      if (t.projects && t.projects.length > 0) {
        // Recursive lookup of carry-forward details
        let carryForwardCount = 0;
        let lastCarryForwardDate: Date | null = null;
        let currentId = t.carryForwardedFromId;
        const visited = new Set<number>();
        while (currentId) {
          if (visited.has(currentId)) break;
          visited.add(currentId);
          const parent = await this.prisma.task.findUnique({
            where: { id: currentId },
            select: { carryForwardedFromId: true, startDate: true }
          });
          if (!parent) break;
          carryForwardCount++;
          if (carryForwardCount === 1) {
            lastCarryForwardDate = parent.startDate;
          }
          currentId = parent.carryForwardedFromId;
        }

        const today = new Date();

        for (const p of t.projects) {
          let overdueDays = 0;
          const expectedEndDate = new Date(t.expectedEndDate);
          if (p.status !== 'COMPLETED' && today.getTime() > expectedEndDate.getTime()) {
            overdueDays = Math.ceil((today.getTime() - expectedEndDate.getTime()) / (1000 * 60 * 60 * 24));
          }

          const latestSubmission = p.submissions && p.submissions.length > 0 ? p.submissions[0] : null;
          const latestUpdateWithScreenshot = p.updates?.find(u => u.screenshotUrl);
          const proofUrl = latestUpdateWithScreenshot?.screenshotUrl || (latestSubmission?.proofs && latestSubmission.proofs.length > 0 ? latestSubmission.proofs[0].filepath : null);

          flattenedRows.push({
            id: p.id,
            taskId: t.id,
            startDate: t.startDate,
            employeeName: t.employee?.name || 'N/A',
            startTime: p.startTime || t.startTime,
            expectedEndDate: t.expectedEndDate,
            projectId: p.projectId,
            project: p.project?.name || 'N/A',
            taskDescription: p.taskDescription,
            changesGivenBy: p.changesGivenBy,
            changesSummary: p.changesSummary,
            status: p.status,
            delayReason: p.delayReason,
            assignedByName: p.assignedBy?.name || 'Self',
            assignedToName: p.assignedTo?.name || t.employee?.name || 'N/A',
            assignmentType: p.assignmentType || 'SELF',
            priority: p.priority,
            jobRole: p.jobRoleType === 'Other' ? p.customJobRole : (p.jobRoleType || '-'),
            endTime: p.endTime || '-',
            proofRequired: p.proofRequired ? 'Yes' : 'No',
            approvalStatus: p.reviewStatus || p.status,
            carryForwardCount,
            lastCarryForwardDate,
            overdueDays,
            notes: p.notes || '-',
            completedWorkDescription: p.completedWorkDescription || '-',
            timeSpent: p.timeSpent || latestSubmission?.timeSpent || 0,
            blockers: p.blockers || latestSubmission?.blockers || '-',
            additionalNotes: latestSubmission?.notes || '-',
            proofUrl: proofUrl || '-',
            rejectionReason: p.rejectionReason || '-',
            completionPercentage: p.completionPercentage || 0,
          });
        }
      }
    }

    let rangeStart: Date | null = null;
    let rangeEnd: Date | null = null;

    if (dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 1 && parts[0].length === 4) {
        const year = parseInt(parts[0]);
        rangeStart = new Date(year, 0, 1);
        rangeEnd = new Date(year, 11, 31, 23, 59, 59, 999);
      } else if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 2) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        rangeStart = new Date(year, month, 1);
        rangeEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
      } else {
        const targetDate = new Date(dateStr);
        if (!isNaN(targetDate.getTime())) {
          rangeStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
          rangeEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
        }
      }
    } else if (tab === 'TODAY') {
      const today = new Date();
      rangeStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      rangeEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    } else if (tab === 'YESTERDAY') {
      const yesterday = new Date(Date.now() - 86400000);
      rangeStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      rangeEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
    }

    const leavesWhereClause: any = {
      status: 'APPROVED',
      deletedAt: null,
    };
    if (rangeStart && rangeEnd) {
      leavesWhereClause.OR = [
        {
          startDate: { lte: rangeEnd },
          endDate: { gte: rangeStart },
        }
      ];
    }
    const activeLeaves = await this.prisma.leave.findMany({
      where: leavesWhereClause,
      include: {
        employee: {
          select: { name: true, email: true },
        },
      },
    });

    for (const leave of activeLeaves) {
      let current = new Date(
        leave.startDate.getUTCFullYear(),
        leave.startDate.getUTCMonth(),
        leave.startDate.getUTCDate(),
        0, 0, 0, 0
      );
      const end = new Date(
        leave.endDate.getUTCFullYear(),
        leave.endDate.getUTCMonth(),
        leave.endDate.getUTCDate(),
        0, 0, 0, 0
      );

      while (current <= end) {
        let inRange = true;
        if (rangeStart && rangeEnd) {
          const compStart = new Date(rangeStart);
          compStart.setHours(0, 0, 0, 0);
          const compEnd = new Date(rangeEnd);
          compEnd.setHours(0, 0, 0, 0);
          inRange = current >= compStart && current <= compEnd;
        }

        if (inRange) {
          const dateStrKey = current.toISOString().split('T')[0];
          const startUTC = Date.UTC(leave.startDate.getUTCFullYear(), leave.startDate.getUTCMonth(), leave.startDate.getUTCDate());
          const endUTC = Date.UTC(leave.endDate.getUTCFullYear(), leave.endDate.getUTCMonth(), leave.endDate.getUTCDate());
          const diffTime = Math.abs(endUTC - startUTC);
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

          flattenedRows.push({
            id: `leave-${leave.id}-${dateStrKey}`,
            taskId: null,
            startDate: new Date(current),
            employeeName: leave.employee?.name || 'Unknown Employee',
            startTime: '-',
            expectedEndDate: new Date(leave.endDate),
            projectId: 0,
            project: 'LEAVE',
            taskDescription: leave.reason,
            changesGivenBy: null,
            changesSummary: null,
            status: 'ON_LEAVE',
            delayReason: null,
            leaveType: leave.leaveType,
            leaveDays: diffDays,
            leaveReason: leave.reason,
          });
        }
        current.setDate(current.getDate() + 1);
      }
    }

    // In-memory tab status filtering
    if (tab && !['TODAY', 'YESTERDAY', 'ALL'].includes(tab)) {
      flattenedRows = flattenedRows.filter(r => r.status === tab);
    }

    // In-memory project ID filtering
    if (projectId) {
      flattenedRows = flattenedRows.filter(r => r.projectId.toString() === projectId);
    }

    // In-memory search filtering
    if (search) {
      const term = search.toLowerCase();
      flattenedRows = flattenedRows.filter(r =>
        (r.taskDescription || '').toLowerCase().includes(term) ||
        (r.project || '').toLowerCase().includes(term) ||
        (r.employeeName || '').toLowerCase().includes(term)
      );
    }

    return flattenedRows;
  }

  async exportExcel(dateStr?: string, tab?: string, projectId?: string, search?: string): Promise<Buffer> {
    const rows = await this.getDailyReviewData(dateStr, tab, projectId, search);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daily Task Review');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Employee Name', key: 'employeeName', width: 20 },
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Project', key: 'project', width: 15 },
      { header: 'Task', key: 'task', width: 35 },
      { header: 'Start Time', key: 'startTime', width: 12 },
      { header: 'End Time', key: 'endTime', width: 12 },
      { header: 'Task Type', key: 'taskType', width: 18 },
      { header: 'Assigned By', key: 'assignedBy', width: 20 },
      { header: 'Assigned To', key: 'assignedTo', width: 20 },
      { header: 'Proof Req', key: 'proofReq', width: 15 },
      { header: 'Completion', key: 'completion', width: 12 },
      { header: 'Expected End', key: 'expectedEnd', width: 15 },
      { header: 'Delay (Y/N)', key: 'delayYN', width: 12 },
      { header: 'Delay Reason', key: 'delayReason', width: 25 },
      { header: 'Carry Forward Count', key: 'carryForwardCount', width: 20 },
      { header: 'Last Carry Forward Date', key: 'lastCarryForwardDate', width: 20 },
      { header: 'Overdue Days', key: 'overdueDays', width: 15 },
      { header: 'Extra Note', key: 'extraNote', width: 25 },
      { header: 'Today\'s Work Summary', key: 'todaysWorkSummary', width: 30 },
      { header: 'Time Spent', key: 'timeSpent', width: 12 },
      { header: 'Blockers', key: 'blockers', width: 20 },
      { header: 'Additional Notes', key: 'additionalNotes', width: 25 },
      { header: 'Change Given By', key: 'changeGivenBy', width: 18 },
      { header: 'Changes Summary', key: 'changesSummary', width: 25 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Work Done Proof', key: 'workDoneProof', width: 25 },
      { header: 'Reject Reason', key: 'rejectReason', width: 20 },
      { header: 'Review and Approve', key: 'reviewAndApprove', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Action', key: 'action', width: 12 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2563EB' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    for (const r of rows) {
      worksheet.addRow({
        date: r.startDate ? (r.startDate instanceof Date ? r.startDate.toISOString().split('T')[0] : new Date(r.startDate).toISOString().split('T')[0]) : '-',
        employeeName: r.employeeName,
        role: r.jobRole || '-',
        project: r.project,
        task: r.taskDescription,
        startTime: r.startTime || '-',
        endTime: r.endTime || '-',
        taskType: r.assignmentType ? `${r.assignmentType} TASK` : '-',
        assignedBy: r.assignedByName || '-',
        assignedTo: r.assignedToName || '-',
        proofReq: r.proofRequired || 'No',
        completion: `${r.completionPercentage || 0}%`,
        expectedEnd: r.expectedEndDate ? (r.expectedEndDate instanceof Date ? r.expectedEndDate.toISOString().split('T')[0] : new Date(r.expectedEndDate).toISOString().split('T')[0]) : '-',
        delayYN: r.status === 'DELAYED' ? 'Yes' : 'No',
        delayReason: r.delayReason || '-',
        carryForwardCount: r.carryForwardCount ?? 0,
        lastCarryForwardDate: r.lastCarryForwardDate ? (r.lastCarryForwardDate instanceof Date ? r.lastCarryForwardDate.toISOString().split('T')[0] : new Date(r.lastCarryForwardDate).toISOString().split('T')[0]) : '-',
        overdueDays: r.overdueDays ?? 0,
        extraNote: r.notes || '-',
        todaysWorkSummary: r.completedWorkDescription || '-',
        timeSpent: r.timeSpent || 0,
        blockers: r.blockers || '-',
        additionalNotes: r.additionalNotes || '-',
        changeGivenBy: r.changesGivenBy || '-',
        changesSummary: r.changesSummary || '-',
        priority: r.priority || '-',
        workDoneProof: r.proofUrl || '-',
        rejectReason: r.rejectionReason || '-',
        reviewAndApprove: r.approvalStatus || '-',
        status: r.status,
        action: '-',
      });
    }

    worksheet.eachRow((row, rowNumber) => {
      row.alignment = { vertical: 'middle', wrapText: true };
      if (rowNumber > 1) {
        row.border = {
          top: { style: 'thin', color: { argb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        };
      }
    });

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async exportPdf(dateStr?: string, tab?: string, projectId?: string, search?: string): Promise<Buffer> {
    const rows = await this.getDailyReviewData(dateStr, tab, projectId, search);
    const dateFormatted = dateStr ? dateStr : 'All / Filtered';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(18).font('Helvetica-Bold').fillColor('#1e293b').text(`Daily Task Review`, { align: 'center' });
      doc.fontSize(12).font('Helvetica').fillColor('#64748b').text(`Date: ${dateFormatted}`, { align: 'center' });
      doc.moveDown(2);

      const startX = 30;
      let y = doc.y;

      const drawRow = (yPos: number, emp: string, proj: string, desc: string, stat: string, isHeader = false) => {
        doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor(isHeader ? '#ffffff' : '#334155');
        if (isHeader) {
          doc.rect(startX, yPos - 5, 780, 20).fill('#2563EB');
          doc.fillColor('#ffffff');
        } else {
          doc.rect(startX, yPos - 5, 780, 20).fill(yPos % 40 === 0 ? '#f8fafc' : '#ffffff');
          doc.fillColor('#334155');
        }
        doc.text(emp.substring(0, 15), startX + 5, yPos, { width: 95, lineBreak: false });
        doc.text(proj.substring(0, 12), startX + 105, yPos, { width: 75, lineBreak: false });
        doc.text(desc.substring(0, 80), startX + 185, yPos, { width: 445, lineBreak: false });
        doc.text(stat, startX + 635, yPos, { width: 95, lineBreak: false });
      };

      drawRow(y, 'Employee', 'Project', 'Description', 'Status', true);
      y += 20;

      for (const r of rows) {
        if (y > 550) {
          doc.addPage();
          y = 40;
          drawRow(y, 'Employee', 'Project', 'Description', 'Status', true);
          y += 20;
        }
        drawRow(y, r.employeeName, r.project, (r.taskDescription || '').replace(/\n/g, ' '), r.status);
        y += 20;
      }

      doc.end();
    });
  }

  async getPerformanceReport(employeeId?: number, startDateStr?: string, endDateStr?: string) {
    const whereClause: any = { deletedAt: null };
    if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    if (startDateStr && endDateStr) {
      whereClause.startDate = {
        gte: new Date(startDateStr),
        lte: new Date(endDateStr),
      };
    }

    const tasks = await this.prisma.task.findMany({
      where: whereClause,
      include: {
        employee: { select: { name: true, email: true } },
        projects: true,
      },
    });

    const employeeStats = new Map<number, {
      name: string;
      email: string;
      total: number;
      completed: number;
      delayed: number;
      pending: number;
      onHold: number;
    }>();

    for (const t of tasks) {
      const empId = t.employeeId;
      if (!employeeStats.has(empId)) {
        employeeStats.set(empId, {
          name: t.employee.name,
          email: t.employee.email,
          total: 0,
          completed: 0,
          delayed: 0,
          pending: 0,
          onHold: 0,
        });
      }

      const stat = employeeStats.get(empId);
      
      for (const p of t.projects) {
        stat.total++;
        if (p.status === TaskStatus.COMPLETED) stat.completed++;
        else if (p.status === TaskStatus.DELAYED) stat.delayed++;
        else if (p.status === TaskStatus.PENDING) stat.pending++;
        else if (p.status === TaskStatus.ON_HOLD) stat.onHold++;
      }
    }

    return Array.from(employeeStats.entries()).map(([id, s]) => {
      const completionRate = s.total > 0 ? (s.completed / s.total) * 100 : 0;
      return {
        employeeId: id,
        ...s,
        completionRate: parseFloat(completionRate.toFixed(2)),
      };
    });
  }

  async getDashboardAnalytics() {
    const taskProjects = await this.prisma.taskProject.findMany({
      where: { deletedAt: null },
      include: { project: true, task: { include: { employee: true } } },
    });

    const statusCounts = { PENDING: 0, IN_PROGRESS: 0, COMPLETED: 0, DELAYED: 0, ON_HOLD: 0, BLOCKED: 0 };
    const projectStats = new Map<string, { total: number; completed: number }>();

    const weeklyCounts = new Map<string, number>();
    const dateNames = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      weeklyCounts.set(str, 0);
      dateNames.push(str);
    }

    for (const p of taskProjects) {
      if (statusCounts[p.status] !== undefined) {
        statusCounts[p.status]++;
      }

      const projName = p.project?.name || 'Unknown';
      if (!projectStats.has(projName)) {
        projectStats.set(projName, { total: 0, completed: 0 });
      }
      const pStat = projectStats.get(projName);
      pStat.total++;
      if (p.status === TaskStatus.COMPLETED) pStat.completed++;

      if (p.status === TaskStatus.COMPLETED) {
        const compDateStr = p.updatedAt.toISOString().split('T')[0];
        if (weeklyCounts.has(compDateStr)) {
          weeklyCounts.set(compDateStr, weeklyCounts.get(compDateStr) + 1);
        }
      }
    }

    const projectProgress = Array.from(projectStats.entries()).map(([name, s]) => {
      const rate = s.total > 0 ? (s.completed / s.total) * 100 : 0;
      return { name, totalTasks: s.total, completedTasks: s.completed, progress: parseFloat(rate.toFixed(2)) };
    });

    const weeklyProductivity = dateNames.map((dateStr) => {
      const parsedDate = new Date(dateStr);
      const label = parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      return { date: label, completedTasks: weeklyCounts.get(dateStr) };
    });

    const empReport = await this.getPerformanceReport();

    return {
      statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
      projectProgress,
      weeklyProductivity,
      employeePerformance: empReport.map((e) => ({
        name: e.name,
        completionRate: e.completionRate,
        totalTasks: e.total,
      })),
    };
  }

  private parseTimeToHours(timeStr: string | null | undefined): number {
    if (!timeStr) return 0;
    const clean = timeStr.trim().toUpperCase();
    const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (ampmMatch) {
      let hours = parseInt(ampmMatch[1], 10);
      const minutes = parseInt(ampmMatch[2], 10);
      const ampm = ampmMatch[3];
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      return hours + minutes / 60;
    }
    const militaryMatch = clean.match(/^(\d{1,2}):(\d{2})$/);
    if (militaryMatch) {
      const hours = parseInt(militaryMatch[1], 10);
      const minutes = parseInt(militaryMatch[2], 10);
      return hours + minutes / 60;
    }
    return 0;
  }

  private calculateDelayHours(expectedEndDate: Date, status: string, completionDate?: Date | null): number {
    const now = new Date();
    const targetEnd = new Date(expectedEndDate);
    const finishDate = completionDate ? new Date(completionDate) : null;
    
    if (status === 'COMPLETED' || status === 'APPROVED') {
      if (finishDate && finishDate.getTime() > targetEnd.getTime()) {
        return Math.max(0, (finishDate.getTime() - targetEnd.getTime()) / (1000 * 60 * 60));
      }
    } else {
      if (now.getTime() > targetEnd.getTime()) {
        return Math.max(0, (now.getTime() - targetEnd.getTime()) / (1000 * 60 * 60));
      }
    }
    return 0;
  }

  async getPerformanceIntelligence(employeeId?: number, startDateStr?: string, endDateStr?: string) {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateStr) {
      startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
    }
    if (endDateStr) {
      endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
    }

    // Get all active employees
    const employees = await this.prisma.user.findMany({
      where: {
        role: Role.EMPLOYEE,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const activeProjects = await this.prisma.project.count({
      where: {
        deletedAt: null,
      },
    });

    // Query active tasks
    const tasksWhere: any = {
      deletedAt: null,
      employee: {
        role: Role.EMPLOYEE,
        deletedAt: null,
      },
    };

    if (startDate || endDate) {
      tasksWhere.startDate = {};
      if (startDate) {
        tasksWhere.startDate.gte = startDate;
      }
      if (endDate) {
        tasksWhere.startDate.lte = endDate;
      }
    }

    const allTasks = await this.prisma.task.findMany({
      where: tasksWhere,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        projects: {
          where: {
            deletedAt: null,
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            submissions: {
              include: {
                revisions: true,
                approvals: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    // Map tasks and projects by employee
    const employeeTaskProjectsMap = new Map<number, any[]>();
    for (const employee of employees) {
      employeeTaskProjectsMap.set(employee.id, []);
    }

    const projectTotals = new Map<number, { completedCount: number; totalHours: number }>();

    for (const task of allTasks) {
      const empId = task.employeeId;
      if (!employeeTaskProjectsMap.has(empId)) {
        employeeTaskProjectsMap.set(empId, []);
      }
      for (const tp of task.projects) {
        const row = {
          ...tp,
          task,
        };
        employeeTaskProjectsMap.get(empId).push(row);

        // Project totals
        if (!projectTotals.has(tp.projectId)) {
          projectTotals.set(tp.projectId, { completedCount: 0, totalHours: 0 });
        }
        const pt = projectTotals.get(tp.projectId);
        let actualHours = tp.timeSpent || 0;
        if (!actualHours && tp.startTime && tp.endTime) {
          actualHours = Math.max(0, this.parseTimeToHours(tp.endTime) - this.parseTimeToHours(tp.startTime));
        }
        pt.totalHours += actualHours;
        if (tp.status === 'COMPLETED' || tp.status === 'APPROVED') {
          pt.completedCount++;
        }
      }
    }

    // Process stats for each employee
    const employeeStats = employees.map(emp => {
      const tps = employeeTaskProjectsMap.get(emp.id) || [];
      const totalTasks = tps.length;
      
      let completedCount = 0;
      let delayedCount = 0;
      let pendingCount = 0;

      let actualHoursSum = 0;
      let expectedHoursSum = 0;
      let delayHoursSum = 0;
      
      const roleCounts = new Map<string, number>();
      let timelyCompletedCount = 0;
      let cleanApprovalsCount = 0;
      const uniqueProjects = new Set<number>();

      for (const tp of tps) {
        const status = tp.status;
        if (status === 'COMPLETED' || status === 'APPROVED') {
          completedCount++;
        } else if (status === 'DELAYED') {
          delayedCount++;
        } else {
          pendingCount++;
        }

        // Project ID set
        uniqueProjects.add(tp.projectId);

        // Role counting
        const role = tp.jobRoleType === 'Other' ? tp.customJobRole : tp.jobRoleType;
        if (role) {
          roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
        }

        // Time spent
        let actualHours = tp.timeSpent || 0;
        if (!actualHours && tp.startTime && tp.endTime) {
          actualHours = Math.max(0, this.parseTimeToHours(tp.endTime) - this.parseTimeToHours(tp.startTime));
        }
        actualHoursSum += actualHours;

        // Expected hours
        const expectedHours = tp.estimatedEffort || 8.0;
        expectedHoursSum += expectedHours;

        // Completion Date
        const completionDate = tp.approvedDate || tp.updatedAt;

        // Delay Hours
        const delayH = this.calculateDelayHours(tp.task.expectedEndDate, status, (status === 'COMPLETED' || status === 'APPROVED') ? completionDate : null);
        delayHoursSum += delayH;

        // Timely Completion
        if (status === 'COMPLETED' || status === 'APPROVED') {
          if (completionDate && completionDate.getTime() <= tp.task.expectedEndDate.getTime()) {
            timelyCompletedCount++;
          }
          // Quality (clean approval)
          const hasRevision = tp.submissions.some((s: any) => s.revisions.length > 0);
          if (!hasRevision) {
            cleanApprovalsCount++;
          }
        }
      }

      // Find primary job role
      let primaryJobRole = 'Generalist';
      let maxCount = 0;
      for (const [r, count] of roleCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          primaryJobRole = r;
        }
      }

      // Role match rate
      let matchedCount = 0;
      for (const tp of tps) {
        const role = tp.jobRoleType === 'Other' ? tp.customJobRole : tp.jobRoleType;
        if (role === primaryJobRole) {
          matchedCount++;
        }
      }
      const roleMatchRate = totalTasks > 0 ? (matchedCount / totalTasks) * 100 : 100;

      // Completion Rate (40%)
      const completionRateVal = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
      const scoreCompletion = completionRateVal * 0.40;

      // Timely Completion (25%)
      const timelyRateVal = completedCount > 0 ? (timelyCompletedCount / completedCount) * 100 : 100;
      const scoreTimely = timelyRateVal * 0.25;

      // Delay Reduction (15%)
      const delayRateVal = totalTasks > 0 ? (1 - (delayedCount / totalTasks)) * 100 : 100;
      const scoreDelay = delayRateVal * 0.15;

      // Task Quality (10%)
      const qualityRateVal = completedCount > 0 ? (cleanApprovalsCount / completedCount) * 100 : 100;
      const scoreQuality = qualityRateVal * 0.10;

      // Project Participation (10%)
      const projectCount = uniqueProjects.size;
      const scoreProjectVal = Math.min(10, projectCount * 5); // 1 project = 5 pts, 2+ = 10 pts

      const rawScore = scoreCompletion + scoreTimely + scoreDelay + scoreQuality + scoreProjectVal;
      const performanceScore = parseFloat(Math.min(100, Math.max(0, rawScore)).toFixed(2));

      // Badge
      let badge = 'Needs Improvement';
      if (performanceScore >= 90) badge = 'Elite Performer';
      else if (performanceScore >= 80) badge = 'High Achiever';
      else if (performanceScore >= 70) badge = 'Consistent Contributor';
      else if (performanceScore >= 50) badge = 'Solid Performer';

      return {
        employeeId: emp.id,
        name: emp.name,
        email: emp.email,
        totalTasks,
        completedTasks: completedCount,
        delayedTasks: delayedCount,
        pendingTasks: pendingCount,
        actualHours: parseFloat(actualHoursSum.toFixed(2)),
        expectedHours: parseFloat(expectedHoursSum.toFixed(2)),
        extraHours: parseFloat(Math.max(0, actualHoursSum - expectedHoursSum).toFixed(2)),
        delayHours: parseFloat(delayHoursSum.toFixed(2)),
        primaryJobRole,
        roleMatchRate: parseFloat(roleMatchRate.toFixed(2)),
        cleanApprovalsRate: completedCount > 0 ? parseFloat(((cleanApprovalsCount / completedCount) * 100).toFixed(2)) : 100,
        timelyCompletionRate: completedCount > 0 ? parseFloat(((timelyCompletedCount / completedCount) * 100).toFixed(2)) : 100,
        performanceScore,
        badge,
        uniqueProjectsCount: projectCount,
        matchedCount,
        mismatchedCount: totalTasks - matchedCount,
      };
    });

    // Sort leaderboard by score descending
    const leaderboard = [...employeeStats].sort((a, b) => b.performanceScore - a.performanceScore);

    // Organization Summary
    const totalEmployees = employees.length;
    const totalTasks = employeeStats.reduce((sum, e) => sum + e.totalTasks, 0);
    const completedTasks = employeeStats.reduce((sum, e) => sum + e.completedTasks, 0);
    const delayedTasks = employeeStats.reduce((sum, e) => sum + e.delayedTasks, 0);
    const pendingTasks = employeeStats.reduce((sum, e) => sum + e.pendingTasks, 0);
    const totalWorkingHours = employeeStats.reduce((sum, e) => sum + e.actualHours, 0);
    const totalDelayHours = employeeStats.reduce((sum, e) => sum + e.delayHours, 0);
    const avgCompletionRate = totalTasks > 0 ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(2)) : 0;
    
    // Average employee productivity
    const avgPerformanceScore = totalEmployees > 0 
      ? parseFloat((employeeStats.reduce((sum, e) => sum + e.performanceScore, 0) / totalEmployees).toFixed(2)) 
      : 0;

    const orgSummary = {
      totalEmployees,
      totalProjects: activeProjects,
      totalTasks,
      completedTasks,
      delayedTasks,
      pendingTasks,
      avgCompletionRate,
      avgPerformanceScore,
      totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
      totalDelayHours: parseFloat(totalDelayHours.toFixed(2)),
    };

    // Admin Insights
    let topPerformer = null;
    let mostConsistent = null;
    let mostDelayed = null;
    let roleSpecialist = null;
    let mostTimeEfficient = null;

    if (employeeStats.length > 0) {
      // Top Performer
      topPerformer = leaderboard[0];

      // Most Consistent: highest completion rate, tie-break by total tasks
      const sortedByConsistency = [...employeeStats].sort((a, b) => {
        const crA = a.totalTasks > 0 ? a.completedTasks / a.totalTasks : 0;
        const crB = b.totalTasks > 0 ? b.completedTasks / b.totalTasks : 0;
        if (crB !== crA) return crB - crA;
        return b.totalTasks - a.totalTasks;
      });
      mostConsistent = sortedByConsistency[0];

      // Most Delayed: highest delay hours
      const sortedByDelay = [...employeeStats].sort((a, b) => b.delayHours - a.delayHours);
      mostDelayed = sortedByDelay[0];

      // Role Specialist: highest role matching rate, min 3 tasks
      const eligibleForSpecialist = employeeStats.filter(e => e.totalTasks >= 3);
      const specialistPool = eligibleForSpecialist.length > 0 ? eligibleForSpecialist : employeeStats;
      const sortedByRole = [...specialistPool].sort((a, b) => b.roleMatchRate - a.roleMatchRate);
      roleSpecialist = sortedByRole[0];

      // Most Time Efficient: highest ratio of expectedHours/actualHours where actualHours > 0 and completionRate >= 70%
      const eligibleForEfficiency = employeeStats.filter(e => e.actualHours > 0 && e.totalTasks > 0 && (e.completedTasks / e.totalTasks) >= 0.70);
      const efficiencyPool = eligibleForEfficiency.length > 0 ? eligibleForEfficiency : employeeStats.filter(e => e.actualHours > 0);
      
      const sortedByEfficiency = [...efficiencyPool].sort((a, b) => {
        const effA = a.expectedHours / a.actualHours;
        const effB = b.expectedHours / b.actualHours;
        return effB - effA;
      });
      mostTimeEfficient = sortedByEfficiency.length > 0 ? sortedByEfficiency[0] : null;
    }

    const adminInsights = {
      topPerformer: topPerformer ? { name: topPerformer.name, score: topPerformer.performanceScore } : null,
      mostConsistent: mostConsistent ? { name: mostConsistent.name, rate: mostConsistent.completedTasks > 0 ? parseFloat(((mostConsistent.completedTasks / mostConsistent.totalTasks) * 100).toFixed(2)) : 0 } : null,
      mostDelayed: mostDelayed ? { name: mostDelayed.name, hours: mostDelayed.delayHours } : null,
      roleSpecialist: roleSpecialist ? { name: roleSpecialist.name, rate: roleSpecialist.roleMatchRate, role: roleSpecialist.primaryJobRole } : null,
      mostTimeEfficient: mostTimeEfficient ? { name: mostTimeEfficient.name, ratio: parseFloat((mostTimeEfficient.expectedHours / mostTimeEfficient.actualHours).toFixed(2)) } : null,
    };

    // Build Individual Employee details if requested
    let selectedEmployeeId = employeeId;
    if (!selectedEmployeeId && employees.length > 0) {
      selectedEmployeeId = employees[0].id; // Fallback to first employee
    }

    let individualAnalytics = null;
    if (selectedEmployeeId) {
      const empStat = employeeStats.find(e => e.employeeId === selectedEmployeeId);
      if (empStat) {
        const empTaskProjects = employeeTaskProjectsMap.get(selectedEmployeeId) || [];

        // Project Contribution Breakdown
        const empProjects = new Map<number, { name: string; completedCount: number; hoursSpent: number }>();
        for (const tp of empTaskProjects) {
          if (!empProjects.has(tp.projectId)) {
            empProjects.set(tp.projectId, {
              name: tp.project?.name || 'Unknown',
              completedCount: 0,
              hoursSpent: 0,
            });
          }
          const ep = empProjects.get(tp.projectId);
          let actualHours = tp.timeSpent || 0;
          if (!actualHours && tp.startTime && tp.endTime) {
            actualHours = Math.max(0, this.parseTimeToHours(tp.endTime) - this.parseTimeToHours(tp.startTime));
          }
          ep.hoursSpent += actualHours;
          if (tp.status === 'COMPLETED' || tp.status === 'APPROVED') {
            ep.completedCount++;
          }
        }

        const projectContribution = Array.from(empProjects.entries()).map(([projectId, ep]) => {
          const pt = projectTotals.get(projectId) || { completedCount: 0, totalHours: 0 };
          const completedContributionPct = pt.completedCount > 0 ? (ep.completedCount / pt.completedCount) * 100 : 0;
          const hoursContributionPct = pt.totalHours > 0 ? (ep.hoursSpent / pt.totalHours) * 100 : 0;
          return {
            projectId,
            projectName: ep.name,
            tasksCompleted: ep.completedCount,
            hoursSpent: parseFloat(ep.hoursSpent.toFixed(2)),
            completedContributionPct: parseFloat(completedContributionPct.toFixed(2)),
            hoursContributionPct: parseFloat(hoursContributionPct.toFixed(2)),
          };
        });

        // Weekly Trend logs
        const trendMap = new Map<string, { completedTasks: number; delayedTasks: number; workingHours: number }>();
        const dateNames: string[] = [];
        const daysToGenerate = 14;
        for (let i = daysToGenerate - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const str = d.toISOString().split('T')[0];
          trendMap.set(str, { completedTasks: 0, delayedTasks: 0, workingHours: 0 });
          dateNames.push(str);
        }

        for (const tp of empTaskProjects) {
          const dateStrKey = new Date(tp.task.startDate).toISOString().split('T')[0];
          if (trendMap.has(dateStrKey)) {
            const dataObj = trendMap.get(dateStrKey);
            if (tp.status === 'COMPLETED' || tp.status === 'APPROVED') {
              dataObj.completedTasks++;
            } else if (tp.status === 'DELAYED') {
              dataObj.delayedTasks++;
            }
            let actualHours = tp.timeSpent || 0;
            if (!actualHours && tp.startTime && tp.endTime) {
              actualHours = Math.max(0, this.parseTimeToHours(tp.endTime) - this.parseTimeToHours(tp.startTime));
            }
            dataObj.workingHours += actualHours;
          }
        }

        const weeklyTrend = dateNames.map(dateStr => {
          const parsedDate = new Date(dateStr);
          const label = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const values = trendMap.get(dateStr);
          return {
            date: label,
            fullDate: dateStr,
            ...values,
            workingHours: parseFloat(values.workingHours.toFixed(1)),
          };
        });

        // Time Efficiency Chart logs
        const timeEfficiency = empTaskProjects.map(tp => {
          let actualHours = tp.timeSpent || 0;
          if (!actualHours && tp.startTime && tp.endTime) {
            actualHours = Math.max(0, this.parseTimeToHours(tp.endTime) - this.parseTimeToHours(tp.startTime));
          }
          const expectedHours = tp.estimatedEffort || 8.0;
          const extraHours = Math.max(0, actualHours - expectedHours);
          const completionDate = tp.approvedDate || tp.updatedAt;
          const delayHours = this.calculateDelayHours(tp.task.expectedEndDate, tp.status, (tp.status === 'COMPLETED' || tp.status === 'APPROVED') ? completionDate : null);

          return {
            taskDescription: tp.taskDescription.length > 30 ? tp.taskDescription.substring(0, 30) + '...' : tp.taskDescription,
            project: tp.project?.name || 'N/A',
            expectedHours,
            actualHours: parseFloat(actualHours.toFixed(1)),
            extraHours: parseFloat(extraHours.toFixed(1)),
            delayHours: parseFloat(delayHours.toFixed(1)),
          };
        });

        individualAnalytics = {
          ...empStat,
          projectContribution,
          roleProductivity: {
            matchedCount: empStat.matchedCount,
            mismatchedCount: empStat.mismatchedCount,
          },
          weeklyTrend,
          timeEfficiency,
        };
      }
    }

    return {
      orgSummary,
      leaderboard,
      adminInsights,
      individualAnalytics,
    };
  }

  async exportPerformanceExcel(employeeId?: number, startDateStr?: string, endDateStr?: string): Promise<Buffer> {
    const data = await this.getPerformanceIntelligence(employeeId, startDateStr, endDateStr);
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Organization Summary & Leaderboard
    const summarySheet = workbook.addWorksheet('Org Performance Overview');
    
    // Executive Metrics
    summarySheet.addRow(['EXECUTIVE PERFORMANCE METRICS OVERVIEW']).font = { bold: true, size: 14 };
    summarySheet.addRow([]);
    
    const summary = data.orgSummary;
    summarySheet.addRow(['Metric', 'Value']);
    summarySheet.addRow(['Total Employees', summary.totalEmployees]);
    summarySheet.addRow(['Total Projects', summary.totalProjects]);
    summarySheet.addRow(['Total Tasks Logs', summary.totalTasks]);
    summarySheet.addRow(['Completed Tasks', summary.completedTasks]);
    summarySheet.addRow(['Delayed Tasks', summary.delayedTasks]);
    summarySheet.addRow(['Pending Tasks', summary.pendingTasks]);
    summarySheet.addRow(['Average Completion Rate', `${summary.avgCompletionRate}%`]);
    summarySheet.addRow(['Org Productivity Score', `${summary.avgPerformanceScore}/100`]);
    summarySheet.addRow(['Total Working Hours', summary.totalWorkingHours]);
    summarySheet.addRow(['Total Delay Hours', summary.totalDelayHours]);
    
    summarySheet.getColumn(1).width = 30;
    summarySheet.getColumn(2).width = 15;
    
    // Style Executive Summary table
    for (let i = 3; i <= 13; i++) {
      const row = summarySheet.getRow(i);
      if (i === 3) {
        row.font = { bold: true, color: { argb: 'FFFFFF' } };
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
      } else {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'F3F4F6' : 'FFFFFF' } };
      }
      row.alignment = { horizontal: 'left' };
    }
    
    // Add space and Leaderboard
    summarySheet.addRow([]);
    summarySheet.addRow([]);
    summarySheet.addRow(['EMPLOYEE PERFORMANCE LEADERBOARD']).font = { bold: true, size: 14 };
    summarySheet.addRow([]);
    
    summarySheet.addRow(['Rank', 'Name', 'Email', 'Total Tasks', 'Completed Tasks', 'Hours Worked', 'Delay Hours', 'Efficiency Score', 'Performance Badge']);
    
    data.leaderboard.forEach((emp, index) => {
      summarySheet.addRow([
        index + 1,
        emp.name,
        emp.email,
        emp.totalTasks,
        emp.completedTasks,
        emp.actualHours,
        emp.delayHours,
        emp.performanceScore,
        emp.badge
      ]);
    });
    
    // Style Leaderboard Table
    const startRow = 18;
    const endRow = startRow + data.leaderboard.length;
    summarySheet.getRow(startRow).font = { bold: true, color: { argb: 'FFFFFF' } };
    summarySheet.getRow(startRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
    
    for (let i = startRow + 1; i <= endRow; i++) {
      const row = summarySheet.getRow(i);
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'EEF2F6' : 'FFFFFF' } };
      row.alignment = { horizontal: 'left' };
    }
    
    // Auto-adjust width for all columns in Sheet 1
    for (let col = 1; col <= 9; col++) {
      summarySheet.getColumn(col).width = col === 3 ? 30 : col === 2 ? 22 : 15;
    }

    // Sheet 2: Selected Employee Performance (if analytics is present)
    if (data.individualAnalytics) {
      const emp = data.individualAnalytics;
      const empSheet = workbook.addWorksheet(`${emp.name.substring(0, 15)} Analytics`);
      
      empSheet.addRow([`DETAILED PERFORMANCE SUMMARY - ${emp.name.toUpperCase()}`]).font = { bold: true, size: 14 };
      empSheet.addRow([]);
      empSheet.addRow(['KPI Metric', 'Measurement']);
      empSheet.addRow(['Email Address', emp.email]);
      empSheet.addRow(['Derived Primary Role', emp.primaryJobRole]);
      empSheet.addRow(['Overall Performance Score', `${emp.performanceScore}/100`]);
      empSheet.addRow(['Intelligence Performance Badge', emp.badge]);
      empSheet.addRow(['Total Logged Tasks', emp.totalTasks]);
      empSheet.addRow(['Completed Tasks', emp.completedTasks]);
      empSheet.addRow(['Delayed Tasks', emp.delayedTasks]);
      empSheet.addRow(['Pending Tasks', emp.pendingTasks]);
      empSheet.addRow(['Total Hours Worked', `${emp.actualHours} hrs`]);
      empSheet.addRow(['Total Delay Hours', `${emp.delayHours} hrs`]);
      empSheet.addRow(['Role Matching rate', `${emp.roleMatchRate}%`]);
      empSheet.addRow(['Clean Approval Rate (No Revisions)', `${emp.cleanApprovalsRate}%`]);
      empSheet.addRow(['On-Time Completion Rate', `${emp.timelyCompletionRate}%`]);

      // Style employee KPI summary
      for (let i = 3; i <= 17; i++) {
        const row = empSheet.getRow(i);
        if (i === 3) {
          row.font = { bold: true, color: { argb: 'FFFFFF' } };
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F766E' } };
        } else {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'F0FDF4' : 'FFFFFF' } };
        }
      }

      empSheet.addRow([]);
      empSheet.addRow([]);
      empSheet.addRow(['PROJECT CONTRIBUTION BREAKDOWN']).font = { bold: true, size: 12 };
      empSheet.addRow([]);
      
      empSheet.addRow(['Project Name', 'Tasks Completed', 'Hours Invested', 'Contribution % (Tasks)', 'Contribution % (Hours)']);
      
      emp.projectContribution.forEach((proj: any) => {
        empSheet.addRow([
          proj.projectName,
          proj.tasksCompleted,
          proj.hoursSpent,
          `${proj.completedContributionPct}%`,
          `${proj.hoursContributionPct}%`
        ]);
      });

      const projStartRow = 22;
      const projEndRow = projStartRow + emp.projectContribution.length;
      empSheet.getRow(projStartRow).font = { bold: true, color: { argb: 'FFFFFF' } };
      empSheet.getRow(projStartRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0369A1' } };

      for (let i = projStartRow + 1; i <= projEndRow; i++) {
        const row = empSheet.getRow(i);
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'F0F9FF' : 'FFFFFF' } };
      }

      empSheet.getColumn(1).width = 25;
      empSheet.getColumn(2).width = 20;
      empSheet.getColumn(3).width = 20;
      empSheet.getColumn(4).width = 25;
      empSheet.getColumn(5).width = 25;
    }
    
    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async exportPerformancePdf(employeeId?: number, startDateStr?: string, endDateStr?: string): Promise<Buffer> {
    const data = await this.getPerformanceIntelligence(employeeId, startDateStr, endDateStr);
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const buffers: Buffer[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Cover / Header Banner
      doc.rect(40, 40, 760, 60).fill('#1E3A8A');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18).text('EMPLOYEE PERFORMANCE INTELLIGENCE REPORT', 60, 60);
      
      const dateRangeStr = (startDateStr || endDateStr) 
        ? `Filtered Period: ${startDateStr || 'Start'} to ${endDateStr || 'End'}` 
        : `Overall Period - All Logged Tasks`;
      doc.fontSize(10).font('Helvetica').text(dateRangeStr, 60, 82);
      
      doc.moveDown(4);
      let y = 120;

      // Draw Executive Summary Cards
      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(12).text('Organization Executive Summary', 40, y);
      y += 18;

      const summary = data.orgSummary;
      const kpis = [
        { label: 'Total Employees', val: summary.totalEmployees },
        { label: 'Total Projects', val: summary.totalProjects },
        { label: 'Total Tasks Logs', val: summary.totalTasks },
        { label: 'Completed Tasks', val: summary.completedTasks },
        { label: 'Avg Completion Rate', val: `${summary.avgCompletionRate}%` },
        { label: 'Org Productivity Score', val: `${summary.avgPerformanceScore}/100` },
      ];

      kpis.forEach((k, idx) => {
        const cardX = 40 + (idx * 123);
        doc.rect(cardX, y, 115, 50).fill('#F3F4F6');
        doc.fillColor('#475569').fontSize(8).font('Helvetica').text(k.label, cardX + 5, y + 8, { width: 105, align: 'center' });
        doc.fillColor('#1E3A8A').fontSize(11).font('Helvetica-Bold').text(String(k.val), cardX + 5, y + 26, { width: 105, align: 'center' });
      });

      y += 70;

      // Draw Admin Insights
      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(12).text('Intelligence Admin Insights', 40, y);
      y += 18;

      const insights = data.adminInsights;
      const insightsList = [
        `Top Performer: ${insights.topPerformer ? `${insights.topPerformer.name} (${insights.topPerformer.score}/100)` : 'N/A'}`,
        `Most Consistent: ${insights.mostConsistent ? `${insights.mostConsistent.name} (${insights.mostConsistent.rate}% Completion)` : 'N/A'}`,
        `Most Time Efficient: ${insights.mostTimeEfficient ? `${insights.mostTimeEfficient.name} (${insights.mostTimeEfficient.ratio}x efficiency)` : 'N/A'}`,
        `Most Delayed: ${insights.mostDelayed ? `${insights.mostDelayed.name} (${insights.mostDelayed.hours} hrs delayed)` : 'N/A'}`,
        `Role Specialist: ${insights.roleSpecialist ? `${insights.roleSpecialist.name} (${insights.roleSpecialist.rate}% matching ${insights.roleSpecialist.role})` : 'N/A'}`
      ];

      insightsList.forEach((ins, idx) => {
        doc.fillColor('#0F766E').fontSize(9).font('Helvetica-Bold').text('• ', 40, y + (idx * 16));
        doc.fillColor('#334155').font('Helvetica').text(ins, 50, y + (idx * 16));
      });

      y += 100;

      // Page break for Leaderboard
      doc.addPage();
      let ly = 40;
      doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(14).text('Performance Leaderboard & Rankings', 40, ly);
      ly += 22;

      // Draw table header
      doc.rect(40, ly, 760, 20).fill('#4F46E5');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
      doc.text('Rank', 45, ly + 6);
      doc.text('Employee Name', 90, ly + 6);
      doc.text('Email Address', 240, ly + 6);
      doc.text('Total Tasks', 410, ly + 6);
      doc.text('Completed', 490, ly + 6);
      doc.text('Hours Spent', 570, ly + 6);
      doc.text('Delay Hours', 650, ly + 6);
      doc.text('Score / Badge', 720, ly + 6);
      ly += 20;

      data.leaderboard.forEach((emp, idx) => {
        if (ly > 520) {
          doc.addPage();
          ly = 40;
          doc.rect(40, ly, 760, 20).fill('#4F46E5');
          doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
          doc.text('Rank', 45, ly + 6);
          doc.text('Employee Name', 90, ly + 6);
          doc.text('Email Address', 240, ly + 6);
          doc.text('Total Tasks', 410, ly + 6);
          doc.text('Completed', 490, ly + 6);
          doc.text('Hours Spent', 570, ly + 6);
          doc.text('Delay Hours', 650, ly + 6);
          doc.text('Score / Badge', 720, ly + 6);
          ly += 20;
        }

        doc.rect(40, ly, 760, 20).fill(idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF');
        doc.fillColor('#1E293B').font('Helvetica').fontSize(9);
        doc.text(String(idx + 1), 45, ly + 6);
        doc.text(emp.name, 90, ly + 6);
        doc.text(emp.email, 240, ly + 6);
        doc.text(String(emp.totalTasks), 410, ly + 6);
        doc.text(String(emp.completedTasks), 490, ly + 6);
        doc.text(String(emp.actualHours), 570, ly + 6);
        doc.text(String(emp.delayHours), 650, ly + 6);
        doc.font('Helvetica-Bold').text(`${emp.performanceScore} (${emp.badge})`, 720, ly + 6);
        ly += 20;
      });

      // Individual Employee Section (if selected)
      if (data.individualAnalytics) {
        const emp = data.individualAnalytics;
        doc.addPage();
        let ey = 40;
        
        doc.rect(40, ey, 760, 40).fill('#0F766E');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(14).text(`Detailed Analysis: ${emp.name.toUpperCase()}`, 60, ey + 12);
        ey += 60;

        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(12).text('KPI Detail Metrics', 40, ey);
        ey += 18;

        const empKpis = [
          { label: 'Performance Score', val: `${emp.performanceScore}/100` },
          { label: 'Badge', val: emp.badge },
          { label: 'Primary Job Role', val: emp.primaryJobRole },
          { label: 'Role Match Rate', val: `${emp.roleMatchRate}%` },
          { label: 'Completion Rate', val: `${emp.timelyCompletionRate}%` },
          { label: 'Clean Approvals', val: `${emp.cleanApprovalsRate}%` },
        ];

        empKpis.forEach((k, idx) => {
          const cardX = 40 + (idx * 123);
          doc.rect(cardX, ey, 115, 50).fill('#F0FDF4');
          doc.fillColor('#374151').fontSize(8).font('Helvetica').text(k.label, cardX + 5, ey + 8, { width: 105, align: 'center' });
          doc.fillColor('#0F766E').fontSize(10).font('Helvetica-Bold').text(String(k.val), cardX + 5, ey + 26, { width: 105, align: 'center' });
        });

        ey += 80;

        doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(12).text('Project Contribution Breakdowns', 40, ey);
        ey += 18;

        doc.rect(40, ey, 760, 20).fill('#0369A1');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
        doc.text('Project Name', 45, ey + 6);
        doc.text('Tasks Completed', 300, ey + 6);
        doc.text('Hours Invested', 430, ey + 6);
        doc.text('Contribution % (Tasks)', 550, ey + 6);
        doc.text('Contribution % (Hours)', 680, ey + 6);
        ey += 20;

        emp.projectContribution.forEach((proj: any, idx: number) => {
          if (ey > 520) {
            doc.addPage();
            ey = 40;
            doc.rect(40, ey, 760, 20).fill('#0369A1');
            doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
            doc.text('Project Name', 45, ey + 6);
            doc.text('Tasks Completed', 300, ey + 6);
            doc.text('Hours Invested', 430, ey + 6);
            doc.text('Contribution % (Tasks)', 550, ey + 6);
            doc.text('Contribution % (Hours)', 680, ey + 6);
            ey += 20;
          }

          doc.rect(40, ey, 760, 20).fill(idx % 2 === 0 ? '#F0F9FF' : '#FFFFFF');
          doc.fillColor('#1E293B').font('Helvetica').fontSize(9);
          doc.text(proj.projectName, 45, ey + 6);
          doc.text(String(proj.tasksCompleted), 300, ey + 6);
          doc.text(`${proj.hoursSpent} hrs`, 430, ey + 6);
          doc.text(`${proj.completedContributionPct}%`, 550, ey + 6);
          doc.text(`${proj.hoursContributionPct}%`, 680, ey + 6);
          ey += 20;
        });
      }

      doc.end();
    });
  }
}


import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus, Role } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { Writable } from 'stream';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDailyReviewData(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    const tasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        startDate: { gte: start, lte: end },
      },
      include: {
        employee: {
          select: { name: true, email: true },
        },
        projects: {
          include: {
            project: { select: { name: true } },
          }
        }
      },
      orderBy: { employee: { name: 'asc' } },
    });

    const flattenedRows = [];
    for (const t of tasks) {
      if (t.projects && t.projects.length > 0) {
        for (const p of t.projects) {
          flattenedRows.push({
            id: p.id,
            taskId: t.id,
            startDate: t.startDate,
            employeeName: t.employee?.name || 'N/A',
            startTime: t.startTime,
            expectedEndDate: t.expectedEndDate,
            project: p.project?.name || 'N/A',
            taskDescription: p.taskDescription,
            changesGivenBy: p.changesGivenBy,
            changesSummary: p.changesSummary,
            status: p.status,
            delayReason: p.delayReason,
          });
        }
      }
    }
    return flattenedRows;
  }

  async exportExcel(dateStr?: string): Promise<Buffer> {
    const rows = await this.getDailyReviewData(dateStr);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daily Task Review');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Employee Name', key: 'employeeName', width: 20 },
      { header: 'Start Time', key: 'startTime', width: 12 },
      { header: 'Expected End Time', key: 'expectedEnd', width: 22 },
      { header: 'Project', key: 'project', width: 15 },
      { header: 'Task Description', key: 'description', width: 35 },
      { header: 'Changes Given By', key: 'changesBy', width: 18 },
      { header: 'Changes Summary', key: 'changesSummary', width: 25 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Delay Reason', key: 'delayReason', width: 25 },
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
        date: r.startDate.toISOString().split('T')[0],
        employeeName: r.employeeName,
        startTime: r.startTime,
        expectedEnd: r.expectedEndDate.toISOString().replace('T', ' ').substring(0, 19),
        project: r.project,
        description: r.taskDescription,
        changesBy: r.changesGivenBy || '-',
        changesSummary: r.changesSummary || '-',
        status: r.status,
        delayReason: r.delayReason || '-',
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

  async exportPdf(dateStr?: string): Promise<Buffer> {
    const rows = await this.getDailyReviewData(dateStr);
    const dateFormatted = (dateStr ? new Date(dateStr) : new Date()).toISOString().split('T')[0];

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
        drawRow(y, r.employeeName, r.project, r.taskDescription.replace(/\n/g, ' '), r.status);
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
}

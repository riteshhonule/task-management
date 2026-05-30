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

    return this.prisma.task.findMany({
      where: {
        deletedAt: null,
        date: { gte: start, lte: end },
      },
      include: {
        employee: {
          select: { name: true, email: true },
        },
        project: {
          select: { name: true },
        },
      },
      orderBy: { employee: { name: 'asc' } },
    });
  }

  async exportExcel(dateStr?: string): Promise<Buffer> {
    const tasks = await this.getDailyReviewData(dateStr);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Daily Task Review');

    // Define columns
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

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2563EB' }, // Theme Primary color #2563EB
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Add rows
    for (const t of tasks) {
      worksheet.addRow({
        date: t.date.toISOString().split('T')[0],
        employeeName: t.employee?.name || 'N/A',
        startTime: t.startTime,
        expectedEnd: t.expectedCompletionDate.toISOString().replace('T', ' ').substring(0, 19),
        project: t.project?.name || 'N/A',
        description: t.description,
        changesBy: t.changesGivenBy || '-',
        changesSummary: t.changesSummary || '-',
        status: t.status,
        delayReason: t.delayReason || '-',
      });
    }

    // Auto fit rows
    worksheet.eachRow((row, rowNumber) => {
      row.alignment = { vertical: 'middle', wrapText: true };
      if (rowNumber > 1) {
        // Border style
        row.border = {
          top: { style: 'thin', color: { argb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        };
      }
    });

    return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async exportPdf(dateStr?: string): Promise<Buffer> {
    const tasks = await this.getDailyReviewData(dateStr);
    const dateFormatted = (dateStr ? new Date(dateStr) : new Date()).toISOString().split('T')[0];

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Title
      doc.fillColor('#2563EB').fontSize(20).text('Daily Task Review Sheet', { align: 'center' });
      doc.fillColor('#64748B').fontSize(12).text(`Date: ${dateFormatted}`, { align: 'center' }).moveDown(1.5);

      if (tasks.length === 0) {
        doc.fillColor('#0F172A').fontSize(14).text('No tasks recorded for this date.', { align: 'center' });
        doc.end();
        return;
      }

      // Draw Grid Headers
      let y = doc.y;
      doc.rect(30, y, 780, 24).fill('#2563EB');
      doc.fillColor('#FFFFFF').fontSize(9).text('Employee', 35, y + 7, { width: 90 });
      doc.text('Start / End', 130, y + 7, { width: 110 });
      doc.text('Proj', 245, y + 7, { width: 50 });
      doc.text('Description', 300, y + 7, { width: 220 });
      doc.text('Changes By / Summary', 525, y + 7, { width: 130 });
      doc.text('Status', 660, y + 7, { width: 60 });
      doc.text('Delay Reason', 725, y + 7, { width: 85 });

      y += 24;

      // Draw Tasks Rows
      doc.fillColor('#0F172A');
      for (const t of tasks) {
        // Page break checker
        if (y > 520) {
          doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
          y = 30;
          doc.rect(30, y, 780, 24).fill('#2563EB');
          doc.fillColor('#FFFFFF').text('Employee', 35, y + 7, { width: 90 });
          doc.text('Start / End', 130, y + 7, { width: 110 });
          doc.text('Proj', 245, y + 7, { width: 50 });
          doc.text('Description', 300, y + 7, { width: 220 });
          doc.text('Changes By / Summary', 525, y + 7, { width: 130 });
          doc.text('Status', 660, y + 7, { width: 60 });
          doc.text('Delay Reason', 725, y + 7, { width: 85 });
          y += 24;
          doc.fillColor('#0F172A');
        }

        // Draw separator line
        doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(30, y).lineTo(810, y).stroke();

        const descText = t.description;
        const timeText = `${t.startTime}\n${t.expectedCompletionDate.toISOString().replace('T', ' ').substring(11, 16)}`;
        const changeText = t.changesGivenBy ? `${t.changesGivenBy}:\n${t.changesSummary || ''}` : '-';

        doc.fontSize(8);
        doc.text(t.employee?.name || 'N/A', 35, y + 5, { width: 90 });
        doc.text(timeText, 130, y + 5, { width: 110 });
        doc.text(t.project?.name || 'N/A', 245, y + 5, { width: 50 });
        doc.text(descText, 300, y + 5, { width: 190 });
        doc.text(changeText, 525, y + 5, { width: 130 });
        doc.text(t.status, 660, y + 5, { width: 60 });
        doc.text(t.delayReason || '-', 725, y + 5, { width: 85 });

        // Row height calc
        const lines = Math.max(
          1,
          Math.ceil(descText.length / 32),
          Math.ceil(changeText.length / 22),
        );
        y += Math.max(35, lines * 10 + 10);
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
      whereClause.date = {
        gte: new Date(startDateStr),
        lte: new Date(endDateStr),
      };
    }

    const tasks = await this.prisma.task.findMany({
      where: whereClause,
      include: {
        employee: {
          select: { name: true, email: true },
        },
      },
    });

    // Group tasks by employee
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
      stat.total++;
      if (t.status === TaskStatus.COMPLETED) stat.completed++;
      else if (t.status === TaskStatus.DELAYED) stat.delayed++;
      else if (t.status === TaskStatus.PENDING) stat.pending++;
      else if (t.status === TaskStatus.ON_HOLD) stat.onHold++;
    }

    // Map to array and calculate rates
    const report = Array.from(employeeStats.entries()).map(([id, s]) => {
      const completionRate = s.total > 0 ? (s.completed / s.total) * 100 : 0;
      return {
        employeeId: id,
        ...s,
        completionRate: parseFloat(completionRate.toFixed(2)),
      };
    });

    return report;
  }

  async getDashboardAnalytics() {
    const tasks = await this.prisma.task.findMany({
      where: { deletedAt: null },
      include: { project: true, employee: true },
    });

    // 1. Task Status Distribution
    const statusCounts = {
      PENDING: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      DELAYED: 0,
      ON_HOLD: 0,
    };

    // 2. Project Progress (Task count per project)
    const projectStats = new Map<string, { total: number; completed: number }>();

    // 3. Weekly Productivity (tasks completed by date in last 7 days)
    const weeklyCounts = new Map<string, number>();
    const dateNames = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      weeklyCounts.set(str, 0);
      dateNames.push(str);
    }

    for (const t of tasks) {
      // Status counts
      statusCounts[t.status]++;

      // Project stats
      const projName = t.project?.name || 'Unknown';
      if (!projectStats.has(projName)) {
        projectStats.set(projName, { total: 0, completed: 0 });
      }
      const pStat = projectStats.get(projName);
      pStat.total++;
      if (t.status === TaskStatus.COMPLETED) {
        pStat.completed++;
      }

      // Weekly productivity (if completed in last 7 days)
      if (t.status === TaskStatus.COMPLETED) {
        const compDateStr = t.updatedAt.toISOString().split('T')[0];
        if (weeklyCounts.has(compDateStr)) {
          weeklyCounts.set(compDateStr, weeklyCounts.get(compDateStr) + 1);
        }
      }
    }

    const projectProgress = Array.from(projectStats.entries()).map(([name, s]) => {
      const rate = s.total > 0 ? (s.completed / s.total) * 100 : 0;
      return {
        name,
        totalTasks: s.total,
        completedTasks: s.completed,
        progress: parseFloat(rate.toFixed(2)),
      };
    });

    const weeklyProductivity = dateNames.map((dateStr) => {
      const parsedDate = new Date(dateStr);
      const label = parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      return {
        date: label,
        completedTasks: weeklyCounts.get(dateStr),
      };
    });

    // Employee Performance overview
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

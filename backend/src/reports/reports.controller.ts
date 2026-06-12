import { Controller, Get, Query, Res, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-review')
  @ApiOperation({ summary: 'Get daily tasks review list' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  getDailyReview(@Query('date') date?: string) {
    return this.reportsService.getDailyReviewData(date);
  }

  @Get('export-excel')
  @ApiOperation({ summary: 'Export daily tasks review to Excel' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD, YYYY-MM, or YYYY' })
  @ApiQuery({ name: 'tab', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async exportExcel(
    @Res() res: Response,
    @Query('date') date?: string,
    @Query('tab') tab?: string,
    @Query('projectId') projectId?: string,
    @Query('search') search?: string,
  ) {
    const buffer = await this.reportsService.exportExcel(date, tab, projectId, search);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=daily-review-${date || 'filtered'}.xlsx`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('export-pdf')
  @ApiOperation({ summary: 'Export daily tasks review to PDF' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD, YYYY-MM, or YYYY' })
  @ApiQuery({ name: 'tab', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async exportPdf(
    @Res() res: Response,
    @Query('date') date?: string,
    @Query('tab') tab?: string,
    @Query('projectId') projectId?: string,
    @Query('search') search?: string,
  ) {
    const buffer = await this.reportsService.exportPdf(date, tab, projectId, search);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=daily-review-${date || 'filtered'}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get employee performance rates (Employees see own, Admins see all)' })
  @ApiQuery({ name: 'employeeId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  getPerformance(
    @CurrentUser() user: User,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let targetEmployeeId = employeeId ? parseInt(employeeId) : undefined;
    if (user.role === Role.EMPLOYEE) {
      targetEmployeeId = user.id;
    }
    return this.reportsService.getPerformanceReport(targetEmployeeId, startDate, endDate);
  }

  @Get('analytics')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get aggregated analytics for dashboard charts (Admin/SuperAdmin only)' })
  getAnalytics() {
    return this.reportsService.getDashboardAnalytics();
  }

  @Get('performance-intelligence')
  @ApiOperation({ summary: 'Get advanced performance intelligence analytics' })
  @ApiQuery({ name: 'employeeId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  async getPerformanceIntelligence(
    @CurrentUser() user: User,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let targetEmployeeId = employeeId ? parseInt(employeeId) : undefined;
    if (user.role === Role.EMPLOYEE) {
      targetEmployeeId = user.id;
    }
    return this.reportsService.getPerformanceIntelligence(targetEmployeeId, startDate, endDate);
  }

  @Get('performance-intelligence/export-excel')
  @ApiOperation({ summary: 'Export performance intelligence to Excel' })
  @ApiQuery({ name: 'employeeId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  async exportPerformanceExcel(
    @Res() res: Response,
    @CurrentUser() user: User,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let targetEmployeeId = employeeId ? parseInt(employeeId) : undefined;
    if (user.role === Role.EMPLOYEE) {
      targetEmployeeId = user.id;
    }
    const buffer = await this.reportsService.exportPerformanceExcel(targetEmployeeId, startDate, endDate);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=performance-intelligence-${startDate || 'all'}-to-${endDate || 'all'}.xlsx`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('performance-intelligence/export-pdf')
  @ApiOperation({ summary: 'Export performance intelligence to PDF' })
  @ApiQuery({ name: 'employeeId', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  async exportPerformancePdf(
    @Res() res: Response,
    @CurrentUser() user: User,
    @Query('employeeId') employeeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    let targetEmployeeId = employeeId ? parseInt(employeeId) : undefined;
    if (user.role === Role.EMPLOYEE) {
      targetEmployeeId = user.id;
    }
    const buffer = await this.reportsService.exportPerformancePdf(targetEmployeeId, startDate, endDate);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=performance-intelligence-${startDate || 'all'}-to-${endDate || 'all'}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { Role, LeaveStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LeavesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async apply(dto: ApplyLeaveDto, employeeId: number) {
    const leave = await this.prisma.leave.create({
      data: {
        employeeId,
        leaveType: dto.leaveType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
        attachmentUrl: dto.attachmentUrl || null,
        status: LeaveStatus.APPROVED,
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formattedStart = formatDate(dto.startDate);
    const formattedEnd = formatDate(dto.endDate);

    // Notify admins
    const admins = await this.prisma.user.findMany({
      where: {
        role: { in: [Role.ADMIN, Role.SUPER_ADMIN] },
        deletedAt: null,
      },
      select: { id: true },
    });

    for (const admin of admins) {
      await this.notificationsService.createNotification(
        admin.id,
        'LEAVE_REQUEST',
        'New Leave Application',
        `${leave.employee.name} has submitted leave from ${formattedStart} to ${formattedEnd}.`,
        { type: 'LEAVE', leaveId: leave.id },
      );
    }

    this.notificationsService.broadcastEvent('leave_updated', { action: 'apply', leaveId: leave.id });
    return leave;
  }

  async findAll(currentUserId: number, currentUserRole: Role) {
    if (currentUserRole === Role.EMPLOYEE) {
      return this.prisma.leave.findMany({
        where: { employeeId: currentUserId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.leave.findMany({
      where: { deletedAt: null },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const leave = await this.prisma.leave.findFirst({
      where: { id, deletedAt: null },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!leave) {
      throw new NotFoundException('Leave application not found');
    }
    return leave;
  }

  async updateStatus(id: number, dto: UpdateLeaveStatusDto, adminId: number) {
    const leave = await this.findOne(id);

    if (leave.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave request has already been reviewed.');
    }

    const updatedLeave = await this.prisma.leave.update({
      where: { id },
      data: {
        status: dto.status,
        remarks: dto.remarks,
        approvedById: adminId,
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Notify employee of approval/rejection
    await this.notificationsService.createNotification(
      leave.employeeId,
      'LEAVE_STATUS',
      `Leave Request ${dto.status}`,
      `Your leave application from ${leave.startDate.toISOString().split('T')[0]} has been ${dto.status.toLowerCase()}.`,
    );

    this.notificationsService.broadcastEvent('leave_updated', { action: 'updateStatus', leaveId: updatedLeave.id });
    return updatedLeave;
  }
}

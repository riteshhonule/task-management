import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      if (existing.deletedAt) {
        // Restore soft-deleted user
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(dto.password, salt);
        const restored = await this.prisma.user.update({
          where: { email: dto.email },
          data: {
            name: dto.name,
            password: passwordHash,
            role: dto.role,
            mobileNumber: dto.mobileNumber,
            deletedAt: null,
          },
        });
        this.notificationsService.broadcastEvent('user_updated', { action: 'restore', userId: restored.id });
        return restored;
      }
      throw new BadRequestException('User with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        password: passwordHash,
        role: dto.role,
        mobileNumber: dto.mobileNumber,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mobileNumber: true,
        createdAt: true,
      },
    });
    this.notificationsService.broadcastEvent('user_updated', { action: 'create', userId: newUser.id });
    return newUser;
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mobileNumber: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findEmployees() {
    return this.prisma.user.findMany({
      where: {
        role: Role.EMPLOYEE,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mobileNumber: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mobileNumber: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    const updateData: any = { ...dto };

    if (dto.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(dto.password, salt);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mobileNumber: true,
        createdAt: true,
      },
    });
    this.notificationsService.broadcastEvent('user_updated', { action: 'update', userId: updated.id });
    return updated;
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    if (user.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete Super Admin account.');
    }
    const deleted = await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.notificationsService.broadcastEvent('user_updated', { action: 'delete', userId: id });
    return deleted;
  }

  async getActivityLogs() {
    return this.prisma.activityLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}

import { Controller, Get, Post, Body, Param, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { User, Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('announcements')
@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create an announcement and notify all employees (Admin/SuperAdmin only)' })
  create(@Body() createAnnouncementDto: CreateAnnouncementDto, @CurrentUser() user: User) {
    return this.announcementsService.create(createAnnouncementDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active announcements with acknowledge read flags' })
  findAll(@CurrentUser() user: User) {
    return this.announcementsService.findAll(user.id);
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Mark an announcement as read/acknowledged' })
  acknowledge(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.announcementsService.acknowledge(id, user.id);
  }

  @Get(':id/acks')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get list of employees who acknowledged this announcement (Admin/SuperAdmin only)' })
  getAcks(@Param('id', ParseIntPipe) id: number) {
    return this.announcementsService.getAcks(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete an announcement (Admin/SuperAdmin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.announcementsService.remove(id);
  }
}

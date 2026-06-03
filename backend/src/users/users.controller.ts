import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, User } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new user/employee (Admin/SuperAdmin only)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all users in the system (Admin/SuperAdmin only)' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('employees')
  @ApiOperation({ summary: 'Get list of active employees (Available to all logged-in users)' })
  findEmployees() {
    return this.usersService.findEmployees();
  }

  @Get('logs')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get recent activity logs (Admin/SuperAdmin only)' })
  getActivityLogs() {
    return this.usersService.getActivityLogs();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get details of a specific user (Admin/SuperAdmin only)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user details (Admins or user updating their own profile)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    if (currentUser.role !== Role.ADMIN && currentUser.role !== Role.SUPER_ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You can only update your own profile details');
    }
    // Prevent non-admin users from changing their own role
    if (currentUser.role !== Role.ADMIN && currentUser.role !== Role.SUPER_ADMIN) {
      delete updateUserDto.role;
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete a user (Admin/SuperAdmin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}

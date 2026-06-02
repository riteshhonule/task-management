import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new project (Admin/SuperAdmin only)' })
  create(@Body() createProjectDto: CreateProjectDto, @Request() req: any) {
    return this.projectsService.create(createProjectDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all active projects (all authenticated users)' })
  findAll() {
    return this.projectsService.findAll();
  }

  @Get('allocations/mine')
  @Roles(Role.EMPLOYEE)
  @ApiOperation({ summary: 'Get projects allocated to the logged-in employee' })
  findMyAllocations(@Request() req) {
    return this.projectsService.findMyAllocations(req.user.id);
  }

  @Patch('allocations/:id/accept')
  @Roles(Role.EMPLOYEE)
  @ApiOperation({ summary: 'Accept a project allocation' })
  acceptAllocation(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.projectsService.acceptAllocation(req.user.id, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific project (all authenticated users)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a project (Admin/SuperAdmin only)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateProjectDto: UpdateProjectDto, @Request() req: any) {
    return this.projectsService.update(id, updateProjectDto, req.user.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete a project (Admin/SuperAdmin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.remove(id);
  }
}

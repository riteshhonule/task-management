import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto) {
    const existing = await this.prisma.project.findUnique({
      where: { name: createProjectDto.name },
    });

    if (existing) {
      if (existing.deletedAt) {
        // Restore soft-deleted project
        return this.prisma.project.update({
          where: { name: createProjectDto.name },
          data: {
            description: createProjectDto.description,
            isArchived: false,
            deletedAt: null,
          },
        });
      }
      throw new BadRequestException('Project with this name already exists.');
    }

    return this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        description: createProjectDto.description,
      },
    });
  }

  async findAll() {
    return this.prisma.project.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async update(id: number, updateProjectDto: UpdateProjectDto) {
    await this.findOne(id); // Throws if not found/soft-deleted
    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

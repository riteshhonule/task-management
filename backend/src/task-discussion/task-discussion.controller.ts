import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '@prisma/client';
import { TaskDiscussionService } from './task-discussion.service';
import { CreateCommentDto } from './dto/discussion.dto';

@ApiTags('task-discussion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('task-discussion')
export class TaskDiscussionController {
  constructor(private readonly discussionService: TaskDiscussionService) {}

  @Post(':taskProjectId/comments')
  @ApiOperation({ summary: 'Add a comment to a task discussion' })
  addComment(
    @Param('taskProjectId', ParseIntPipe) taskProjectId: number,
    @CurrentUser() user: User,
    @Body() dto: CreateCommentDto,
  ) {
    return this.discussionService.addComment(user.id, taskProjectId, dto);
  }

  @Get(':taskProjectId/comments')
  @ApiOperation({ summary: 'Get comments and activity timeline for a task' })
  getComments(@Param('taskProjectId', ParseIntPipe) taskProjectId: number) {
    return this.discussionService.getComments(taskProjectId);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User, Role } from '@prisma/client';
import { ChatService } from './chat.service';
import { CreateConversationDto, UpdateGroupDto, AddMembersDto, ReactMessageDto } from './dto/chat.dto';
import { Roles } from '../auth/roles.decorator';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a direct or group conversation' })
  createConversation(@CurrentUser() user: User, @Body() dto: CreateConversationDto) {
    return this.chatService.createConversation(user.id, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get conversations for the current user' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search group name or members' })
  getConversations(@CurrentUser() user: User, @Query('search') search?: string) {
    return this.chatService.getConversations(user.id, search);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get paginated messages for a conversation' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of messages to retrieve' })
  @ApiQuery({ name: 'cursor', required: false, type: Number, description: 'Cursor message ID for pagination' })
  getMessages(
    @Param('id', ParseIntPipe) conversationId: number,
    @CurrentUser() user: User,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const cursorNum = cursor ? parseInt(cursor, 10) : undefined;
    return this.chatService.getMessages(conversationId, user.id, limitNum, cursorNum);
  }

  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all messages in conversation as read' })
  markAsRead(@Param('id', ParseIntPipe) conversationId: number, @CurrentUser() user: User) {
    return this.chatService.markAsRead(conversationId, user.id);
  }

  @Put('conversations/:id')
  @ApiOperation({ summary: 'Update group details' })
  updateGroup(
    @Param('id', ParseIntPipe) conversationId: number,
    @CurrentUser() user: User,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.chatService.updateGroup(conversationId, user.id, dto);
  }

  @Post('conversations/:id/members')
  @ApiOperation({ summary: 'Add members to group' })
  addMembers(
    @Param('id', ParseIntPipe) conversationId: number,
    @CurrentUser() user: User,
    @Body() dto: AddMembersDto,
  ) {
    return this.chatService.addMembers(conversationId, user.id, dto);
  }

  @Delete('conversations/:id/members/:userId')
  @ApiOperation({ summary: 'Remove a member from group (or leave group)' })
  removeMember(
    @Param('id', ParseIntPipe) conversationId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @CurrentUser() user: User,
  ) {
    return this.chatService.removeMember(conversationId, user.id, targetUserId);
  }

  @Post('messages/:id/react')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or toggle emoji reaction to message' })
  toggleReaction(
    @Param('id', ParseIntPipe) messageId: number,
    @CurrentUser() user: User,
    @Body() dto: ReactMessageDto,
  ) {
    return this.chatService.toggleReaction(messageId, user.id, dto.emoji);
  }

  @Put('messages/:id')
  @ApiOperation({ summary: 'Edit a message' })
  editMessage(
    @Param('id', ParseIntPipe) messageId: number,
    @CurrentUser() user: User,
    @Body('content') content: string,
  ) {
    return this.chatService.editMessage(messageId, user.id, content);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Delete a message' })
  deleteMessage(
    @Param('id', ParseIntPipe) messageId: number,
    @CurrentUser() user: User,
  ) {
    return this.chatService.deleteMessage(messageId, user.id, user.role);
  }
}

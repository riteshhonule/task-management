import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { RespondMessageDto } from './dto/respond-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { User, Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Send a message (Admin/SuperAdmin only)' })
  create(@Body() createMessageDto: CreateMessageDto, @CurrentUser() user: User) {
    return this.messagesService.create(createMessageDto, user.id);
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Respond to a mandatory message' })
  respond(
    @Param('id', ParseIntPipe) id: number,
    @Body() respondMessageDto: RespondMessageDto,
    @CurrentUser() user: User,
  ) {
    return this.messagesService.respond(id, respondMessageDto, user.id);
  }

  @Get('sent')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all messages sent by this Admin (Admin/SuperAdmin only)' })
  findAllSent(@CurrentUser() user: User) {
    return this.messagesService.findAllSent(user.id);
  }

  @Get('inbox')
  @ApiOperation({ summary: 'Get inbox messages targeting current user' })
  findInbox(@CurrentUser() user: User) {
    return this.messagesService.findUserMessages(user.id);
  }

  @Get('pending-mandatory')
  @ApiOperation({ summary: 'Get pending mandatory messages requiring attention (popup triggers)' })
  getPendingMandatory(@CurrentUser() user: User) {
    return this.messagesService.getPendingMessages(user.id);
  }
}

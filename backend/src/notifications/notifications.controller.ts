import { Controller, Get, Param, Patch, Query, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  findAll(
    @Request() req: { user: { id: string } },
    @Query('page') page = '1',
    @Query('perPage') perPage = '20',
  ) {
    return this.svc.findAll(req.user.id, Number(page), Number(perPage));
  }

  @Get('unread-count')
  unreadCount(@Request() req: { user: { id: string } }) {
    return this.svc.unreadCount(req.user.id);
  }

  @Patch('read-all')
  markAllRead(@Request() req: { user: { id: string } }) {
    return this.svc.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.svc.markRead(id, req.user.id);
  }
}

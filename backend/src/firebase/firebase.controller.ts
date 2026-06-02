import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('firebase')
export class FirebaseController {
  constructor(private readonly firebaseService: FirebaseService) {}

  @UseGuards(JwtAuthGuard)
  @Post('token')
  async registerToken(@Req() req, @Body() body: { fcmToken: string; deviceType?: string }) {
    await this.firebaseService.saveToken(req.user.id, body.fcmToken, body.deviceType);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('remove-token')
  async removeToken(@Body() body: { fcmToken: string }) {
    await this.firebaseService.removeToken(body.fcmToken);
    return { success: true };
  }
}

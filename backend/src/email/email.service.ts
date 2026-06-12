import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const port = parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10);
    // Since SMTP_SECURE might be a string "false" or "true", parse it accordingly
    const secureValue = this.configService.get<string>('SMTP_SECURE');
    const secure = secureValue === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendPasswordResetEmail(to: string, userName: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const from = this.configService.get<string>('SMTP_FROM') || `"TaskFlow OS" <${this.configService.get<string>('SMTP_USER')}>`;
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const html = `
      <p>Hello ${userName},</p>
      <p>We received a request to reset your TaskFlow OS password.</p>
      <p>Click the button below to create a new password.</p>
      <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #4f46e5; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request this reset, ignore this email.</p>
      <br/>
      <p>Regards,<br/>TaskFlow OS Team</p>
    `;

    await this.transporter.sendMail({
      from,
      to,
      subject: 'Reset Your TaskFlow OS Password',
      html,
    });
  }
}

import { Controller, Post, Get, Param, Res, UseInterceptors, UploadedFile, UseGuards, NotFoundException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload file (screenshot/PDF/document)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new NotFoundException('No file provided');
    }
    return this.uploadsService.uploadFile(file, req.user);
  }

  @Get('*')
  @ApiOperation({ summary: 'Serve uploaded file' })
  serveFile(@Param('0') filepath: string, @Res() res: Response) {
    if (!filepath) {
      throw new NotFoundException('File path not provided');
    }
    const fullPath = path.join(process.cwd(), 'uploads', filepath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File not found');
    }
    return res.sendFile(fullPath);
  }
}

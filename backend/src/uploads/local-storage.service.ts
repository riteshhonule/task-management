import { Injectable } from '@nestjs/common';
import { IStorageService } from './storage.interface';
import { User } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageService implements IStorageService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File, user?: any): Promise<string> {
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
    
    // Create hierarchy: uploads / <employee_name> / <YYYY-MM-DD>
    const userName = user?.name ? user.name.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown_user';
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    const targetDir = path.join(this.uploadDir, userName, dateStr);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, fileName);

    await fs.promises.writeFile(filePath, file.buffer);
    
    // Return relative path: userName/dateStr/fileName
    return `${userName}/${dateStr}/${fileName}`;
  }
}

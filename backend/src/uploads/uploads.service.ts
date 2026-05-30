import { Injectable, Inject } from '@nestjs/common';
import { IStorageService } from './storage.interface';

@Injectable()
export class UploadsService {
  constructor(
    @Inject('STORAGE_SERVICE') private readonly storageService: IStorageService,
  ) {}

  async uploadFile(file: Express.Multer.File) {
    const url = await this.storageService.saveFile(file);
    return {
      url,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }
}

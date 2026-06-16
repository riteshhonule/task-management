import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    {
      provide: 'STORAGE_SERVICE',
      useFactory: () => {
        if (
          process.env.AWS_ACCESS_KEY_ID &&
          process.env.AWS_SECRET_ACCESS_KEY &&
          process.env.AWS_S3_BUCKET
        ) {
          return new S3StorageService();
        }
        return new LocalStorageService();
      },
    },
  ],
  exports: [UploadsService],
})
export class UploadsModule {}

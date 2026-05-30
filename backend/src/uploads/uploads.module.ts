import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { LocalStorageService } from './local-storage.service';

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    {
      provide: 'STORAGE_SERVICE',
      useClass: LocalStorageService,
    },
  ],
  exports: [UploadsService],
})
export class UploadsModule {}

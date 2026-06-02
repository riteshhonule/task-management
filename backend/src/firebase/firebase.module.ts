import { Module, Global } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FirebaseController } from './firebase.controller';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [FirebaseService],
  exports: [FirebaseService],
  controllers: [FirebaseController]
})
export class FirebaseModule {}

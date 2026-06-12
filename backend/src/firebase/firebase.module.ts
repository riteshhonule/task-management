import { Module, Global } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FirebaseController } from './firebase.controller';
import '../config/firebase.config';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [FirebaseService],
  exports: [FirebaseService],
  controllers: [FirebaseController]
})
export class FirebaseModule {}

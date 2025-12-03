import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    StorageModule,

    MulterModule.register({
      storage: memoryStorage(), // Usar memory storage para ter acesso ao buffer
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return callback(new Error('Apenas imagens são permitidas!'), false);
        }
        callback(null, true);
      },
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}

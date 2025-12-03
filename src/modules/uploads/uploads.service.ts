import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MinIOService } from '../storage/minio.service';

@Injectable()
export class UploadsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly minioService: MinIOService,
  ) {}

  //Gera a URL pública do arquivo hospedado no MinIO
  getFileUrl(bucket: string, filename: string): string {
    const endpoint = this.configService.get<string>('MINIO_PUBLIC_URL') || 'http://localhost:9000';
    return `${endpoint}/${bucket}/${filename}`;
  }

  // Faz upload para o bucket desejado
  async uploadImage(file: Express.Multer.File): Promise<string> {
    const bucket = 'events';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;

    // Fazer upload para o MinIO
    const fileUrl = await this.minioService.uploadFile(
      bucket,
      fileName,
      file.buffer,
      file.mimetype,
    );

    // Retornar a URL presigned do MinIO
    return fileUrl;
  }

  // Exclui arquivo do bucket no MinIO
  async deleteFile(bucket: string, filename: string): Promise<void> {
    await this.minioService.deleteObject(bucket, filename);
  }
}

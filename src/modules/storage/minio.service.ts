import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { minioClient } from '../../config/minio.config';
import { Client } from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinIOService implements OnModuleInit {
  private readonly client: Client = minioClient;
  private readonly logger = new Logger(MinIOService.name);

  async onModuleInit() {
    await this.ensureBucket('avatars');
    await this.ensureBucket('events');
    await this.ensureBucket('uploads');
  }

  async ensureBucket(bucketName: string): Promise<void> {
    const exists = await this.client.bucketExists(bucketName);
    if (!exists) {
      await this.client.makeBucket(bucketName, '');
      this.logger.log(`Bucket ${bucketName} criado.`);
    }
  }

  async uploadFile(
    bucketName: string,
    fileName: string,
    file: Buffer,
    mimeType: string,
  ): Promise<string> {
    await this.ensureBucket(bucketName);
    await this.client.putObject(bucketName, fileName, file, file.length, {
      'Content-Type': mimeType,
    });

    return await this.getFileUrl(bucketName, fileName);
  }

  async downloadFile(bucketName: string, fileName: string): Promise<Buffer> {
    const stream = await this.client.getObject(bucketName, fileName);

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', (e) => reject(e));
    });
  }

  async getFileUrl(bucketName: string, fileName: string): Promise<string> {
    try {
      return await this.client.presignedGetObject(bucketName, fileName, 24 * 60 * 60);
    } catch (error) {
      this.logger.warn(
        `Não foi possível gerar URL para ${fileName} no bucket ${bucketName}: ${error.message}`,
      );
      return null;
    }
  }

  async deleteFile(bucketName: string, fileName: string): Promise<void> {
    await this.client.removeObject(bucketName, fileName);
  }

  async getFile(bucketName: string, fileName: string): Promise<Buffer> {
    return this.downloadFile(bucketName, fileName);
  }

  async deleteObject(bucketName: string, fileName: string): Promise<void> {
    return this.deleteFile(bucketName, fileName);
  }
}

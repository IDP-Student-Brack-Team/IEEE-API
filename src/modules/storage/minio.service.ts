import {Injectable, Logger} from '@nestjs/common';
import {minioClient} from '../../config/minio.config';
import {Client} from 'minio';

@Injectable()
export class MinIOService{
	private readonly client: Client = minioClient;
	private readonly logger = new Logger (MinIOService.name);

	async ensureBucket(bucketName: string): Promise<void>{
		const exists = await this.client.bucketExists(bucketName);
		if (!exists){
			await this.client.makeBucket(bucketName, '');
			this.logger.log('Bucket ${bucketName} cirado.');
		}
	}

	async uploadFile(bucketName: string, fileName: string, file: Buffer, mimeType: string): Promise<string>{
		await this.ensureBucket(bucketName);
		await this.client.putObject(bucketName, fileName, file, {'Content-Type': mimeType});
		return 'http://localhost:9000/${bucketName}/${fileName}';
	}

	async downloadFile(bucketName: string, fileName: string): Promise<Buffer>{
		return new Promise ((resolve, reject)=>{
			this.client.getObject(bucketName, fileName, (err, stream) =>{
				if (err) return reject(err);
			const chunks: Buffer[] = [];
				stream.on('data', (chunk) => chunks.push(chunk));
				stream.on('end', () => resolve(Buffer.concat(chunks)));
				stream.on('error', (e) => reject(e));
			});
		});
	}
}

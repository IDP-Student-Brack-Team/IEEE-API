import { Test, TestingModule } from '@nestjs/testing';
import { UploadsService } from './uploads.service';
import { MinIOService } from '../storage/minio.service';

const uploadFile = jest.fn();

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: MinIOService,
          useValue: {
            uploadFile,
          },
        },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve fazer upload e retornar URL', async () => {
    uploadFile.mockResolvedValueOnce('http://localhost:9000/images/test.png');

    const file = {
      originalname: 'test.png',
      mimetype: 'image/png',
      buffer: Buffer.from('abc'),
    } as Express.Multer.File;

    const result = await service.uploadImage(file);

    expect(result.url).toBe('http://localhost:9000/images/test.png');
  });
});


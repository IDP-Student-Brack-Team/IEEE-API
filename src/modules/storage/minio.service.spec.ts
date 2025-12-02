import { Test, TestingModule } from '@nestjs/testing';
import { MinIOService } from './minio.service';
import { ConfigService } from '@nestjs/config';

const putObject = jest.fn();
const removeObject = jest.fn();
const getObject = jest.fn();

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    putObject,
    removeObject,
    getObject,
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn().mockResolvedValue(true),
  })),
}));

describe('MinIOService', () => {
  let service: MinIOService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MinIOService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              const values = {
                MINIO_ENDPOINT: 'ieee_minio',
                MINIO_PORT: '9000',
                MINIO_ACCESS_KEY: 'minioadmin',
                MINIO_SECRET_KEY: 'minioadmin123',
                MINIO_USE_SSL: 'false',
                MINIO_PUBLIC_URL: 'http://localhost:9000',
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MinIOService>(MinIOService);
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  it('deve fazer upload de arquivo', async () => {
    putObject.mockResolvedValueOnce({});

    const url = await service.uploadFile(
      'images',
      'foto.png',
      Buffer.from('abc'),
      'image/png',
    );

    expect(putObject).toHaveBeenCalled();
    expect(url).toBe('http://localhost:9000/images/foto.png');
  });

  it('deve deletar arquivo', async () => {
    removeObject.mockResolvedValueOnce({});

    await service.deleteFile('images', 'foto.png');

    expect(removeObject).toHaveBeenCalled();
  });

  it('deve fazer download de arquivo', async () => {
    getObject.mockResolvedValueOnce(Buffer.from('data'));

    const result = await service.getFile('images', 'foto.png');

    expect(getObject).toHaveBeenCalled();
    expect(result).toBeInstanceOf(Buffer);
  });
});


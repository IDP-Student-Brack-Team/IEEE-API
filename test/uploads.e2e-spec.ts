import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MinIOService } from '../src/modules/storage/minio.service';

describe('UploadsController (E2E)', () => {
  let app: INestApplication;

  const mockUpload = jest.fn().mockResolvedValue(
    'http://localhost:9000/images/uploaded.png',
  );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MinIOService)
      .useValue({
        uploadFile: mockUpload,
      })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('/uploads (POST) deve fazer upload', async () => {
    const res = await request(app.getHttpServer())
      .post('/uploads')
      .attach('file', Buffer.from('abcd'), 'foto.png')
      .expect(201);

    expect(res.body.url).toBe(
      'http://localhost:9000/images/uploaded.png',
    );
  });

  afterAll(async () => {
    await app.close();
  });
});


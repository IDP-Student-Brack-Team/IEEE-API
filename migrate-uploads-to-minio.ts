import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'minio';

// Ajustar com nome dos buckets
const BUCKETS = {
  avatars: 'avatars',
  banners: 'banners',
  documents: 'documents',
  general: 'general',
};

/*
  Detecta automaticamente QUAL bucket deve receber o arquivo
  baseado no prefixo do nome do arquivo.
 
  Ex:
  avatar_123.png → bucket "avatars"
 */
function detectBucket(filename: string): string {
  const lower = filename.toLowerCase();

  if (lower.startsWith('avatar_')) return BUCKETS.avatars;
  if (lower.startsWith('banner_')) return BUCKETS.banners;
  if (lower.startsWith('doc_')) return BUCKETS.documents;

  return BUCKETS.general;
}

//Configurar o client MinIO
const minio = new Client({
  endPoint: 'ieee_minio',      // nome do container
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
});

 //Função principal
async function migrate() {
  const uploadsDir = path.join(process.cwd(), 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    console.log('❌ Pasta uploads/ não existe. Nada para migrar.');
    return;
  }

  const files = fs.readdirSync(uploadsDir);

  if (files.length === 0) {
    console.log('✔️ Pasta uploads/ está vazia.');
    return;
  }

  console.log(`🔍 Encontrados ${files.length} arquivos para migrar...\n`);

  const report: any[] = [];

  for (const file of files) {
    const bucket = detectBucket(file);
    const filePath = path.join(uploadsDir, file);

    try {
      // Garantir bucket existente
      const exists = await minio.bucketExists(bucket).catch(() => false);
      if (!exists) await minio.makeBucket(bucket);

      // Enviar arquivo
      await minio.fPutObject(bucket, file, filePath);

      // Remover local após sucesso
      fs.unlinkSync(filePath);

      report.push({
        file,
        bucket,
        status: 'migrated',
      });

      console.log(`✔️ ${file} → bucket "${bucket}"`);
    } catch (err) {
      console.error(`❌ Erro ao migrar ${file}:`, err);
      report.push({
        file,
        bucket,
        status: 'error',
        error: err.message,
      });
    }
  }

  console.log('\nMIGRAÇÃO CONCLUÍDA\n');
  console.table(report);
}

migrate();


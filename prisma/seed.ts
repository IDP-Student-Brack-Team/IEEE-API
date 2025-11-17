import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
}

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuário administrador
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ieee.org' },
    update: {},
    create: {
      email: 'admin@ieee.org',
      password: adminPassword,
      name: 'Administrador IEEE',
      ieeeNumber: 'ADMIN001',
      role: Role.ADMIN,
      isVerified: true,
      bio: 'Conta administrativa do sistema IEEE',
    },
  });

  console.log('✅ Administrador criado:', admin.email);

  // Criar usuário normal
  const userPassword = await bcrypt.hash('User@123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@ieee.org' },
    update: {},
    create: {
      email: 'user@ieee.org',
      password: userPassword,
      name: 'Usuário Teste',
      ieeeNumber: 'USER001',
      role: Role.USER,
      isVerified: true,
      bio: 'Conta de teste para usuário comum',
    },
  });

  console.log('✅ Usuário criado:', user.email);

  // Criar evento de exemplo
  const eventTitle = 'Workshop de Inteligência Artificial';
  const eventDescription = `
    <h2>Sobre o Workshop</h2>
    <p>Junte-se a nós para um workshop intensivo sobre Inteligência Artificial e Machine Learning.</p>
    <h3>O que você vai aprender:</h3>
    <ul>
      <li>Fundamentos de IA e ML</li>
      <li>Redes Neurais e Deep Learning</li>
      <li>Aplicações práticas em projetos reais</li>
    </ul>
  `;

  const event = await prisma.event.create({
    data: {
      title: eventTitle, // Usamos a variável
      description: eventDescription, // Usamos a variável
      titleNormalized: normalizeText(eventTitle),
      descriptionNormalized: normalizeText(eventDescription),
      slug: 'workshop-ia-2025',
      shortDescription: 'Workshop intensivo sobre IA e Machine Learning',
      bannerUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200',
      startDate: new Date('2025-11-01T09:00:00'),
      endDate: new Date('2025-11-01T17:00:00'),
      location: 'Auditório Principal - Campus Universitário',
      category: 'Workshop',
      maxParticipants: 50,
      registrationDeadline: new Date('2025-10-25T23:59:59'),
      status: 'PUBLISHED',
      createdById: admin.id,
      images: {
        create: [
          {
            url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
            caption: 'Sessão de abertura',
            order: 1,
          },
          {
            url: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800',
            caption: 'Hands-on com redes neurais',
            order: 2,
          },
        ],
      },
    },
  });

  console.log('✅ Evento criado:', event.title);

  // Criar comentário de exemplo
  const comment = await prisma.comment.create({
    data: {
      content: 'Evento incrível! Mal posso esperar para participar!',
      authorId: user.id,
      eventId: event.id,
    },
  });

  console.log('✅ Comentário criado');

  console.log('🎉 Seed concluído com sucesso!');
  console.log('\n📝 Credenciais de acesso:');
  console.log('Admin: admin@ieee.org / Admin@123');
  console.log('User: user@ieee.org / User@123');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

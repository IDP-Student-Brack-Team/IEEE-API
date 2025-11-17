import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  private normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Remove acentos
}

  async create(createEventDto: CreateEventDto, userId: string) {
    // Gerar slug a partir do título
    const slug = this.generateSlug(createEventDto.title);

    const event = await this.prisma.event.create({
      data: {
        ...createEventDto,
        slug,
        createdById: userId,
        status: createEventDto.status || EventStatus.DRAFT,
        titleNormalized: this.normalizeText(createEventDto.title),
        descriptionNormalized: this.normalizeText(createEventDto.description),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        images: true,
      },
    });

    // Notificar todos os usuários sobre novo evento (exceto o criador)
    if (event.status === EventStatus.PUBLISHED) {
      const users = await this.prisma.user.findMany({
        where: {
          id: { not: userId },
        },
        select: { id: true },
      });

      // Criar notificações para todos os usuários
      await Promise.all(
        users.map((user) =>
          this.notificationsService.create({
            userId: user.id,
            title: 'Novo Evento Disponível',
            message: `Um novo evento "${event.title}" foi publicado!`,
            type: 'EVENT_REMINDER',
          }),
        ),
      );
    }

    return event;
  }

  async findAll(filters?: {
    category?: string;
    status?: EventStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page ? Number(filters.page) : 1;
    const limit = filters?.limit ? Number(filters.limit) : 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
    // 1. Normaliza o termo de busca do usuário (ex: "Inteligência" vira "inteligencia")
    const normalizedSearch = this.normalizeText(filters.search);

    // 2. Quebra a busca em palavras (ex: "inteligencia artificial" vira ['inteligencia', 'artificial'])
    const searchWords = normalizedSearch.split(' ').filter(Boolean);

    // 3. Diz ao Prisma: TODAS as palavras buscadas devem existir
    where.AND = searchWords.map((word) => ({
        // E cada palavra pode estar OU no título normalizado OU na descrição normalizada
        OR: [
            { titleNormalized: { contains: word } },
            { descriptionNormalized: { contains: word } },
        ],
      }));
    }

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
          images: {
            take: 1,
            orderBy: { order: 'asc' },
          },
          _count: {
            select: {
              comments: true,
              registrations: true,
            },
          },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data: events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        comments: {
          where: { parentId: null },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            registrations: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    return event;
  }

  async findBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        images: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            comments: true,
            registrations: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    // Objeto para guardar os dados que serão atualizados
    const dataToUpdate: any = { ...updateEventDto };

    // VERIFICA: Se o título foi alterado...
    if (updateEventDto.title) {
        // ... então, também atualiza o campo normalizado do título.
        dataToUpdate.titleNormalized = this.normalizeText(updateEventDto.title);
    }
    // VERIFICA: Se a descrição foi alterada...
    if (updateEventDto.description) {
        // ... então, também atualiza o campo normalizado da descrição.
        dataToUpdate.descriptionNormalized = this.normalizeText(updateEventDto.description);
    }

    const event = await this.prisma.event.update({
        where: { id },
        // Usa o novo objeto com os dados normalizados
        data: dataToUpdate,
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                },
            },
            images: true,
        },
    });

    return event;
  }

  async remove(id: string) {
    await this.prisma.event.delete({
      where: { id },
    });

    return { message: 'Evento removido com sucesso' };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .trim();
  }
}

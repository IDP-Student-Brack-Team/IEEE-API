import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventStatus, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { MinIOService } from '../storage/minio.service';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private minioService: MinIOService,
  ) {}

  private normalizeText(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private extractFilenameFromUrl(url: string): string | null {
    if (!url) return null;
    // Se já for apenas um filename (sem http), retornar como está
    if (!url.startsWith('http')) return url;
    // Extrair filename da URL do MinIO
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1] || null;
    } catch {
      // Se não conseguir parsear, tentar extrair do final da string
      const parts = url.split('/');
      return parts[parts.length - 1]?.split('?')[0] || null;
    }
  }

  private async processBannerUrl(bannerUrl: string | null | undefined): Promise<string | null> {
    if (!bannerUrl) return null;

    // Se já for uma URL completa (presigned), retornar como está
    if (bannerUrl.startsWith('http://') || bannerUrl.startsWith('https://')) {
      return bannerUrl;
    }

    // Se for apenas um filename, gerar URL presigned
    const url = await this.minioService.getFileUrl('events', bannerUrl);
    return url;
  }

  async create(createEventDto: CreateEventDto, userId: string) {
    const slug = this.generateSlug(createEventDto.title);

    // Processar bannerUrl: se for URL completa, extrair filename; se for filename, manter
    let bannerUrlToSave = createEventDto.bannerUrl;
    if (createEventDto.bannerUrl && createEventDto.bannerUrl.startsWith('http')) {
      // Extrair filename da URL para salvar apenas o filename no banco
      const filename = this.extractFilenameFromUrl(createEventDto.bannerUrl);
      if (filename) {
        bannerUrlToSave = filename;
      }
    }

    const event = await this.prisma.event.create({
      data: {
        ...createEventDto,
        bannerUrl: bannerUrlToSave,
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

    // Gerar URL presigned para o banner
    if (event.bannerUrl) {
      event.bannerUrl = await this.processBannerUrl(event.bannerUrl);
    }

    if (event.status === EventStatus.PUBLISHED) {
      const users = await this.prisma.user.findMany({
        where: {
          id: { not: userId },
        },
        select: { id: true },
      });

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

    const where: Prisma.EventWhereInput = {};

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      const normalizedSearch = this.normalizeText(filters.search);
      const searchWords = normalizedSearch.split(' ').filter(Boolean);

      where.AND = searchWords.map((word) => ({
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

    for (const event of events) {
      if (event.bannerUrl) {
        event.bannerUrl = await this.processBannerUrl(event.bannerUrl);
      }
      if (event.images) {
        for (const img of event.images) {
          if (img.url) {
            img.url = await this.processBannerUrl(img.url);
          }
        }
      }
    }

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

    if (event.bannerUrl) {
      event.bannerUrl = await this.processBannerUrl(event.bannerUrl);
    }

    if (event.images && event.images.length > 0) {
      for (const image of event.images) {
        if (image.url) {
          image.url = await this.processBannerUrl(image.url);
        }
      }
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

    if (event.bannerUrl) {
      event.bannerUrl = await this.processBannerUrl(event.bannerUrl);
    }

    if (event.images && event.images.length > 0) {
      for (const image of event.images) {
        if (image.url) {
          image.url = await this.processBannerUrl(image.url);
        }
      }
    }

    return event;
  }

  async update(id: string, updateEventDto: UpdateEventDto) {
    const dataToUpdate: any = { ...updateEventDto };

    if (updateEventDto.title) {
      dataToUpdate.titleNormalized = this.normalizeText(updateEventDto.title);
    }
    if (updateEventDto.description) {
      dataToUpdate.descriptionNormalized = this.normalizeText(updateEventDto.description);
    }

    const event = await this.prisma.event.update({
      where: { id },
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
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(eventId: string, createCommentDto: CreateCommentDto, userId: string) {
    // Verificar se o evento existe
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        createdBy: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    // Se tiver parentId, verificar se o comentário pai existe
    if (createCommentDto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: createCommentDto.parentId },
        include: {
          author: true,
        },
      });

      if (!parentComment) {
        throw new NotFoundException('Comentário pai não encontrado');
      }

      // Criar comentário
      const comment = await this.prisma.comment.create({
        data: {
          content: createCommentDto.content,
          eventId,
          authorId: userId,
          parentId: createCommentDto.parentId,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Notificar autor do comentário pai (se não for o mesmo usuário)
      if (parentComment.authorId !== userId) {
        await this.notificationsService.create({
          userId: parentComment.authorId,
          title: 'Nova Resposta ao seu Comentário',
          message: `${comment.author.name} respondeu ao seu comentário em "${event.title}"`,
          type: 'NEW_REPLY',
        });
      }

      return comment;
    }

    // Criar comentário principal
    const comment = await this.prisma.comment.create({
      data: {
        content: createCommentDto.content,
        eventId,
        authorId: userId,
        parentId: createCommentDto.parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Notificar criador do evento (se não for o mesmo usuário)
    if (event.createdById !== userId) {
      await this.notificationsService.create({
        userId: event.createdById,
        title: 'Novo Comentário no seu Evento',
        message: `${comment.author.name} comentou em "${event.title}"`,
        type: 'NEW_COMMENT',
      });
    }

    return comment;
  }

  async findAllByEvent(eventId: string) {
    return this.prisma.comment.findMany({
      where: {
        eventId,
        parentId: null, // Apenas comentários principais
      },
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
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, updateCommentDto: UpdateCommentDto, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comentário não encontrado');
    }

    // Verificar se o usuário é o autor
    if (comment.authorId !== userId) {
      throw new ForbiddenException('Você não pode editar este comentário');
    }

    return this.prisma.comment.update({
      where: { id },
      data: { content: updateCommentDto.content },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comentário não encontrado');
    }

    // Verificar se o usuário é o autor
    if (comment.authorId !== userId) {
      throw new ForbiddenException('Você não pode remover este comentário');
    }

    await this.prisma.comment.delete({
      where: { id },
    });

    return { message: 'Comentário removido com sucesso' };
  }
}

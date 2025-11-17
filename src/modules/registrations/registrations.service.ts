import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';

@Injectable()
export class RegistrationsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async create(eventId: string, createRegistrationDto: CreateRegistrationDto, userId: string) {
    // Verificar se o evento existe
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        createdBy: true,
        _count: {
          select: { registrations: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    // Verificar se o usuário já está inscrito
    const existingRegistration = await this.prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    if (existingRegistration) {
      throw new ConflictException('Você já está inscrito neste evento');
    }

    // Verificar prazo de inscrição
    if (event.registrationDeadline && new Date() > event.registrationDeadline) {
      throw new BadRequestException('Prazo de inscrição encerrado');
    }

    // Verificar limite de participantes (com status 'confirmed')
    const registrationsCount = await this.prisma.eventRegistration.count({
      where: { eventId, status: 'confirmed' },
    });

    if (event.maxParticipants !== null && registrationsCount >= event.maxParticipants) {
      throw new BadRequestException('Evento lotado');
    }

    // Criar inscrição
    const registration = await this.prisma.eventRegistration.create({
      data: {
        userId,
        eventId,
        additionalInfo: createRegistrationDto.additionalInfo,
        status: 'confirmed',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            location: true,
          },
        },
      },
    });

    // Enviar e-mail de confirmação para o usuário
    await this.mailService.sendEventConfirmationEmail(
      registration.user.email,
      registration.user.name,
      registration.event.title,
    );

    // Enviar notificação para administradores
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { email: true },
    });

    if (admins.length > 0) {
      await this.mailService.sendEventRegistrationNotification(
        admins.map((admin) => admin.email),
        registration.event.title,
        registration.user.name,
      );
    }

    return registration;
  }

  async findAllByEvent(eventId: string) {
    return this.prisma.eventRegistration.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyRegistrations(userId: string) {
    return this.prisma.eventRegistration.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            startDate: true,
            endDate: true,
            location: true,
            bannerUrl: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string, userId: string) {
    const registration = await this.prisma.eventRegistration.findUnique({
      where: { id },
    });

    if (!registration) {
      throw new NotFoundException('Inscrição não encontrada');
    }

    if (registration.userId !== userId) {
      throw new BadRequestException('Você não pode cancelar esta inscrição');
    }

    await this.prisma.eventRegistration.delete({
      where: { id },
    });

    return { message: 'Inscrição cancelada com sucesso' };
  }
}

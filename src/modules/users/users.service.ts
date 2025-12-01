import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { userPublicSelect } from './user.constants';
import { MinIOService } from '../storage/minio.service';

@Injectable()
export class UsersService {
  constructor(
  private prisma: PrismaService,
  private minioService: MinIOService
) {}

  async create(createUserDto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: createUserDto,
    });

    const { password, ...result } = user;
    return result;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: userPublicSelect,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });

    if (!user) throw new NotFoundException('Usuário não encontrado');

    if (user.avatarUrl) {
      user.avatarUrl = await this.minioService.getFileUrl('avatars', user.avatarUrl);
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByIeeeNumber(ieeeNumber: string) {
    return this.prisma.user.findUnique({
      where: { ieeeNumber },
    });
  }

  async findByResetToken(token: string) {
    return this.prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: userPublicSelect,
    });

    return user;
  }

  async remove(id: string) {
    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'Usuário removido com sucesso' };
  }

  async setResetToken(id: string, token: string, expiry: Date) {
    return this.prisma.user.update({
      where: { id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expiry,
      },
    });
  }

  async resetPassword(id: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
  }

  async exportUserData(userId: string) {
    console.log(`Exportando dados para o usuário: ${userId}`);

    const userData = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        ieeeNumber: true,
        role: true,
        isVerified: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,

        // Critérios de Aceitação: Incluir eventos, comentários, inscrições
        createdEvents: true,
        comments: true,
        registrations: true,
      }
    });

    if (!userData) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (userData.avatarUrl) {
      userData.avatarUrl = await this.minioService.getFileUrl('avatars', userData.avatarUrl);
    }

    return {
      personalData: userData,
      exportDate: new Date(),
      format: 'json'
    };
  }
}


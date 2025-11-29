import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly accessTokenExpiration: string;
  private readonly refreshTokenExpiration: string;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get('JWT_SECRET');
    this.jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET') || this.jwtSecret + '_refresh';
    this.accessTokenExpiration = this.configService.get('JWT_EXPIRATION') || '15m';
    this.refreshTokenExpiration = this.configService.get('JWT_REFRESH_EXPIRATION') || '7d';
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const tokens = this.generateTokens(payload);
    
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  generateTokens(payload: { sub: string; email: string; role: string }) {
    const accessToken = this.jwtService.sign(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      },
      {
        secret: this.jwtSecret,
        expiresIn: this.accessTokenExpiration,
      },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        isRefreshToken: true,
      },
      {
        secret: this.jwtRefreshSecret,
        expiresIn: this.refreshTokenExpiration,
      },
    );

    return { accessToken, refreshToken };
  }

  async refreshTokens(refreshToken: string) {
    try {
      // Valida o refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.jwtRefreshSecret,
      });

      // Verifica se é um refresh token válido
      if (!payload.isRefreshToken) {
        throw new UnauthorizedException('Token inválido');
      }

      // Gera novos tokens
      const tokens = this.generateTokens({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      });

      return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token expirado');
      }
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async register(registerDto: RegisterDto) {
    // Verificar se o e-mail já existe
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('E-mail já cadastrado');
    }

    // Verificar se a matrícula IEEE já existe
    const existingIeeeNumber = await this.usersService.findByIeeeNumber(registerDto.ieeeNumber);
    if (existingIeeeNumber) {
      throw new ConflictException('Matrícula IEEE já cadastrada');
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Criar usuário
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // Enviar e-mail de boas-vindas
    await this.mailService.sendWelcomeEmail(user.email, user.name);

    // Retornar token
    return this.login(user);
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Por segurança, não revelar se o e-mail existe
      return { message: 'Se o e-mail existir, você receberá instruções para redefinir a senha' };
    }

    // Gerar token de reset
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

    await this.usersService.setResetToken(user.id, resetToken, resetTokenExpiry);

    // Enviar e-mail com link de reset
    await this.mailService.sendPasswordResetEmail(user.email, user.name, resetToken);

    return { message: 'Se o e-mail existir, você receberá instruções para redefinir a senha' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);

    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.resetPassword(user.id, hashedPassword);

    return { message: 'Senha redefinida com sucesso' };
  }
}

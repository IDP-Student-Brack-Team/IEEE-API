import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Extrai o refresh token do header 'x-refresh-token' ou do body
          return (
            request?.headers?.['x-refresh-token'] as string ||
            request?.body?.refreshToken
          );
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_REFRESH_SECRET') || configService.get('JWT_SECRET') + '_refresh',
    });
  }

  async validate(payload: any) {
    // Verifica se é um refresh token válido (tem a flag isRefreshToken)
    if (!payload.isRefreshToken)  return null;
    
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}


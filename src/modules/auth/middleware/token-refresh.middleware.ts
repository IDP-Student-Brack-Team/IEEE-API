import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenRefreshMiddleware implements NestMiddleware {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly accessTokenExpiration: string;
  private readonly refreshTokenExpiration: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get('JWT_SECRET');
    this.jwtRefreshSecret = this.configService.get('JWT_REFRESH_SECRET') || this.jwtSecret + '_refresh';
    this.accessTokenExpiration = this.configService.get('JWT_EXPIRATION') || '15m';
    this.refreshTokenExpiration = this.configService.get('JWT_REFRESH_EXPIRATION') || '7d';
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const refreshToken = req.headers['x-refresh-token'] as string;

    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    const accessToken = authHeader.split(' ')[1];

    try {
      this.jwtService.verify(accessToken, { secret: this.jwtSecret });
      return next();
    } catch (accessTokenError) {
      if (accessTokenError.name !== 'TokenExpiredError') return next();

      if (!refreshToken) return next();

      try {
        const refreshPayload = this.jwtService.verify(refreshToken, {
          secret: this.jwtRefreshSecret,
        });

        if (!refreshPayload.isRefreshToken) return next();

        const newTokens = this.generateTokens({
          sub: refreshPayload.sub,
          email: refreshPayload.email,
          role: refreshPayload.role,
        });

        res.setHeader('x-new-access-token', newTokens.accessToken);
        res.setHeader('x-new-refresh-token', newTokens.refreshToken);
        req.headers.authorization = `Bearer ${newTokens.accessToken}`;

        return next();
      } catch (refreshTokenError) {
        return next();
      }
    }
  }

  private generateTokens(payload: { sub: string; email: string; role: string }) {
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
}


import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Injectable()
export class TokenCookiesHelper {
  private readonly isProduction: boolean;
  private readonly accessTokenExpiration: string;
  private readonly refreshTokenExpiration: string;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
    this.accessTokenExpiration = this.configService.get('JWT_EXPIRATION') || '15m';
    this.refreshTokenExpiration = this.configService.get('JWT_REFRESH_EXPIRATION') || '7d';
  }

  setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
    const cookieOptions = {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: this.parseExpiration(this.accessTokenExpiration),
    });

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: this.parseExpiration(this.refreshTokenExpiration),
    });
  }

  clearTokenCookies(res: Response): void {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  }

  parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60 * 1000;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }
}

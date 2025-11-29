import { Controller, Post, Body, UseGuards, Request, Response, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { TokenCookiesHelper } from './helpers/token-cookies.helper';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenCookiesHelper: TokenCookiesHelper,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Cadastrar novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 409, description: 'E-mail ou matrícula já cadastrados' })
  async register(@Body() registerDto: RegisterDto, @Response({ passthrough: true }) res: ExpressResponse) {
    const result = await this.authService.register(registerDto);
    this.tokenCookiesHelper.setTokenCookies(res, result.access_token, result.refresh_token);
    return result;
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fazer login' })
  @ApiResponse({ 
    status: 200, 
    description: 'Login realizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', description: 'Token de acesso JWT' },
        refresh_token: { type: 'string', description: 'Token de refresh JWT' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            avatarUrl: { type: 'string', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(
    @Request() req,
    @Body() loginDto: LoginDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.authService.login(req.user);
    this.tokenCookiesHelper.setTokenCookies(res, result.access_token, result.refresh_token);
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar tokens de acesso usando refresh token' })
  @ApiResponse({ 
    status: 200, 
    description: 'Tokens renovados com sucesso',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', description: 'Novo token de acesso JWT' },
        refresh_token: { type: 'string', description: 'Novo token de refresh JWT' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado' })
  @ApiHeader({
    name: 'x-refresh-token',
    description: 'Alternativamente, o refresh token pode ser enviado via header ou cookie',
    required: false,
  })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.authService.refreshTokens(refreshTokenDto.refreshToken);
    this.tokenCookiesHelper.setTokenCookies(res, result.access_token, result.refresh_token);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fazer logout (limpar cookies)' })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso' })
  async logout(@Response({ passthrough: true }) res: ExpressResponse) {
    this.tokenCookiesHelper.clearTokenCookies(res);
    return { message: 'Logout realizado com sucesso' };
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperação de senha' })
  @ApiResponse({ status: 200, description: 'E-mail de recuperação enviado' })
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(requestPasswordResetDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Redefinir senha' })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 400, description: 'Token inválido ou expirado' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.password);
  }
}

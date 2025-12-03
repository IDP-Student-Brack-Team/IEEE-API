import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();
    const message =
      typeof errorResponse === 'string' ? errorResponse : (errorResponse as any).message;
    this.logger.error(
      `HTTP Status ${status} | Error Message: ${JSON.stringify(message)} | Path: ${request.url}`,
      exception.stack,
    );
    const standardizedError = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message || 'Ocorreu um erro inesperado',
      errorCode: `E-${status}`,
    };
    response.status(status).json(standardizedError);
  }
}

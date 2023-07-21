import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';

import { AlertReceiveException } from './alert.exceptions';

@Catch(AlertReceiveException)
export class AlertExceptionFilter implements ExceptionFilter {
  private logger = new Logger(AlertExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorMessage = `Error: ${exception.message}`;
    this.logger.error(errorMessage, exception.stack);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    });
  }
}

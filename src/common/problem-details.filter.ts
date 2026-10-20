import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

type NestErrorBody = { error?: string; message?: string | string[] };

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const response = host.switchToHttp().getResponse();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'Erro interno do servidor.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        title = exception.name;
        detail = body;
      } else {
        const { error, message } = body as NestErrorBody;
        title = error ?? exception.name;
        detail = Array.isArray(message) ? message.join('; ') : (message ?? title);
      }
    } else {
      this.logger.error(exception);
    }

    httpAdapter.setHeader(response, 'Content-Type', 'application/problem+json');
    httpAdapter.reply(
      response,
      { type: 'about:blank', title, status, detail },
      status,
    );
  }
}

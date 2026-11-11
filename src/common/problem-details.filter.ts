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
    let type = 'about:blank';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        title = exception.name;
        detail = body;
      } else {
        const { error, message, type: tipo } = body as NestErrorBody & { type?: string };
        title = error ?? exception.name;
        detail = Array.isArray(message) ? message.join('; ') : (message ?? title);
        // Regra de negócio (spec 006): type fixo que o front traduz em motivo.
        if (typeof tipo === 'string') type = tipo;
      }
    } else {
      this.logger.error(exception);
    }

    httpAdapter.setHeader(response, 'Content-Type', 'application/problem+json');
    httpAdapter.reply(response, { type, title, status, detail }, status);
  }
}

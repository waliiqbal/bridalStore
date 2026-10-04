import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  // Extra details some endpoints add, e.g. checkout "problems"
  [key: string]: unknown;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return { statusCode, message: response, error: statusName(statusCode) };
      }
      const { message, statusCode: _s, error: _e, ...extra } = response as {
        message?: string | string[];
        statusCode?: number;
        error?: string;
      } & Record<string, unknown>;
      return { ...extra, statusCode, message: message ?? exception.message, error: statusName(statusCode) };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'A record with these details already exists',
          error: statusName(HttpStatus.CONFLICT),
        };
      }
      if (exception.code === 'P2003') {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'This refers to a record that does not exist',
          error: statusName(HttpStatus.BAD_REQUEST),
        };
      }
      if (exception.code === 'P2025') {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'The requested record was not found',
          error: statusName(HttpStatus.NOT_FOUND),
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Something went wrong. Please try again.',
      error: statusName(HttpStatus.INTERNAL_SERVER_ERROR),
    };
  }
}

function statusName(statusCode: number): string {
  const name = HttpStatus[statusCode];
  if (!name) return 'Error';
  return name
    .toLowerCase()
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

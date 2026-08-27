import {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

import { AppError } from '../utils/errors.js';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: { path: string; message: string }[];
  };
}

function sendError(reply: FastifyReply, statusCode: number, body: ErrorResponseBody): void {
  void reply.code(statusCode).send(body);
}

/**
 * Single place where every error thrown anywhere in the request lifecycle
 * (route validation, controllers, services, repositories) is converted into
 * a consistent JSON shape. Nothing downstream should send its own error
 * response — throw, and let this handler map it to the right status code.
 */
function errorHandlerPlugin(app: FastifyInstance, _opts: unknown, done: () => void): void {
  app.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      sendError(reply, 400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.validation.map((issue) => ({
            path: issue.instancePath.replace(/^\//, '').replace(/\//g, '.'),
            message: issue.message ?? 'Invalid value',
          })),
        },
      });
      return;
    }

    if (error instanceof AppError) {
      sendError(reply, error.statusCode, {
        error: { code: error.code, message: error.message },
      });
      return;
    }

    const statusCode = error.statusCode ?? 500;
    if (statusCode < 500) {
      sendError(reply, statusCode, {
        error: { code: error.code, message: error.message },
      });
      return;
    }

    app.log.error({ err: error }, 'Unhandled error');
    sendError(reply, 500, {
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
    });
  });

  app.setNotFoundHandler((request, reply) => {
    sendError(reply, 404, {
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });

  done();
}

export const errorHandler = fp(errorHandlerPlugin, { name: 'error-handler' });

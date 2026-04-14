import { ZodError } from "zod";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { HttpException } from "../exceptions/http-exception.js";

export function registerErrorMiddleware(app: FastifyInstance) {
  app.setErrorHandler(
    (error: Error, _request: FastifyRequest, reply: FastifyReply) => {
      if (error instanceof HttpException) {
        return reply.code(error.statusCode).send({
          error: error.message,
          ...(error.details ? { details: error.details } : {})
        });
      }

      if (error instanceof ZodError) {
        return reply.code(400).send({
          error: "Validation failed",
          details: error.flatten()
        });
      }

      return reply.code(500).send({
        error: "Internal server error"
      });
    }
  );
}

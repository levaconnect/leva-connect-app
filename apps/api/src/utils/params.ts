import { FastifyRequest } from "fastify";

export function getParams<T extends Record<string, string>>(request: FastifyRequest): T {
  return request.params as T;
}

export function getQuery<T extends Record<string, string | string[] | undefined>>(request: FastifyRequest): T {
  return request.query as T;
}
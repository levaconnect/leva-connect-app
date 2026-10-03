import { FastifyRequest } from "fastify";
export declare function getParams<T extends Record<string, string>>(request: FastifyRequest): T;
export declare function getQuery<T extends Record<string, string | string[] | undefined>>(request: FastifyRequest): T;
//# sourceMappingURL=params.d.ts.map
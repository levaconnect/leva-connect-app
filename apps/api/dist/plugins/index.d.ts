import { FastifyInstance } from "fastify";
interface AuthUser {
    id: string;
    email: string;
    role: "user" | "admin";
    membershipStatus: "pending" | "approved" | "rejected" | "suspended" | null;
    createdAt: Date;
    updatedAt: Date;
}
declare module "fastify" {
    interface FastifyRequest {
        authUser?: AuthUser;
    }
}
export declare function registerPlugins(app: FastifyInstance): Promise<void>;
declare module "fastify" {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        requireApproved: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        getCurrentUser: (request: FastifyRequest) => Promise<AuthUser | null>;
        refresh: {
            jwt: {
                sign: (payload: object, options?: any) => string;
                verify: (token: string) => any;
            };
        };
    }
}
export {};
//# sourceMappingURL=index.d.ts.map
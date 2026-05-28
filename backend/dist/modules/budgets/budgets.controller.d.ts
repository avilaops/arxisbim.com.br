import type { FastifyReply, FastifyRequest } from 'fastify';
import { BudgetsService } from './budgets.service.js';
type AuthedRequest = FastifyRequest;
export declare class BudgetsController {
    private readonly service;
    constructor(service: BudgetsService);
    list: (req: AuthedRequest, reply: FastifyReply) => Promise<never>;
    create: (req: AuthedRequest, reply: FastifyReply) => Promise<never>;
    get: (req: AuthedRequest, reply: FastifyReply) => Promise<never>;
    update: (req: AuthedRequest, reply: FastifyReply) => Promise<never>;
    remove: (req: AuthedRequest, reply: FastifyReply) => Promise<never>;
    addItem: (req: AuthedRequest, reply: FastifyReply) => Promise<never>;
    updateItem: (req: AuthedRequest, reply: FastifyReply) => Promise<never>;
    removeItem: (req: AuthedRequest, reply: FastifyReply) => Promise<never>;
}
export {};
//# sourceMappingURL=budgets.controller.d.ts.map
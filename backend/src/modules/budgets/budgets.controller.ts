import type { FastifyReply, FastifyRequest } from 'fastify';
import { BudgetsService } from './budgets.service.js';
import {
  costItemInputSchema,
  createBudgetSchema,
  listBudgetsQuerySchema,
  updateBudgetSchema,
  updateCostItemSchema,
} from './budgets.schemas.js';

type AuthedRequest = FastifyRequest;

function ctxFrom(req: AuthedRequest): { tenantId: string; userId?: string } {
  const user = (req as unknown as { user?: { tenantId?: string; userId?: string } }).user;
  const tenantId = user?.tenantId;
  if (!tenantId) throw new Error('tenantId missing from authenticated request');
  return { tenantId, userId: user?.userId };
}

export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  list = async (req: AuthedRequest, reply: FastifyReply) => {
    const query = listBudgetsQuerySchema.parse(req.query);
    const rows = await this.service.list(ctxFrom(req), query);
    return reply.send({ success: true, data: rows });
  };

  create = async (req: AuthedRequest, reply: FastifyReply) => {
    const body = createBudgetSchema.parse(req.body);
    const budget = await this.service.create(body, ctxFrom(req));
    return reply.code(201).send({ success: true, data: budget });
  };

  get = async (req: AuthedRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const budget = await this.service.get(id, ctxFrom(req));
    if (!budget) return reply.code(404).send({ success: false, error: 'Budget not found' });
    return reply.send({ success: true, data: budget });
  };

  update = async (req: AuthedRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = updateBudgetSchema.parse(req.body);
    const row = await this.service.update(id, body, ctxFrom(req));
    if (!row) return reply.code(404).send({ success: false, error: 'Budget not found' });
    return reply.send({ success: true, data: row });
  };

  remove = async (req: AuthedRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const ok = await this.service.remove(id, ctxFrom(req));
    if (!ok) return reply.code(404).send({ success: false, error: 'Budget not found' });
    return reply.code(204).send();
  };

  addItem = async (req: AuthedRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = costItemInputSchema.parse(req.body);
    const row = await this.service.addItem(id, body, ctxFrom(req));
    if (!row) return reply.code(404).send({ success: false, error: 'Budget not found' });
    return reply.code(201).send({ success: true, data: row });
  };

  updateItem = async (req: AuthedRequest, reply: FastifyReply) => {
    const { id, itemId } = req.params as { id: string; itemId: string };
    const body = updateCostItemSchema.parse(req.body);
    const row = await this.service.updateItem(id, itemId, body, ctxFrom(req));
    if (!row) return reply.code(404).send({ success: false, error: 'Item not found' });
    return reply.send({ success: true, data: row });
  };

  removeItem = async (req: AuthedRequest, reply: FastifyReply) => {
    const { id, itemId } = req.params as { id: string; itemId: string };
    const ok = await this.service.removeItem(id, itemId, ctxFrom(req));
    if (!ok) return reply.code(404).send({ success: false, error: 'Item not found' });
    return reply.code(204).send();
  };
}

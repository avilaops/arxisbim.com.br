import { costItemInputSchema, createBudgetSchema, listBudgetsQuerySchema, updateBudgetSchema, updateCostItemSchema, } from './budgets.schemas.js';
function ctxFrom(req) {
    const user = req.user;
    const tenantId = user?.tenantId;
    if (!tenantId)
        throw new Error('tenantId missing from authenticated request');
    return { tenantId, userId: user?.userId };
}
export class BudgetsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list = async (req, reply) => {
        const query = listBudgetsQuerySchema.parse(req.query);
        const rows = await this.service.list(ctxFrom(req), query);
        return reply.send({ success: true, data: rows });
    };
    create = async (req, reply) => {
        const body = createBudgetSchema.parse(req.body);
        const budget = await this.service.create(body, ctxFrom(req));
        return reply.code(201).send({ success: true, data: budget });
    };
    get = async (req, reply) => {
        const { id } = req.params;
        const budget = await this.service.get(id, ctxFrom(req));
        if (!budget)
            return reply.code(404).send({ success: false, error: 'Budget not found' });
        return reply.send({ success: true, data: budget });
    };
    update = async (req, reply) => {
        const { id } = req.params;
        const body = updateBudgetSchema.parse(req.body);
        const row = await this.service.update(id, body, ctxFrom(req));
        if (!row)
            return reply.code(404).send({ success: false, error: 'Budget not found' });
        return reply.send({ success: true, data: row });
    };
    remove = async (req, reply) => {
        const { id } = req.params;
        const ok = await this.service.remove(id, ctxFrom(req));
        if (!ok)
            return reply.code(404).send({ success: false, error: 'Budget not found' });
        return reply.code(204).send();
    };
    addItem = async (req, reply) => {
        const { id } = req.params;
        const body = costItemInputSchema.parse(req.body);
        const row = await this.service.addItem(id, body, ctxFrom(req));
        if (!row)
            return reply.code(404).send({ success: false, error: 'Budget not found' });
        return reply.code(201).send({ success: true, data: row });
    };
    updateItem = async (req, reply) => {
        const { id, itemId } = req.params;
        const body = updateCostItemSchema.parse(req.body);
        const row = await this.service.updateItem(id, itemId, body, ctxFrom(req));
        if (!row)
            return reply.code(404).send({ success: false, error: 'Item not found' });
        return reply.send({ success: true, data: row });
    };
    removeItem = async (req, reply) => {
        const { id, itemId } = req.params;
        const ok = await this.service.removeItem(id, itemId, ctxFrom(req));
        if (!ok)
            return reply.code(404).send({ success: false, error: 'Item not found' });
        return reply.code(204).send();
    };
}
//# sourceMappingURL=budgets.controller.js.map
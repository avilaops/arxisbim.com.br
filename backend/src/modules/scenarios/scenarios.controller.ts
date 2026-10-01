import { FastifyRequest, FastifyReply } from 'fastify';
import { scenarios } from '../../shared/database/schema/scenarios.js';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Sql } from 'postgres';
import { ScenarioForkService } from './scenario-fork.service.js';
import { ScenarioDiffService } from './scenario-diff.service.js';
import { ScenarioMergeService } from './scenario-merge.service.js';
import { assertCanCreateScenario } from '../../core/billing/plan-limits.js';
import { FinancialComparisonService } from './financial-comparison.service.js';
import { ScenarioPdfService } from './scenario-pdf.service.js';

// Um pool por modulo, criado na primeira chamada. Ate 09/09/2026 isto abria
// um `postgres()` NOVO a cada requisicao e nunca o fechava: cada chamada
// deixava uma conexao ociosa no servidor ate o Postgres esgotar os 100 slots
// ("remaining connection slots are reserved") e derrubar todos os apps da
// maquina. O incidente de 09/09 foi este vazamento.
let dbCache: ReturnType<typeof criarDb> | null = null;
function criarDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL, { max: 4 });
  return drizzle(client, { schema: { scenarios } });
}
function getDb() {
  if (!dbCache) dbCache = criarDb();
  return dbCache;
}

export async function getScenariosHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const { projectId } = request.params as any;
    if (!projectId) {
      return reply.code(400).send({ error: 'projectId é obrigatório' });
    }
    const result = await db.select().from(scenarios).where(
      and(eq(scenarios.projectId, projectId), eq(scenarios.tenantId, tenantId))
    );
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar scenarios', details: String(error) });
  }
}

export async function createScenarioHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const body = request.body as any;
    if (!body || !body.projectId || !body.name || !body.camera || !body.player || !body.config) {
      return reply.code(400).send({ error: 'projectId, name, camera, player e config são obrigatórios' });
    }
    const [created] = await db.insert(scenarios).values({
      tenantId,
      projectId: body.projectId,
      createdBy: body.createdBy,
      name: body.name,
      description: body.description ?? '',
      presetId: body.presetId,
      camera: body.camera,
      player: body.player,
      config: body.config,
      metadata: body.metadata ?? {},
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar scenario', details: String(error) });
  }
}

export async function getScenarioHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const { scenarioId } = request.params as any;
    if (!scenarioId) {
      return reply.code(400).send({ error: 'scenarioId é obrigatório' });
    }
    const [scenario] = await db.select().from(scenarios).where(
      and(eq(scenarios.id, scenarioId), eq(scenarios.tenantId, tenantId))
    ).limit(1);
    if (!scenario) {
      return reply.code(404).send({ error: 'Scenario não encontrado' });
    }
    reply.send(scenario);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar scenario', details: String(error) });
  }
}

export async function updateScenarioHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const { scenarioId } = request.params as any;
    const body = request.body as any;
    if (!scenarioId) {
      return reply.code(400).send({ error: 'scenarioId é obrigatório' });
    }
    const [updated] = await db.update(scenarios)
      .set({
        name: body.name,
        description: body.description,
        presetId: body.presetId,
        camera: body.camera,
        player: body.player,
        config: body.config,
        metadata: body.metadata,
        updatedAt: new Date(),
      })
      .where(and(eq(scenarios.id, scenarioId), eq(scenarios.tenantId, tenantId)))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: 'Scenario não encontrado' });
    }
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar scenario', details: String(error) });
  }
}

export async function deleteScenarioHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const { scenarioId } = request.params as any;
    if (!scenarioId) {
      return reply.code(400).send({ error: 'scenarioId é obrigatório' });
    }
    const deleted = await db.delete(scenarios).where(
      and(eq(scenarios.id, scenarioId), eq(scenarios.tenantId, tenantId))
    ).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Scenario não encontrado' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar scenario', details: String(error) });
  }
}

export function forkScenarioHandler(sql: Sql) {
  const forkService = new ScenarioForkService(sql);
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId, userId } = request.user as any;
      const { scenarioId } = request.params as any;
      const body = request.body as any;

      if (!body || !body.projectId || !body.name) {
        return reply.code(400).send({ error: 'projectId e name são obrigatórios' });
      }

      // Validar limites por plano
      await assertCanCreateScenario(tenantId, body.projectId);

      const newScenarioId = await forkService.forkScenario(
        body.projectId,
        tenantId,
        userId,
        scenarioId,
        body.name,
        body.description
      );

      reply.code(201).send({ success: true, scenarioId: newScenarioId });
    } catch (error: any) {
      if (error.name === 'PlanLimitError') {
        return reply.code(error.statusCode).send({
          error: error.message,
          code: error.code,
          resource: error.resource,
          limit: error.limit,
          current: error.current
        });
      }
      reply.code(500).send({ error: 'Erro ao duplicar scenario', details: String(error) });
    }
  };
}

export function diffScenariosHandler(sql: Sql) {
  const diffService = new ScenarioDiffService(sql);
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = request.user as any;
      const { scenarioIdA, scenarioIdB } = request.params as any;
      const { projectId } = request.query as any;

      if (!projectId) {
        return reply.code(400).send({ error: 'projectId é obrigatório' });
      }

      const diff = await diffService.diffScenarios(
        tenantId,
        projectId,
        scenarioIdA,
        scenarioIdB
      );

      reply.send(diff);
    } catch (error: any) {
      reply.code(500).send({ error: 'Erro ao calcular diff dos cenários', details: String(error) });
    }
  };
}

export function mergeScenarioHandler(sql: Sql) {
  const mergeService = new ScenarioMergeService(sql);
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = request.user as any;
      const { scenarioId } = request.params as any;
      const body = request.body as any;

      if (!body || !body.projectId) {
        return reply.code(400).send({ error: 'projectId é obrigatório' });
      }

      await mergeService.mergeScenario(
        tenantId,
        body.projectId,
        scenarioId
      );
 
      reply.send({ success: true });
    } catch (error: any) {
      reply.code(500).send({ error: 'Erro ao mesclar cenário', details: String(error) });
    }
  };
}

async function getTop10CostItemDifferences(sql: Sql, scenarioIdA: string, scenarioIdB: string): Promise<any[]> {
  const query = (scenarioId: string) => sql`
    SELECT
      ci.code,
      ci.description,
      SUM(ecl.quantity * COALESCE(ecl.override_price, ci.unit_price)) as total_cost
    FROM element_cost_links ecl
    JOIN cost_items ci ON ecl.cost_item_id = ci.id
    WHERE ecl.scenario_id = ${scenarioId}
    GROUP BY ci.id, ci.code, ci.description
  `;

  const [costsA, costsB] = await Promise.all([
    query(scenarioIdA),
    query(scenarioIdB)
  ]);

  const mapA = new Map<string, any>();
  for (const item of costsA) {
    const key = item.code || item.description;
    mapA.set(key, item);
  }

  const differences: any[] = [];

  for (const itemB of costsB) {
    const key = itemB.code || itemB.description;
    const itemA = mapA.get(key);

    const priceA = itemA ? Number(itemA.total_cost) : 0;
    const priceB = Number(itemB.total_cost);
    const diff = priceB - priceA;

    if (itemA) {
      mapA.delete(key);
    }

    if (Math.abs(diff) > 0.009) {
      differences.push({
        code: itemB.code,
        description: itemB.description,
        priceA: priceA.toFixed(2),
        priceB: priceB.toFixed(2),
        diff: diff.toFixed(2)
      });
    }
  }

  for (const itemA of mapA.values()) {
    const priceA = Number(itemA.total_cost);
    const diff = -priceA;
    differences.push({
      code: itemA.code,
      description: itemA.description,
      priceA: priceA.toFixed(2),
      priceB: '0.00',
      diff: diff.toFixed(2)
    });
  }

  differences.sort((a, b) => Math.abs(Number(b.diff)) - Math.abs(Number(a.diff)));

  return differences.slice(0, 10);
}

export function getFinancialComparisonHandler(sql: Sql) {
  const comparisonService = new FinancialComparisonService(sql);
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = request.user as any;
      const { scenarioIdA, scenarioIdB } = request.params as any;
      const { projectId, costWeight, timeWeight } = request.query as any;

      if (!projectId) {
        return reply.code(400).send({ error: 'projectId é obrigatório' });
      }

      const w = {
        cost: costWeight !== undefined ? Number(costWeight) : 0.6,
        time: timeWeight !== undefined ? Number(timeWeight) : 0.4
      };

      const result = await comparisonService.compareScenarios(
        tenantId,
        projectId,
        scenarioIdA,
        scenarioIdB,
        w
      );

      reply.send(result);
    } catch (error: any) {
      reply.code(500).send({ error: 'Erro ao calcular comparação financeira', details: String(error) });
    }
  };
}

export function generateComparisonPdfHandler(sql: Sql) {
  const comparisonService = new FinancialComparisonService(sql);
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId } = request.user as any;
      const { scenarioIdA, scenarioIdB } = request.params as any;
      const { projectId, costWeight, timeWeight } = request.query as any;

      if (!projectId) {
        return reply.code(400).send({ error: 'projectId é obrigatório' });
      }

      const w = {
        cost: costWeight !== undefined ? Number(costWeight) : 0.6,
        time: timeWeight !== undefined ? Number(timeWeight) : 0.4
      };

      const result = await comparisonService.compareScenarios(
        tenantId,
        projectId,
        scenarioIdA,
        scenarioIdB,
        w
      );

      const [project] = await sql`
        SELECT name FROM projects WHERE id = ${projectId} AND tenant_id = ${tenantId}
      `;
      const [tenant] = await sql`
        SELECT name FROM tenants WHERE tenant_id = ${tenantId}
      `;
      const projectName = project?.name || 'Projeto Sem Nome';
      const tenantName = tenant?.name || 'Organização';

      const top10Diffs = await getTop10CostItemDifferences(sql, scenarioIdA, scenarioIdB);

      const buffer = await ScenarioPdfService.generateReportBuffer(
        projectName,
        tenantName,
        result,
        top10Diffs
      );

      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="comparacao-arxisvr-${Date.now()}.pdf"`)
        .send(buffer);
    } catch (error: any) {
      reply.code(500).send({ error: 'Erro ao gerar relatório comparativo PDF', details: String(error) });
    }
  };
}

import { FastifyInstance, FastifyRequest } from 'fastify';
import { db } from '../../shared/database/db.js';
import { modelElements, projects } from '../../shared/database/schema/projects.js';
import { eq, and, or } from 'drizzle-orm';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { z } from 'zod';

const copilotRequestSchema = z.object({
  projectId: z.string(),
  modelId: z.string().optional(),
  elementId: z.union([z.number(), z.string()]).optional(),
  message: z.string().min(1),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
});

// Simple in-memory rate limiter: 20 requests per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export async function aiCopilotRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };

  fastify.post('/copilot', auth, async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const parsed = copilotRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Validation error', details: parsed.error.issues });
      }

      const { projectId, modelId, elementId, message, history } = parsed.data;

      // Message size limit (max 1000 chars)
      if (message.length > 1000) {
        return reply.code(400).send({ error: 'Message too long. Maximum length is 1000 characters.' });
      }

      // Rate limit check
      const now = Date.now();
      const limitKey = user.userId;
      const userLimit = rateLimitMap.get(limitKey);
      if (userLimit && userLimit.resetAt > now) {
        if (userLimit.count >= 20) {
          return reply.code(429).send({ error: 'Too many requests. Please try again in a minute.' });
        }
        userLimit.count++;
      } else {
        rateLimitMap.set(limitKey, { count: 1, resetAt: now + 60000 });
      }

      // Project tenant access validation
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project) {
        return reply.code(404).send({ error: 'Project not found' });
      }

      if (project.tenantId !== user.tenantId) {
        return reply.code(403).send({ error: 'Forbidden. You do not have access to this project.' });
      }

      // 1. Fetch element details from database if elementId is provided
      let elementDetails: any = null;
      if (elementId && modelId) {
        let element;
        if (typeof elementId === 'number') {
          const rows = await db
            .select()
            .from(modelElements)
            .where(
              and(
                eq(modelElements.ifcModelId, modelId),
                eq(modelElements.expressId, elementId)
              )
            )
            .limit(1);
          element = rows[0];
        } else {
          const rows = await db
            .select()
            .from(modelElements)
            .where(
              and(
                eq(modelElements.ifcModelId, modelId),
                or(
                  eq(modelElements.globalId, elementId),
                  eq(modelElements.name, elementId)
                )
              )
            )
            .limit(1);
          element = rows[0];
        }

        if (element) {
          elementDetails = {
            name: element.name,
            type: element.type,
            globalId: element.globalId,
            properties: element.properties,
          };
        }
      }

      // 2. Build contextual system prompt
      let systemPrompt = `You are Antigravity AI Copilot, a professional BIM (Building Information Modeling) and engineering assistant.
You help users analyze 3D models, architectural elements, scheduling, structural issues, and quantities.
Context:
- Project ID: ${projectId}
- Model ID: ${modelId || 'None'}
`;

      if (elementDetails) {
        systemPrompt += `
The user has currently selected a 3D element in the model. Use this element context to answer:
- Name: ${elementDetails.name || 'Unknown'}
- Type: ${elementDetails.type}
- Global ID: ${elementDetails.globalId || 'None'}
- Properties: ${JSON.stringify(elementDetails.properties || {})}
`;
      } else {
        systemPrompt += `\nNo specific element is selected. Answer general queries about the model and project.`;
      }

      const mistralKey = process.env.MISTRAL_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY;
      let replyText = '';

      // 3. Call LLM API (Mistral or Gemini) or Fallback
      if (mistralKey) {
        try {
          const apiMessages = [
            { role: 'system', content: systemPrompt },
            ...(history || []).map(h => ({ role: h.role, content: h.content })),
            { role: 'user', content: message }
          ];

          const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mistralKey}`
            },
            body: JSON.stringify({
              model: 'open-mixtral-8x7b',
              messages: apiMessages
            })
          });

          if (response.ok) {
            const data: any = await response.json();
            replyText = data.choices?.[0]?.message?.content || '';
          } else {
            throw new Error(`Mistral API error: ${response.statusText}`);
          }
        } catch (err) {
          fastify.log.error(err, 'Mistral API call failed, attempting fallback');
        }
      }

      if (!replyText && geminiKey) {
        try {
          const contents = [
            { role: 'user', parts: [{ text: systemPrompt }] },
            ...(history || []).map(h => ({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: h.content }]
            })),
            { role: 'user', parts: [{ text: message }] }
          ];

          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contents })
          });

          if (response.ok) {
            const data: any = await response.json();
            replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          } else {
            throw new Error(`Gemini API error: ${response.statusText}`);
          }
        } catch (err) {
          fastify.log.error(err, 'Gemini API call failed, attempting fallback');
        }
      }

      // Fallback response if no keys worked or are configured
      if (!replyText) {
        replyText = `Olá! Sou o Antigravity AI Copilot.

Estou analisando a sua mensagem sobre o projeto.
${elementDetails ? `Você selecionou um elemento do tipo **${elementDetails.type}** chamado **${elementDetails.name || 'Sem nome'}**.
Propriedades:
${Object.entries(elementDetails.properties || {}).map(([k, v]) => `- **${k}**: ${JSON.stringify(v)}`).join('\n')}` : 'Nenhum elemento selecionado no momento.'}

Mensagem recebida: "${message}"

*(Nota: As chaves de API do Mistral ou Gemini não estão configuradas ou falharam. Esta é uma resposta simulada baseada nos dados reais do modelo).*`;
      }

      return reply.send({ response: replyText });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to process AI request' });
    }
  });
}

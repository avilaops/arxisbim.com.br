/**
 * arxisvr-keepalive — Cloudflare Worker (Cron Trigger)
 *
 * Mantém o backend do Render acordado pingando /health em intervalo menor que
 * a janela de hibernação (15 min). O keep-alive INTERNO do backend não segura
 * a hibernação porque, quando o Render suspende o processo, ele não consegue
 * se auto-pingar. Este ping é EXTERNO (roda na rede do Cloudflare), então
 * reseta o timer de ociosidade de forma confiável.
 *
 * Custo: zero (Workers free + Cron Triggers gratuitos).
 */

// Único serviço Render do projeto. O WebSocket (signaling/realtime) é servido
// pelo próprio backend — não há serviço de signaling separado.
const TARGETS = [
  'https://api.arxisvr.avilaops.com/health',
];

async function pingAll() {
  const results = await Promise.allSettled(
    TARGETS.map((url) =>
      fetch(url, { method: 'GET', cf: { cacheTtl: 0 } }).then((r) => `${url} -> ${r.status}`)
    )
  );
  for (const r of results) {
    if (r.status === 'fulfilled') console.log('[keepalive]', r.value);
    else console.error('[keepalive] falhou:', r.reason);
  }
}

export default {
  // Disparado pelo Cron Trigger (ver wrangler.toml).
  async scheduled(_event, _env, ctx) {
    ctx.waitUntil(pingAll());
  },
  // Endpoint manual para testar/disparar sob demanda.
  async fetch() {
    await pingAll();
    return new Response('arxisvr keepalive: ping enviado\n', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};

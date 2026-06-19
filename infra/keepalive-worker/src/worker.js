/**
 * arxisvr-keepalive — Cloudflare Worker (Cron Trigger)
 *
 * Mantém os serviços do Render acordados. O Render free tier hiberna após
 * ~50s sem requisições externas. Este Worker roda a cada minuto e pinga
 * duas vezes (t=0s e t=30s) para manter o timer de ociosidade zerado.
 *
 * Custo: zero (Workers free + Cron Triggers gratuitos).
 */

const TARGETS = [
  'https://api.arxisvr.avilaops.com/health',
  'https://arxisvr-signaling.onrender.com/health',
];

async function ping() {
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

async function pingTwice() {
  await ping();
  await new Promise((resolve) => setTimeout(resolve, 30_000));
  await ping();
}

export default {
  // Cron a cada 1 min (mínimo do CF). Dois pings em 30s de intervalo.
  async scheduled(_event, _env, ctx) {
    ctx.waitUntil(pingTwice());
  },
  // Endpoint manual para testar sob demanda.
  async fetch() {
    await ping();
    return new Response('arxisvr keepalive: ping enviado\n', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};

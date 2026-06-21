/**
 * arxisvr-keepalive — Cloudflare Worker (Cron Trigger)
 *
 * Mantém os serviços do Render acordados. O Render free tier hiberna após
 * ~50s sem requisições externas. Este Worker roda a cada minuto e pinga
 * com intervalos de 40 segundos alternando os tempos em minutos pares e ímpares.
 *
 * Custo: zero (Workers free + Cron Triggers gratuitos).
 */

const TARGETS = [
  'https://api.arxisvr.avilaops.com/health',
  'https://arxisvr-signaling.onrender.com/health',
  'https://internal.avilaops.com',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

export default {
  // Cron a cada 1 min (mínimo do CF). Lógica de minutos pares/ímpares
  // para conseguir um ping exatamente a cada 40 segundos.
  async scheduled(_event, _env, ctx) {
    ctx.waitUntil((async () => {
      const now = new Date();
      const minutes = now.getUTCMinutes();
      if (minutes % 2 === 0) {
        // Minuto par: ping em 0s e 40s
        console.log(`[keepalive] Minuto par (${minutes}). Pinging imediato (0s)...`);
        await ping();
        console.log(`[keepalive] Aguardando 40s...`);
        await sleep(40_000);
        console.log(`[keepalive] Pinging aos 40s...`);
        await ping();
      } else {
        // Minuto ímpar: ping em 20s (que dá 40s após o ping de 40s do minuto par anterior)
        console.log(`[keepalive] Minuto ímpar (${minutes}). Aguardando 20s...`);
        await sleep(20_000);
        console.log(`[keepalive] Pinging aos 20s...`);
        await ping();
      }
    })());
  },
  // Endpoint manual para testar sob demanda.
  async fetch() {
    await ping();
    return new Response('arxisvr keepalive: ping enviado\n', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};

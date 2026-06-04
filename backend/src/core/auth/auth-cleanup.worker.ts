import postgres from 'postgres';

export type AuthCleanupWorkerOptions = {
  intervalMs: number;
  logger: { info: (...a: any[]) => void; error: (...a: any[]) => void };
  expiredTokenRetentionDays?: number;
  zombieAccountAgeDays?: number;
};

export function createAuthCleanupWorker(options: AuthCleanupWorkerOptions) {
  const {
    intervalMs,
    logger,
    expiredTokenRetentionDays = 30,
    zombieAccountAgeDays = 2,
  } = options;

  let timer: NodeJS.Timeout | null = null;

  async function sweep(): Promise<{ tokensDeleted: number; sessionsDeleted: number; zombiesDeleted: number }> {
    const sql = postgres(process.env.DATABASE_URL!);
    try {
      // 1. Tokens expirados ou usados há mais de N dias
      const [tokensResult] = await sql`
        WITH deleted AS (
          DELETE FROM auth_tokens
          WHERE expires_at < NOW()
             OR (is_used = true AND used_at < NOW() - (${expiredTokenRetentionDays} || ' days')::INTERVAL)
          RETURNING id
        )
        SELECT COUNT(*)::int AS n FROM deleted
      `;

      // 2. Sessões expiradas e revogadas há mais de 30 dias
      const [sessionsResult] = await sql`
        WITH deleted AS (
          DELETE FROM user_sessions
          WHERE is_revoked = true
            AND revoked_at < NOW() - INTERVAL '30 days'
          RETURNING id
        )
        SELECT COUNT(*)::int AS n FROM deleted
      `;

      // 3. Contas zumbi — não verificadas com mais de N dias
      const [zombiesResult] = await sql`
        WITH deleted AS (
          DELETE FROM users
          WHERE email_verified = false
            AND created_at < NOW() - (${zombieAccountAgeDays} || ' days')::INTERVAL
          RETURNING id
        )
        SELECT COUNT(*)::int AS n FROM deleted
      `;

      const result = {
        tokensDeleted: tokensResult.n ?? 0,
        sessionsDeleted: sessionsResult.n ?? 0,
        zombiesDeleted: zombiesResult.n ?? 0,
      };

      if (result.tokensDeleted > 0 || result.sessionsDeleted > 0 || result.zombiesDeleted > 0) {
        logger.info('[auth-cleanup] sweep complete', result);
      }

      return result;
    } finally {
      await sql.end();
    }
  }

  function start() {
    if (timer) return;
    logger.info(`[auth-cleanup] worker started (interval=${intervalMs}ms)`);
    // Primeira execução após 1 min para não competir com startup
    timer = setInterval(() => {
      sweep().catch(err => logger.error('[auth-cleanup] sweep error:', err));
    }, intervalMs);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
      logger.info('[auth-cleanup] worker stopped');
    }
  }

  return { start, stop, sweep };
}

-- 031_user_activity_analytics.sql
-- Camada analítica de histórico e hábitos por usuário.
-- Construída SOBRE audit_logs (não duplica dados) + users + user_sessions.
-- Tudo são VIEWS: zero custo de escrita, sempre refletem o estado atual.

-- ============================================================
-- VIEW 1: vw_user_activity
-- Timeline limpa: 1 linha = 1 ação do usuário, com campos extraídos do metadata.
-- ============================================================
CREATE OR REPLACE VIEW vw_user_activity AS
SELECT
    a.id                                            AS event_id,
    a.user_id,
    u.email,
    u.name,
    a.tenant_id,
    a.timestamp                                     AS occurred_at,
    a.action,
    a.resource,
    a.resource_id,
    -- categoria derivada (hábito de uso)
    CASE
        WHEN a.resource = 'auth'              THEN 'Autenticação'
        WHEN a.action LIKE 'GET:%'            THEN 'Leitura/Navegação'
        WHEN a.action LIKE 'POST:%'           THEN 'Criação'
        WHEN a.action LIKE 'PUT:%'
          OR a.action LIKE 'PATCH:%'          THEN 'Edição'
        WHEN a.action LIKE 'DELETE:%'         THEN 'Exclusão'
        ELSE 'Outro'
    END                                             AS category,
    (a.metadata->>'method')                         AS http_method,
    (a.metadata->>'path')                           AS path,
    NULLIF(a.metadata->>'statusCode','')::int       AS status_code,
    NULLIF(a.metadata->>'duration','')::int         AS duration_ms,
    (a.metadata->>'ip')                             AS ip_address,
    (a.metadata->>'userAgent')                      AS user_agent,
    -- dispositivo/navegador derivado do user agent
    CASE
        WHEN a.metadata->>'userAgent' ILIKE '%Edg/%'      THEN 'Edge'
        WHEN a.metadata->>'userAgent' ILIKE '%Chrome/%'   THEN 'Chrome'
        WHEN a.metadata->>'userAgent' ILIKE '%Firefox/%'  THEN 'Firefox'
        WHEN a.metadata->>'userAgent' ILIKE '%Safari/%'   THEN 'Safari'
        ELSE 'Desconhecido'
    END                                             AS browser,
    CASE
        WHEN a.metadata->>'userAgent' ILIKE '%Windows%'   THEN 'Windows'
        WHEN a.metadata->>'userAgent' ILIKE '%Android%'   THEN 'Android'
        WHEN a.metadata->>'userAgent' ILIKE '%iPhone%'
          OR a.metadata->>'userAgent' ILIKE '%iPad%'      THEN 'iOS'
        WHEN a.metadata->>'userAgent' ILIKE '%Mac OS%'    THEN 'macOS'
        WHEN a.metadata->>'userAgent' ILIKE '%Linux%'     THEN 'Linux'
        ELSE 'Desconhecido'
    END                                             AS os,
    a.metadata
FROM audit_logs a
LEFT JOIN users u ON u.id = a.user_id;

-- ============================================================
-- VIEW 2: vw_user_habits
-- 1 linha por usuário = perfil de hábitos consolidado.
-- ============================================================
CREATE OR REPLACE VIEW vw_user_habits AS
SELECT
    u.id                                            AS user_id,
    u.email,
    u.name,
    u.tenant_id,
    u.role,
    u.oauth_provider,
    u.created_at                                    AS registered_at,
    u.last_login_at,
    COUNT(a.id)                                     AS total_events,
    COUNT(*) FILTER (WHERE a.resource = 'auth')     AS auth_events,
    COUNT(*) FILTER (WHERE a.action = 'auth.login.success') AS logins_ok,
    COUNT(*) FILTER (WHERE a.action = 'auth.login.failed')  AS logins_falhos,
    COUNT(*) FILTER (WHERE a.action LIKE 'GET:%')   AS leituras,
    COUNT(*) FILTER (WHERE a.action LIKE 'POST:%')  AS criacoes,
    COUNT(*) FILTER (WHERE a.action LIKE 'DELETE:%') AS exclusoes,
    MIN(a.timestamp)                                AS primeiro_evento,
    MAX(a.timestamp)                                AS ultimo_evento,
    COUNT(DISTINCT date_trunc('day', a.timestamp))  AS dias_ativos,
    COUNT(DISTINCT a.metadata->>'ip')               AS ips_distintos,
    ROUND(AVG(NULLIF(a.metadata->>'duration','')::numeric), 1) AS latencia_media_ms,
    -- horário preferido (moda da hora do dia)
    MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM a.timestamp)) AS hora_preferida,
    -- dia da semana preferido (0=domingo)
    MODE() WITHIN GROUP (ORDER BY EXTRACT(DOW FROM a.timestamp))  AS dia_semana_preferido
FROM users u
LEFT JOIN audit_logs a ON a.user_id = u.id
GROUP BY u.id, u.email, u.name, u.tenant_id, u.role, u.oauth_provider, u.created_at, u.last_login_at;

-- ============================================================
-- VIEW 3: vw_user_activity_by_hour
-- Heatmap de uso: quantos eventos por usuário x hora do dia.
-- ============================================================
CREATE OR REPLACE VIEW vw_user_activity_by_hour AS
SELECT
    a.user_id,
    u.email,
    EXTRACT(HOUR FROM a.timestamp)::int             AS hora,
    COUNT(*)                                        AS eventos
FROM audit_logs a
LEFT JOIN users u ON u.id = a.user_id
WHERE a.user_id IS NOT NULL
GROUP BY a.user_id, u.email, EXTRACT(HOUR FROM a.timestamp);

-- ============================================================
-- VIEW 4: vw_user_top_actions
-- Ações mais frequentes por usuário (ranking de hábitos).
-- ============================================================
CREATE OR REPLACE VIEW vw_user_top_actions AS
SELECT
    a.user_id,
    u.email,
    a.action,
    a.resource,
    COUNT(*)                                        AS vezes,
    MAX(a.timestamp)                                AS ultima_vez
FROM audit_logs a
LEFT JOIN users u ON u.id = a.user_id
WHERE a.user_id IS NOT NULL
GROUP BY a.user_id, u.email, a.action, a.resource;

-- Índices de apoio (aceleram os agregados por usuário/tempo)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time ON audit_logs (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action    ON audit_logs (action);

-- 056: e-mail em minusculas, e o banco passa a garantir isso.
--
-- Em 08/09/2026 o Nicolas se cadastrou pelo iPhone, que capitaliza a primeira
-- letra: a conta nasceu como "Nicolasrosaab@gmail.com". No login o navegador
-- preencheu "nicolasrosaab@gmail.com" e o backend comparou com case: senha
-- certa, "Credenciais invalidas". O codigo agora normaliza nos schemas de login
-- e registro, no forgotPassword e no OAuth. Esta migration cuida do que ja
-- existia e impede que volte a acontecer por qualquer outro caminho.

-- 1) Normaliza o que ja esta gravado. Se duas linhas colidirem so por case,
--    mantem a mais antiga (ela e a que o usuario provavelmente conhece) e
--    marca a outra com sufixo para nao perder dado nem violar unicidade.
WITH ranked AS (
  SELECT id,
         email,
         lower(trim(email)) AS norm,
         row_number() OVER (PARTITION BY lower(trim(email)) ORDER BY created_at, id) AS rn
  FROM users
)
UPDATE users u
SET email = CASE
              WHEN r.rn = 1 THEN r.norm
              ELSE r.norm || '+dup' || r.rn
            END
FROM ranked r
WHERE u.id = r.id
  AND u.email IS DISTINCT FROM (CASE WHEN r.rn = 1 THEN r.norm ELSE r.norm || '+dup' || r.rn END);

-- 2) Unicidade sem case, global (o indice existente e por tenant e por case,
--    e cada cadastro cria o proprio tenant, entao nao pegava nada).
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique_idx
  ON users (lower(email));

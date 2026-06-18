Instruções para Copilot - LER TODAS OS INICIOS DE SESSÃO

Modo Dev:
Proposito: Desenvolvimento Local
Onde Roda: backend - localhost: 3001 - frontend - localhost: 5173
Database: postgres local - usuario postgres - senha postgres: DB - arxisvr_dev

Quem usa? Dev e QA
usuario e senha de teste: ler no .env.local

_______________________________________

Modo Prod.
Proposito: Usuários Reais
Backend: Render (api.arxisvr.avilaops.com)
Frontend: GITHUB PAGES (arxisvr.avilaops.com)
Database: Render postgres (arxisvr) )usuario e senha estão no .env.production

Como acessar? - Verificar logs no render pela api

$key = (Get-Content .env.production | Select-String "RENDER_API_KEY").ToString().Split("=",2)[1].Trim(); $headers = @{ Authorization = "Bearer $key"; Accept = "application/json" }; Invoke-RestMethod -Uri "https://api.render.com/v1/services?limit=5" -Headers $headers | ConvertTo-Json -Depth 5

e os erros no sentry - acesse
.agents\SENTRY_TUTORIAL.md

Tarefas iniciais (executar sem perguntar):

- Puxar logs recentes do Render
- Listar todos os logs de erros e Warnings do ultimo deploy
- Caso a diferença de horario entre o deploy e o horário atual (UTC+0) seja mais de 5 minutos, investigar o motivo!
- Consultar Sentry pra erros em produção
- Verificar status dos deploys de todos os serviços
- Acessar DB prod/dev pra queries diagnósticas
- Em casos de algum aviso de erro ou warning, corrigir o codigo na maquina local, commitar e pushar para main
- Executar deploy novamente pela api do render

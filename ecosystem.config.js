// PM2 — ArxisVR em produção (/opt/arxisvr), sem Docker.
//
// Node e Postgres rodam nativos no host. Só o Caddy que serve o `dist` do
// frontend continua em container (deploy/docker-compose.yml).
//
// O `.env` é carregado pelo próprio Node via `--env-file`, e não mais pelo
// `env_file:` do compose. É proposital que o processo MORRA se o arquivo não
// existir: subir a API sem DATABASE_URL é pior do que não subir.
module.exports = {
  apps: [
    {
      name: 'arxisvr-backend',
      cwd: '/opt/arxisvr/backend',
      script: 'node',
      args: '--env-file=/opt/arxisvr/.env --import ./dist/instrument.js dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        HOST: '0.0.0.0'
      },
      error_file: '/opt/arxisvr/logs/backend-error.log',
      out_file: '/opt/arxisvr/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    },
    {
      name: 'arxisvr-signaling',
      cwd: '/opt/arxisvr/signaling-server',
      script: 'node',
      args: '--env-file-if-exists=/opt/arxisvr/.env server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        SIGNALING_PORT: '3002'
      },
      error_file: '/opt/arxisvr/logs/signaling-error.log',
      out_file: '/opt/arxisvr/logs/signaling-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};

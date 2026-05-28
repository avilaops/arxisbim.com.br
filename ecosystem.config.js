module.exports = {
  apps: [
    {
      name: 'arxisvr-backend',
      cwd: '/opt/arxisvr/backend',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        HOST: '0.0.0.0',
        DOTENV_CONFIG_PATH: '/opt/arxisvr/.env'
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
      script: 'npm',
      args: 'start',
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

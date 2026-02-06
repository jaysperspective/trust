module.exports = {
  apps: [
    {
      name: 'rss-x-autoposter',
      script: 'dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
      },
      // Load environment from .env file
      env_file: '.env',
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'data/logs/pm2-error.log',
      out_file: 'data/logs/pm2-out.log',
      merge_logs: true,
      // Restart policy
      exp_backoff_restart_delay: 1000,
      max_restarts: 10,
      restart_delay: 5000,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};

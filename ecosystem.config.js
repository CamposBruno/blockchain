module.exports = {
  apps : [
    {
      name: 'BLOCKCHAIN',
      script: 'index.js',
      cwd: __dirname ,
      instances: 1,
      autorestart: true,
      wait_ready: true,
      exp_backoff_restart_delay: 100,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      
    }       
  ]
};

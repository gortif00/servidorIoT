module.exports = {
  apps: [
    {
      name: 'servidor-iot',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        MQTT_PORT: 1883,
        MQTT_WS_PORT: 8888,
        MQTT_USERNAME: 'datosiot',
        MQTT_PASSWORD: 'datosiot@2026'
      }
    }
  ]
};

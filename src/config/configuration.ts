export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    host: process.env.POSTGRESQL_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRESQL_PORT ?? '5433', 10),
    name: process.env.POSTGRESQL_DATABASE ?? 'freego',
    username: process.env.POSTGRESQL_USERNAME ?? 'postgres',
    password: process.env.POSTGRESQL_PASSWORD ?? 'postgres',
  },
  bot: {
    token: process.env.BOT_TOKEN ?? '',
    username: process.env.BOT_USERNAME ?? '',
  },
  miniAppUrl: process.env.MINI_APP_URL ?? '',
  adminIds: (process.env.ADMIN_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
  initDataExpire: parseInt(process.env.INIT_DATA_EXPIRE ?? '3600', 10),
});

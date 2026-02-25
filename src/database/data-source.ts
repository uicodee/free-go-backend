import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRESQL_HOST ?? 'localhost',
  port: Number(process.env.POSTGRESQL_PORT ?? '5433'),
  username: process.env.POSTGRESQL_USERNAME ?? 'postgres',
  password: process.env.POSTGRESQL_PASSWORD ?? 'postgres',
  database: process.env.POSTGRESQL_DATABASE ?? 'freego',
  entities: ['src/**/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
};

export const AppDataSource = new DataSource(dataSourceOptions);

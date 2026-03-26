/**
 * Resolves Azure SQL / SQL Server connection settings from env.
 * Primary: DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD
 * Legacy fallbacks: INTERTALENT_SQL_* and AZURE_SQL_* (for existing deployments)
 */

import type sql from 'mssql';

const DEFAULT_SERVER = 'ipsql2025.database.windows.net';
const DEFAULT_DATABASE = 'intertalent_DB';

export function getMssqlBaseConfig(): sql.config {
  return {
    server:
      process.env.DB_SERVER ||
      process.env.INTERTALENT_SQL_SERVER ||
      process.env.AZURE_SQL_SERVER ||
      DEFAULT_SERVER,
    database:
      process.env.DB_NAME ||
      process.env.INTERTALENT_SQL_DATABASE ||
      process.env.AZURE_SQL_DATABASE ||
      DEFAULT_DATABASE,
    user:
      process.env.DB_USER ||
      process.env.INTERTALENT_SQL_USER ||
      process.env.AZURE_SQL_USER,
    password:
      process.env.DB_PASSWORD ||
      process.env.INTERTALENT_SQL_PASSWORD ||
      process.env.AZURE_SQL_PASSWORD,
    options: {
      encrypt: true,
      enableArithAbort: true,
      trustServerCertificate: false,
    },
  };
}

/** Config including connection pool options (app runtime). */
export function getMssqlPooledConfig(): sql.config {
  return {
    ...getMssqlBaseConfig(),
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

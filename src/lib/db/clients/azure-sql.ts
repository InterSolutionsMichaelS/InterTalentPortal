/**
 * Azure SQL Connection Pool
 * Shared connection pool for all database operations
 */

import sql from 'mssql';

const config: sql.config = {
  server: process.env.INTERTALENT_SQL_SERVER || 'ipsql2025.database.windows.net',
  database: process.env.INTERTALENT_SQL_DATABASE || 'intertalent_DB',
  user: process.env.INTERTALENT_SQL_USER,
  password: process.env.INTERTALENT_SQL_PASSWORD,
  options: {
    encrypt: true, // Required for Azure
    enableArithAbort: true,
    trustServerCertificate: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

/**
 * Get or create connection pool
 */
export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('✅ Connected to Azure SQL');
  }
  return pool;
}

/**
 * Close connection pool (for cleanup)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('🔌 Closed Azure SQL connection');
  }
}

export { sql };

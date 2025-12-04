/**
 * Database Factory and Export
 * Central point for database access throughout the application
 */

import { PostgresDatabase } from './implementations/postgres';
import { AzureSqlDatabase } from './implementations/azure-sql';
import type { IDatabase } from './interface';

/**
 * Create database instance based on environment configuration
 * Week 1-2: Uses PostgreSQL (Supabase)
 * Week 3: Will switch to Azure SQL via DATABASE_TYPE env var
 */
function createDatabase(): IDatabase {
  const dbType = process.env.DATABASE_TYPE || 'postgres';

  // PostgreSQL (Supabase)
  if (dbType === 'postgres') {
    const { supabase, supabaseAdmin } = require('./supabase'); // Lazy-load only when needed
    return new PostgresDatabase(supabase, supabaseAdmin);
  }

  // Azure SQL
  if (dbType === 'azure-sql') {
    return new AzureSqlDatabase();
  }

  throw new Error(`Unknown database type: ${dbType}`);
}

/**
 * Singleton database instance
 * Import this throughout your application
 *
 * Usage:
 * import { db } from '@/lib/db';
 * const profiles = await db.getAllProfiles();
 */
export const db = createDatabase();

// Re-export types for convenience
export type { IDatabase } from './interface';
export type {
  ProfileSearchParams,
  PaginatedProfiles,
  StateInfo,
  OfficeInfo,
  LocationEmailResult,
} from './interface';
export type { Profile } from './supabase';

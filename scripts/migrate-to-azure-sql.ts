/**
 * Azure SQL Data Migration Script
 * Migrates profile data from CSV to Azure SQL Database
 *
 * Prerequisites:
 * 1. Azure SQL database created with schema (run azure-sql-schema.sql first)
 * 2. mssql package installed (npm install mssql)
 * 3. Azure SQL credentials configured below
 *
 * Usage:
 *   npx tsx scripts/migrate-to-azure-sql.ts
 */

import sql from 'mssql';
import path from 'path';
import fs from 'fs';
import { parseCSV } from '../src/lib/data/csv-parser';
import { parseFullName } from '../src/utils/name-parser';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const config: sql.config = {
  server: process.env.AZURE_SQL_SERVER || 'ipsql2025.database.windows.net',
  database: process.env.AZURE_SQL_DATABASE || 'ipsql2025',
  user: process.env.AZURE_SQL_USER || 'YOUR_SQL_USERNAME_HERE',
  password: process.env.AZURE_SQL_PASSWORD || 'YOUR_SQL_PASSWORD_HERE',
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

// ============================================
// MIGRATION LOGIC
// ============================================

async function migrateData() {
  console.log('🚀 Azure SQL Migration Starting...\n');
  console.log('='.repeat(50));
  console.log(`Server: ${config.server}`);
  console.log(`Database: ${config.database}`);
  console.log(`User: ${config.user}`);
  console.log('='.repeat(50) + '\n');

  let pool: sql.ConnectionPool | null = null;

  try {
    // Connect to Azure SQL
    console.log('📡 Connecting to Azure SQL Server...');
    pool = await sql.connect(config);
    console.log('✅ Connected successfully!\n');

    // Find latest CSV file
    const dataDir = path.join(process.cwd(), 'data');

    if (!fs.existsSync(dataDir)) {
      throw new Error(`Data directory not found: ${dataDir}`);
    }

    const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.csv'));

    if (files.length === 0) {
      throw new Error('No CSV files found in data/ directory');
    }

    const latestFile = files.sort().reverse()[0];
    const csvPath = path.join(dataDir, latestFile);

    console.log(`📁 CSV File: ${latestFile}`);
    console.log(`📍 Path: ${csvPath}\n`);

    // Parse CSV
    console.log('📊 Parsing CSV data...');
    const records = await parseCSV(csvPath);
    console.log(`✅ Parsed ${records.length} profile records\n`);

    // Optional: Clear existing data (uncomment if needed)
    // console.log('🗑️  Clearing existing profiles...');
    // await pool.request().query('DELETE FROM profiles');
    // console.log('✅ Existing data cleared\n');

    // Check if data already exists
    const countResult = await pool
      .request()
      .query('SELECT COUNT(*) as count FROM profiles');
    const existingCount = countResult.recordset[0].count;

    if (existingCount > 0) {
      console.log(
        `⚠️  Warning: ${existingCount} profiles already exist in database`
      );
      console.log('   New records will be added (duplicates possible)');
      console.log(
        '   To clear first, uncomment the DELETE query in the script\n'
      );
    }

    // Insert profiles in batches
    console.log('💾 Inserting profiles into Azure SQL...');
    const batchSize = 100;
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      for (const record of batch) {
        try {
          const { firstName, lastInitial } = parseFullName(
            record['First Name'],
            record['Last Initial']
          );

          const id = uuidv4();

          await pool
            .request()
            .input('id', sql.UniqueIdentifier, id)
            .input('firstName', sql.NVarChar(100), firstName)
            .input('lastInitial', sql.NVarChar(1), lastInitial)
            .input('city', sql.NVarChar(100), record['City'])
            .input('state', sql.NVarChar(2), record['State'])
            .input('zipCode', sql.NVarChar(10), record['Zip Code'])
            .input(
              'professionalSummary',
              sql.NVarChar(sql.MAX),
              record['Professional Summary']
            )
            .input('office', sql.NVarChar(100), record['Office'])
            .input(
              'professionType',
              sql.NVarChar(100),
              record['Profession Type']
            )
            .input('sourceFile', sql.NVarChar(255), latestFile).query(`
              INSERT INTO profiles (
                id, first_name, last_initial, city, state, zip_code,
                professional_summary, office, profession_type, source_file, is_active
              ) VALUES (
                @id, @firstName, @lastInitial, @city, @state, @zipCode,
                @professionalSummary, @office, @professionType, @sourceFile, 1
              )
            `);

          inserted++;
        } catch (error: any) {
          errors++;
          console.error(`  ❌ Error inserting profile: ${error.message}`);
        }
      }

      // Progress update
      const progress = Math.min(i + batchSize, records.length);
      const percent = Math.round((progress / records.length) * 100);
      process.stdout.write(
        `  → Progress: ${progress}/${records.length} (${percent}%)    \r`
      );
    }

    console.log('\n');

    // Final statistics
    console.log('='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully inserted: ${inserted} profiles`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors} profiles`);
    }
    console.log('='.repeat(50) + '\n');

    // Verify data in database
    console.log('🔍 Verifying data in Azure SQL...');
    const verifyResult = await pool.request().query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active,
        COUNT(DISTINCT profession_type) as professions,
        COUNT(DISTINCT state) as states
      FROM profiles
    `);

    const stats = verifyResult.recordset[0];
    console.log(`  📦 Total profiles: ${stats.total}`);
    console.log(`  ✅ Active profiles: ${stats.active}`);
    console.log(`  💼 Unique professions: ${stats.professions}`);
    console.log(`  📍 Unique states: ${stats.states}\n`);

    // Sample data check
    console.log('👤 Sample profiles:');
    const sampleResult = await pool.request().query(`
      SELECT TOP 3 first_name, last_initial, profession_type, city, state
      FROM profiles
      WHERE is_active = 1
      ORDER BY created_at DESC
    `);

    sampleResult.recordset.forEach((row, index) => {
      console.log(
        `  ${index + 1}. ${row.first_name} ${row.last_initial}. - ${row.profession_type} (${row.city}, ${row.state})`
      );
    });

    console.log('\n✅ Migration completed successfully!\n');
  } catch (error: any) {
    console.error('\n❌ Migration failed!\n');
    console.error('Error details:');
    console.error(error);

    if (error.code === 'ELOGIN') {
      console.error('\n💡 Tip: Check your SQL credentials (username/password)');
    } else if (error.code === 'ESOCKET') {
      console.error('\n💡 Tip: Check firewall rules and server name');
    } else if (error.message.includes('Invalid object name')) {
      console.error(
        '\n💡 Tip: Run azure-sql-schema.sql first to create tables'
      );
    }

    process.exit(1);
  } finally {
    // Close connection
    if (pool) {
      await pool.close();
      console.log('🔌 Connection closed\n');
    }
  }
}

// Run migration
migrateData();

/**
 * Azure SQL Database Implementation
 * Implements IDatabase interface using mssql driver
 */

import sql from 'mssql';
import { getPool } from '../clients/azure-sql';
import type {
  IDatabase,
  ProfileSearchParams,
  PaginatedProfiles,
  StateInfo,
  OfficeInfo,
} from '../interface';
import type { Profile } from '../supabase';
import {
  getZipCodesWithinRadius,
  getProfilesWithinRadius,
  getZipLocation,
  getCityLocation,
} from '../../geospatial';

export class AzureSqlDatabase implements IDatabase {
  private pool: sql.ConnectionPool | null = null;

  private async getConnection(): Promise<sql.ConnectionPool> {
    if (!this.pool) {
      this.pool = await getPool();
    }
    return this.pool;
  }

  /**
   * Convert SQL Server row to Profile type
   */
  private rowToProfile(row: Record<string, any>): Profile {
    return {
      id: row.id,
      first_name: row.first_name,
      last_initial: row.last_initial,
      city: row.city,
      state: row.state,
      zip_code: row.zip_code,
      professional_summary: row.professional_summary,
      office: row.office,
      profession_type: row.profession_type,
      skills: row.skills || null,
      source_file: row.source_file || null,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Get all profiles with pagination and sorting
   */
  async getAllProfiles(
    page: number = 1,
    limit: number = 20,
    sortBy: 'name' | 'location' | 'profession' = 'name',
    sortDirection: 'asc' | 'desc' = 'asc'
  ): Promise<PaginatedProfiles> {
    const pool = await this.getConnection();
    const offset = (page - 1) * limit;

    // Determine sort column
    let sortColumn: string;
    switch (sortBy) {
      case 'name':
        sortColumn = 'first_name';
        break;
      case 'location':
        sortColumn = 'city';
        break;
      case 'profession':
        sortColumn = 'profession_type';
        break;
      default:
        sortColumn = 'first_name';
    }

    const sortDir = sortDirection.toUpperCase();

    // Get total count
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total
      FROM profiles
      WHERE is_active = 1
    `);
    const total = countResult.recordset[0].total;

    // Get paginated data
    const dataResult = await pool
      .request()
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit).query(`
        SELECT *
        FROM profiles
        WHERE is_active = 1
        ORDER BY ${sortColumn} ${sortDir}
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

    const profiles = dataResult.recordset.map((row: any) =>
      this.rowToProfile(row)
    );

    return {
      profiles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get profile by ID
   */
  async getProfileById(id: string): Promise<Profile | null> {
    const pool = await this.getConnection();

    const result = await pool.request().input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT *
        FROM profiles
        WHERE id = @id AND is_active = 1
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return this.rowToProfile(result.recordset[0]);
  }

  /**
   * Search profiles with filters
   * Supports multiple keywords, multiple professions, and multiple zip codes (OR logic)
   */
  async searchProfiles(
    params: ProfileSearchParams
  ): Promise<PaginatedProfiles> {
    const pool = await this.getConnection();
    const {
      query,
      keywords,
      professionTypes,
      city,
      state,
      zipCode,
      zipCodes,
      radius,
      office,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortDirection = 'asc',
    } = params;

    const offset = (page - 1) * limit;

    // Build WHERE clause dynamically
    const conditions: string[] = ['is_active = 1'];
    const request = pool.request();

    // Multiple keyword search with OR logic
    // Each keyword searches across: professional_summary, first_name, last_initial, city
    const keywordsToSearch =
      keywords && keywords.length > 0 ? keywords : query ? [query] : [];

    if (keywordsToSearch.length > 0) {
      // Build OR conditions for keywords across multiple fields
      const keywordConditions = keywordsToSearch
        .map((kw, index) => {
          const paramName = `keyword${index}`;
          request.input(paramName, sql.NVarChar(sql.MAX), `%${kw.trim()}%`);
          return `(professional_summary LIKE @${paramName} OR first_name LIKE @${paramName} OR last_initial LIKE @${paramName} OR city LIKE @${paramName})`;
        })
        .join(' OR ');

      conditions.push(`(${keywordConditions})`);
    }

    // Multiple profession types with OR logic (case-insensitive)
    if (professionTypes && professionTypes.length > 0) {
      const professionConditions = professionTypes
        .map((prof, index) => {
          const paramName = `profession${index}`;
          request.input(paramName, sql.NVarChar(100), prof);
          // SQL Server: LIKE is case-insensitive by default (depends on collation)
          return `profession_type LIKE @${paramName}`;
        })
        .join(' OR ');

      conditions.push(`(${professionConditions})`);
    }

    // Handle geospatial radius search
    let radiusFilteredIds: string[] | null = null;
    let radiusSearchAttempted = false;
    let radiusSearchSucceeded = false;

    if (radius && radius > 0) {
      let centerLocation: string | null = null;
      let stateFilter = state;

      radiusSearchAttempted = true;

      // Aggregate all zip codes provided (allow multi-center searches)
      const centerZipCodes = Array.from(
        new Set([
          ...(zipCode ? [zipCode] : []),
          ...(zipCodes && zipCodes.length > 0 ? zipCodes : []),
        ])
      );

      if (centerZipCodes.length > 0) {
        console.log(
          `Radius search with ${centerZipCodes.length} center zip code(s): ${centerZipCodes.join(', ')}`
        );

        if (!stateFilter) {
          try {
            const zipLocation = await getZipLocation(centerZipCodes[0]);
            if (zipLocation && zipLocation.state) {
              stateFilter = zipLocation.state;
              console.log(
                `Extracted state '${stateFilter}' from zip code ${centerZipCodes[0]}`
              );
            }
          } catch {
            console.warn(
              `Could not extract state from zip ${centerZipCodes[0]}`
            );
          }
        }
      } else if (city) {
        centerLocation = city;
      }

      if (centerZipCodes.length > 0) {
        try {
          console.log(
            `Attempting optimized zip code radius search for ${centerZipCodes.length} center(s) within ${radius} miles`
          );

          const allNearbyZipCodesArrays = await Promise.all(
            centerZipCodes.map((centerZip) =>
              getZipCodesWithinRadius(centerZip, radius)
            )
          );

          const allNearbyZipCodes = Array.from(
            new Set(allNearbyZipCodesArrays.flatMap((zips) => zips ?? []))
          );

          if (allNearbyZipCodes.length > 0) {
            console.log(
              `Found ${allNearbyZipCodes.length} unique zip codes within radius from ${centerZipCodes.length} center(s)`
            );

            const zipPlaceholders = allNearbyZipCodes
              .map((z, index) => {
                const paramName = `radiusZip${index}`;
                request.input(paramName, sql.NVarChar(10), z);
                return `@${paramName}`;
              })
              .join(', ');

            conditions.push(`zip_code IN (${zipPlaceholders})`);
            radiusSearchSucceeded = true;
          } else {
            console.log(
              'Zip code radius API not available - falling back to geocoding method'
            );
          }

          if (!radiusSearchSucceeded) {
            const preFilterConditions: string[] = ['is_active = 1'];
            const preFilterRequest = pool.request();

            if (professionTypes && professionTypes.length > 0) {
              const professionConditions = professionTypes
                .map((prof, index) => {
                  const paramName = `preProf${index}`;
                  preFilterRequest.input(paramName, sql.NVarChar(100), prof);
                  return `profession_type LIKE @${paramName}`;
                })
                .join(' OR ');
              preFilterConditions.push(`(${professionConditions})`);
            }

            if (keywordsToSearch.length > 0) {
              const keywordConditions = keywordsToSearch
                .map((kw, index) => {
                  const paramName = `preKw${index}`;
                  preFilterRequest.input(
                    paramName,
                    sql.NVarChar(sql.MAX),
                    `%${kw.trim()}%`
                  );
                  return `(professional_summary LIKE @${paramName} OR first_name LIKE @${paramName} OR last_initial LIKE @${paramName} OR city LIKE @${paramName})`;
                })
                .join(' OR ');
              preFilterConditions.push(`(${keywordConditions})`);
            }

            if (office) {
              preFilterConditions.push('office = @preOffice');
              preFilterRequest.input('preOffice', sql.NVarChar(100), office);
            }

            console.log(
              `Zip-based radius search (fallback) - not filtering by state`
            );

            const preFilterWhereClause = preFilterConditions.join(' AND ');
            const preFilterResult = await preFilterRequest.query(`
              SELECT id, zip_code, city, state
              FROM profiles
              WHERE ${preFilterWhereClause}
            `);

            const filteredProfiles = preFilterResult.recordset;

            if (filteredProfiles && filteredProfiles.length > 0) {
              try {
                const allRadiusFilteredIdsSet = new Set<string>();

                for (const centerZip of centerZipCodes) {
                  const idsForCenter = await getProfilesWithinRadius(
                    centerZip,
                    radius,
                    filteredProfiles
                  );
                  idsForCenter.forEach((id) => allRadiusFilteredIdsSet.add(id));
                  console.log(
                    `Found ${idsForCenter.length} profiles within ${radius} miles of ${centerZip}`
                  );
                }

                radiusFilteredIds = Array.from(allRadiusFilteredIdsSet);

                if (radiusFilteredIds.length === 0) {
                  return {
                    profiles: [],
                    total: 0,
                    page,
                    limit,
                    totalPages: 0,
                  };
                }

                const idPlaceholders = radiusFilteredIds
                  .map((id, index) => {
                    const paramName = `radiusId${index}`;
                    request.input(paramName, sql.UniqueIdentifier, id);
                    return `@${paramName}`;
                  })
                  .join(', ');

                conditions.push(`id IN (${idPlaceholders})`);
                radiusSearchSucceeded = true;
              } catch (radiusError) {
                console.error(
                  'Radius search error - using pre-filtered profiles as fallback:',
                  radiusError
                );
                radiusFilteredIds = filteredProfiles.map((p) => p.id);
                radiusSearchSucceeded = true;
              }
            } else {
              return {
                profiles: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
              };
            }
          }
        } catch (error) {
          console.error('Error in radius search:', error);
        }
      } else if (centerLocation) {
        try {
          const preFilterConditions: string[] = ['is_active = 1'];
          const preFilterRequest = pool.request();

          if (professionTypes && professionTypes.length > 0) {
            const professionConditions = professionTypes
              .map((prof, index) => {
                const paramName = `preProf${index}`;
                preFilterRequest.input(paramName, sql.NVarChar(100), prof);
                return `profession_type LIKE @${paramName}`;
              })
              .join(' OR ');
            preFilterConditions.push(`(${professionConditions})`);
          }

          if (keywordsToSearch.length > 0) {
            const keywordConditions = keywordsToSearch
              .map((kw, index) => {
                const paramName = `preKw${index}`;
                preFilterRequest.input(
                  paramName,
                  sql.NVarChar(sql.MAX),
                  `%${kw.trim()}%`
                );
                return `(professional_summary LIKE @${paramName} OR first_name LIKE @${paramName} OR last_initial LIKE @${paramName} OR city LIKE @${paramName})`;
              })
              .join(' OR ');
            preFilterConditions.push(`(${keywordConditions})`);
          }

          if (office) {
            preFilterConditions.push('office = @preOffice');
            preFilterRequest.input('preOffice', sql.NVarChar(100), office);
          }

          if (stateFilter && city) {
            preFilterConditions.push('state = @preState');
            preFilterRequest.input(
              'preState',
              sql.NVarChar(2),
              stateFilter.toUpperCase()
            );
          } else if (city && !stateFilter) {
            preFilterConditions.push('city LIKE @preCity');
            preFilterRequest.input('preCity', sql.NVarChar(100), `%${city}%`);
          }

          const preFilterWhereClause = preFilterConditions.join(' AND ');
          const preFilterResult = await preFilterRequest.query(`
            SELECT id, zip_code, city, state
            FROM profiles
            WHERE ${preFilterWhereClause}
          `);

          const filteredProfiles = preFilterResult.recordset;

          if (filteredProfiles && filteredProfiles.length > 0) {
            try {
              const centerCoords = await getCityLocation(city!, state);
              if (!centerCoords) {
                radiusFilteredIds = filteredProfiles.map((p) => p.id);
              } else {
                radiusFilteredIds = await getProfilesWithinRadius(
                  centerLocation,
                  radius,
                  filteredProfiles,
                  centerCoords
                );
              }

              if (radiusFilteredIds.length === 0) {
                return {
                  profiles: [],
                  total: 0,
                  page,
                  limit,
                  totalPages: 0,
                };
              }

              const idPlaceholders = radiusFilteredIds
                .map((id, index) => {
                  const paramName = `radiusId${index}`;
                  request.input(paramName, sql.UniqueIdentifier, id);
                  return `@${paramName}`;
                })
                .join(', ');

              conditions.push(`id IN (${idPlaceholders})`);
              radiusSearchSucceeded = true;
            } catch (geoError) {
              console.error('City-based radius search failed:', geoError);
              radiusFilteredIds = filteredProfiles.map((p) => p.id);
              radiusSearchSucceeded = true;
            }
          } else {
            return {
              profiles: [],
              total: 0,
              page,
              limit,
              totalPages: 0,
            };
          }
        } catch (error) {
          console.error('Error in city-based radius search:', error);
        }
      }
    } else if (zipCodes && zipCodes.length > 0) {
      // Multiple zip codes with OR logic (for non-radius searches)
      const zipPlaceholders = zipCodes
        .map((z, index) => {
          const paramName = `zip${index}`;
          request.input(paramName, sql.NVarChar(10), z);
          return `@${paramName}`;
        })
        .join(', ');

      conditions.push(`zip_code IN (${zipPlaceholders})`);
    } else if (zipCode) {
      // Single zip code (legacy support)
      conditions.push('zip_code = @zipCode');
      request.input('zipCode', sql.NVarChar(10), zipCode);
    }

    // Location filters (only if not doing radius search)
    const isRadiusSearch = radius && radius > 0;

    if (!isRadiusSearch) {
      if (city) {
        conditions.push('city LIKE @city');
        request.input('city', sql.NVarChar(100), `%${city}%`);
      }

      if (state) {
        conditions.push('state = @state');
        request.input('state', sql.NVarChar(2), state.toUpperCase());
      }
    }

    // FALLBACK: If radius search was attempted but failed
    if (radiusSearchAttempted && !radiusSearchSucceeded) {
      console.log('Radius search failed, applying state filter as fallback');
      if (state) {
        conditions.push('state = @fallbackState');
        request.input('fallbackState', sql.NVarChar(2), state.toUpperCase());
      }
    }

    if (office) {
      conditions.push('office = @office');
      request.input('office', sql.NVarChar(100), office);
    }

    const whereClause = conditions.join(' AND ');

    // Determine sort column
    let sortColumn: string;
    switch (sortBy) {
      case 'name':
        sortColumn = 'first_name';
        break;
      case 'location':
        sortColumn = 'city';
        break;
      case 'profession':
        sortColumn = 'profession_type';
        break;
      default:
        sortColumn = 'first_name';
    }

    const sortDir = sortDirection.toUpperCase();

    // Get total count
    const countResult = await request.query(`
      SELECT COUNT(*) as total
      FROM profiles
      WHERE ${whereClause}
    `);
    const total = countResult.recordset[0].total;

    // Get paginated data
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);

    const dataResult = await request.query(`
      SELECT *
      FROM profiles
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    const profiles = dataResult.recordset.map((row) => this.rowToProfile(row));

    return {
      profiles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get distinct profession types
   */
  async getProfessionTypes(): Promise<string[]> {
    const pool = await this.getConnection();

    const result = await pool.request().query(`
      SELECT DISTINCT profession_type
      FROM profiles
      WHERE is_active = 1
      ORDER BY profession_type
    `);

    return result.recordset.map((row) => row.profession_type);
  }

  /**
   * Get distinct states
   */
  async getStates(): Promise<StateInfo[]> {
    const pool = await this.getConnection();

    const result = await pool.request().query(`
      SELECT DISTINCT state as code, state as name
      FROM profiles
      WHERE is_active = 1
      ORDER BY state
    `);

    return result.recordset.map((row) => ({
      code: row.code,
      name: row.name,
    }));
  }

  /**
   * Get distinct offices
   */
  async getOffices(): Promise<OfficeInfo[]> {
    const pool = await this.getConnection();

    const result = await pool.request().query(`
      SELECT DISTINCT office as name, city, state
      FROM profiles
      WHERE is_active = 1
      ORDER BY office
    `);

    return result.recordset.map((row) => ({
      name: row.name,
      city: row.city,
      state: row.state,
    }));
  }

  /**
   * Insert profiles (for sync service)
   */
  async insertProfiles(profiles: Profile[]): Promise<void> {
    const pool = await this.getConnection();

    for (const profile of profiles) {
      await pool
        .request()
        .input('id', sql.UniqueIdentifier, profile.id)
        .input('firstName', sql.NVarChar(100), profile.first_name)
        .input('lastInitial', sql.NVarChar(1), profile.last_initial)
        .input('city', sql.NVarChar(100), profile.city)
        .input('state', sql.NVarChar(2), profile.state)
        .input('zipCode', sql.NVarChar(10), profile.zip_code)
        .input(
          'professionalSummary',
          sql.NVarChar(sql.MAX),
          profile.professional_summary
        )
        .input('office', sql.NVarChar(100), profile.office)
        .input('professionType', sql.NVarChar(100), profile.profession_type)
        .query(`
          INSERT INTO profiles (
            id, first_name, last_initial, city, state, zip_code,
            professional_summary, office, profession_type, is_active
          ) VALUES (
            @id, @firstName, @lastInitial, @city, @state, @zipCode,
            @professionalSummary, @office, @professionType, 1
          )
        `);
    }
  }

  /**
   * Update profile (for sync service)
   */
  async updateProfile(id: string, data: Partial<Profile>): Promise<void> {
    const pool = await this.getConnection();
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    const updates: string[] = [];

    if (data.professional_summary !== undefined) {
      updates.push('professional_summary = @professionalSummary');
      request.input(
        'professionalSummary',
        sql.NVarChar(sql.MAX),
        data.professional_summary
      );
    }

    if (data.office !== undefined) {
      updates.push('office = @office');
      request.input('office', sql.NVarChar(100), data.office);
    }

    if (data.profession_type !== undefined) {
      updates.push('profession_type = @professionType');
      request.input('professionType', sql.NVarChar(100), data.profession_type);
    }

    if (data.zip_code !== undefined) {
      updates.push('zip_code = @zipCode');
      request.input('zipCode', sql.NVarChar(10), data.zip_code);
    }

    if (updates.length === 0) return;

    await request.query(`
      UPDATE profiles
      SET ${updates.join(', ')}
      WHERE id = @id
    `);
  }

  /**
   * Delete profiles (soft delete - set is_active = 0)
   */
  async deleteProfiles(ids: string[]): Promise<void> {
    const pool = await this.getConnection();

    for (const id of ids) {
      await pool.request().input('id', sql.UniqueIdentifier, id).query(`
          UPDATE profiles
          SET is_active = 0
          WHERE id = @id
        `);
    }
  }
}

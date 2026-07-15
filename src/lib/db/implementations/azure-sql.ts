/**
 * Azure SQL Database Implementation
 * Uses native GEOGRAPHY column for optimized spatial queries
 */

import sql from 'mssql';
import { getPool } from '../clients/azure-sql';
import type { IDatabase, ProfileSearchParams, PaginatedProfiles, StateInfo, OfficeInfo, Profile, LocationSuggestion, AnalyticsEvent, CreateInterTalentRequestInput, CreateInterTalentRequestEventInput, CreateInterTalentRequestResult, UpdateInterTalentRequestRoutingInput } from '../interface';
import type { Ad } from '@/types/ad';
import { getZipLocation, getCityLocation, getAddressLocation } from '../../geospatial';

const ADS_TABLE =
  process.env.AZURE_SQL_ADS_TABLE || 'dbo.Ads';
// Table names configurable via environment variables
const PROFILE_TABLE = process.env.AZURE_SQL_PROFILE_TABLE || 'RayTestShowcase';
const LOCATION_EMAIL_TABLE =
  process.env.AZURE_SQL_LOCATION_EMAIL_TABLE || 'location_emails';

// Check if table has GeoLocation column
let hasGeoLocationColumn: boolean | null = null;

export class AzureSqlDatabase implements IDatabase {
  private pool: sql.ConnectionPool | null = null;

  private async getConnection(): Promise<sql.ConnectionPool> {
    if (!this.pool) {
      this.pool = await getPool();
    }
    return this.pool;
  }

  /**
   * Check if the table has a GeoLocation column with data
   * Cached after first check for performance
   */
  private async checkGeoLocationSupport(): Promise<boolean> {
    if (hasGeoLocationColumn !== null) {
      return hasGeoLocationColumn;
    }

    try {
      const pool = await this.getConnection();

      // Check if column exists
      const columnCheck = await pool.request().query(`
        SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${PROFILE_TABLE}' AND COLUMN_NAME = 'GeoLocation'
      `);

      if (columnCheck.recordset[0].cnt === 0) {
        console.log(`Table ${PROFILE_TABLE} does not have GeoLocation column`);
        hasGeoLocationColumn = false;
        return false;
      }

      // Check if there's data
      const dataCheck = await pool.request().query(`
        SELECT COUNT(*) as cnt FROM ${PROFILE_TABLE} WHERE GeoLocation IS NOT NULL
      `);

      const count = dataCheck.recordset[0].cnt;
      hasGeoLocationColumn = count > 0;
      console.log(
        `Table ${PROFILE_TABLE} has ${count} records with GeoLocation - spatial queries ${hasGeoLocationColumn ? 'ENABLED' : 'DISABLED'}`
      );

      return hasGeoLocationColumn;
    } catch (error) {
      console.error('Error checking GeoLocation support:', error);
      hasGeoLocationColumn = false;
      return false;
    }
  }

  private parseName(fullName: string | null): {
    first_name: string;
    last_initial: string;
  } {
    if (!fullName || fullName.trim() === '') {
      return { first_name: '', last_initial: '' };
    }
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { first_name: parts[0], last_initial: '' };
    }
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    return {
      first_name: firstName,
      last_initial: lastName.charAt(0).toUpperCase(),
    };
  }

  private rowToProfile(
    row: Record<string, unknown>,
    distanceMiles?: number
  ): Profile {
    const { first_name, last_initial } = this.parseName(row.Name as string);

    // Handle OnAssignment: bit (true/false/1/0) or varchar ("Yes"/"No")
    const onAssignment =
      row.OnAssignment === true ||
      row.OnAssignment === 1 ||
      row.OnAssignment === 'Yes' ||
      row.OnAssignment === 'yes';

    // adjusted to show statuses other than Active explicitly 1/2/2026 MS
    const ACTIVE_STATUSES = [
      'Active',
      'Idle',
      'InProgress',
      'Rehire',
      'ReOnboard',
    ];

    const isActive = ACTIVE_STATUSES.includes(row.Status as string);

    // Handle both PersonID and PersonId (case variations between tables)
    const personId = row.PersonID || row.PersonId || row.personId || '';

    // Handle ZipCode: varchar(10) or bigint
    const zipCode = row.ZipCode ? String(row.ZipCode) : '';

    // Handle HireDate: datetime or varchar
    let createdAt: string;
    if (row.HireDate) {
      try {
        const hireDate =
          row.HireDate instanceof Date
            ? row.HireDate
            : new Date(row.HireDate as string);
        createdAt = hireDate.toISOString();
      } catch {
        createdAt = new Date().toISOString();
      }
    } else {
      createdAt = new Date().toISOString();
    }
    const cleanSummary =
      typeof row.ProfessionalSummary === 'string'
        ? row.ProfessionalSummary
            .replace(/^\s*"+/, '')   // remove leading quotes
            .replace(/"+\s*$/, '')   // remove trailing quotes
            .trim()
        : '';

    const profile: Profile = {
      id: String(personId),
      first_name,
      last_initial,
      city: (row.City as string) || '',
      state: (row.State as string) || '',
      zip_code: zipCode,
      professional_summary: cleanSummary,
      office: (row.Office as string) || '',
      profession_type: (row.ProfessionType as string) || '',
      skills: row.Skill ? [row.Skill as string] : null,
      source_file: null,
      is_active: isActive,
      created_at: createdAt,
      updated_at: row.RunTime
        ? new Date(row.RunTime as string).toISOString()
        : new Date().toISOString(),
    };

    // Add distance if available (for radius searches)
    if (distanceMiles !== undefined) {
      (profile as Profile & { distance_miles?: number }).distance_miles =
        Math.round(distanceMiles * 100) / 100;
    }

    return profile;
  }

    // on page open shows active available candidates with professional summaries 12/15/2025 MS 
    // edited from only active to active, idle, inactive, inProgress, Rehire, and Reonboard 1/2/2026 MS
  private getActiveCondition(): string {
    return `
      ProfessionalSummary IS NOT NULL
      AND LTRIM(RTRIM(ProfessionalSummary)) <> ''
      AND Status IN (
        'Active',
        'Idle',
        'Inactive',
        'InProgress',
        'Rehire',
        'ReOnboard'
      )
      AND OnAssignment = 0
    `;
  }

  async getAllProfiles(
    page: number = 1,
    limit: number = 20,
    sortBy: 'name' | 'location' | 'profession' = 'name',
    sortDirection: 'asc' | 'desc' = 'asc'
  ): Promise<PaginatedProfiles> {
    const pool = await this.getConnection();
    const offset = (page - 1) * limit;

    let sortColumn: string;
    switch (sortBy) {
      case 'name':
        sortColumn = 'Name';
        break;
      case 'location':
        sortColumn = 'City';
        break;
      case 'profession':
        sortColumn = 'ProfessionType';
        break;
      default:
        sortColumn = 'Name';
    }

    const sortDir = sortDirection.toUpperCase();
    const activeCondition = this.getActiveCondition();

    const countResult = await pool
      .request()
      .query(
        `SELECT COUNT(*) as total FROM ${PROFILE_TABLE} WHERE ${activeCondition}`
      );
    const total = countResult.recordset[0].total;

    const dataResult = await pool
      .request()
      .input('offset', sql.Int, offset)
      .input('limit', sql.Int, limit)
      .query(
        `SELECT * FROM ${PROFILE_TABLE} WHERE ${activeCondition} ORDER BY ${sortColumn} ${sortDir} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
      );

    const profiles = dataResult.recordset.map((row: Record<string, unknown>) =>
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

  async getProfileById(id: string): Promise<Profile | null> {
    const pool = await this.getConnection();
    const activeCondition = this.getActiveCondition();

    const result = await pool
      .request()
      .input('id', sql.BigInt, parseInt(id, 10))
      .query(
        `SELECT * FROM ${PROFILE_TABLE} WHERE PersonID = @id AND ${activeCondition}`
      );

    if (result.recordset.length === 0) return null;
    return this.rowToProfile(result.recordset[0]);
  }

  /**
   * Perform spatial radius search using Azure SQL GEOGRAPHY
   * Returns profiles within radius, sorted by distance
   */
  private async spatialRadiusSearch(
    centerLat: number,
    centerLng: number,
    radiusMiles: number,
    additionalConditions: string[],
    page: number,
    limit: number,
    sortBy: string,
    sortDirection: string
  ): Promise<PaginatedProfiles> {
    const pool = await this.getConnection();
    const offset = (page - 1) * limit;
    const radiusMeters = radiusMiles * 1609.344;

    // Build WHERE clause
    const activeCondition = this.getActiveCondition();
    const spatialCondition =
      'GeoLocation IS NOT NULL AND GeoLocation.STDistance(@center) <= @radiusMeters';
    const allConditions = [
      activeCondition,
      spatialCondition,
      ...additionalConditions,
    ];
    const whereClause = allConditions.join(' AND ');

    // Count total matches
    const countRequest = pool.request();
    countRequest.input('centerLat', sql.Float, centerLat);
    countRequest.input('centerLng', sql.Float, centerLng);
    countRequest.input('radiusMeters', sql.Float, radiusMeters);

    const countResult = await countRequest.query(`
      DECLARE @center GEOGRAPHY = geography::Point(@centerLat, @centerLng, 4326);
      SELECT COUNT(*) as total FROM ${PROFILE_TABLE} WHERE ${whereClause}
    `);
    const total = countResult.recordset[0].total;

    if (total === 0) {
      return { profiles: [], total: 0, page, limit, totalPages: 0 };
    }

    // For radius searches, sort by distance first (nearest), then by requested field
    let orderClause: string;
    let sortColumn: string;
    switch (sortBy) {
      case 'name':
        sortColumn = 'Name';
        break;
      case 'location':
        sortColumn = 'City';
        break;
      case 'profession':
        sortColumn = 'ProfessionType';
        break;
      case 'distance':
        sortColumn = 'distance_miles';
        break;
      default:
        sortColumn = 'Name';
    }

    if (sortBy === 'distance') {
      orderClause = `GeoLocation.STDistance(@center) ${sortDirection.toUpperCase()}`;
    } else {
      // Sort by distance first (nearest), then by requested field
      orderClause = `GeoLocation.STDistance(@center) ASC, ${sortColumn} ${sortDirection.toUpperCase()}`;
    }

    // Get data with distance
    const dataRequest = pool.request();
    dataRequest.input('centerLat', sql.Float, centerLat);
    dataRequest.input('centerLng', sql.Float, centerLng);
    dataRequest.input('radiusMeters', sql.Float, radiusMeters);
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('limit', sql.Int, limit);

    const dataResult = await dataRequest.query(`
      DECLARE @center GEOGRAPHY = geography::Point(@centerLat, @centerLng, 4326);
      
      SELECT *, GeoLocation.STDistance(@center) / 1609.344 as distance_miles
      FROM ${PROFILE_TABLE}
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    const profiles = dataResult.recordset.map((row: Record<string, unknown>) =>
      this.rowToProfile(row, row.distance_miles as number)
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
   * Perform spatial radius search with MULTIPLE center points
   * Returns profiles within radius of ANY center, with distance to nearest center
   * Uses UNION approach for efficient multi-center queries
   */
  private async multiCenterSpatialRadiusSearch(
    centers: Array<{ lat: number; lng: number; zipCode: string }>,
    radiusMiles: number,
    additionalConditions: string[],
    page: number,
    limit: number,
    sortBy: string,
    sortDirection: string
  ): Promise<PaginatedProfiles> {
    const pool = await this.getConnection();
    const offset = (page - 1) * limit;
    const radiusMeters = radiusMiles * 1609.344;

    // Build WHERE clause for additional conditions
    const activeCondition = this.getActiveCondition();
    const conditionsForWhere = [activeCondition, ...additionalConditions]
      .filter((c) => c)
      .join(' AND ');

    // Build UNION query for all centers
    // Each center contributes profiles within its radius, with calculated distance
    const centerQueries = centers
      .map(
        (center) => `
      SELECT 
        PersonID, Name, City, State, ZipCode, ProfessionalSummary, 
        Office, ProfessionType, Skill, OnAssignment, Status, HireDate, RunTime,
        GeoLocation.STDistance(geography::Point(${center.lat}, ${center.lng}, 4326)) / 1609.344 as distance_miles,
        '${center.zipCode}' as nearest_center
      FROM ${PROFILE_TABLE}
      WHERE GeoLocation IS NOT NULL 
        AND GeoLocation.STDistance(geography::Point(${center.lat}, ${center.lng}, 4326)) <= ${radiusMeters}
        AND ${conditionsForWhere}
    `
      )
      .join(' UNION ALL ');

    // Wrap in CTE to deduplicate (keep only nearest distance per profile)
    const dedupeQuery = `
      WITH AllMatches AS (
        ${centerQueries}
      ),
      RankedMatches AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY PersonID ORDER BY distance_miles ASC) as rn
        FROM AllMatches
      )
      SELECT * FROM RankedMatches WHERE rn = 1
    `;

    console.log(
      `Multi-center radius search: ${centers.length} centers, ${radiusMiles} miles`
    );
    centers.forEach((c) =>
      console.log(`  - ${c.zipCode}: (${c.lat}, ${c.lng})`)
    );

    // Count total unique matches using a proper count query
    const countQuery = `
      WITH AllMatches AS (
        ${centerQueries}
      ),
      RankedMatches AS (
        SELECT PersonID, ROW_NUMBER() OVER (PARTITION BY PersonID ORDER BY distance_miles ASC) as rn
        FROM AllMatches
      )
      SELECT COUNT(*) as total FROM RankedMatches WHERE rn = 1
    `;
    const countResult = await pool.request().query(countQuery);
    const total = countResult.recordset[0]?.total || 0;

    if (total === 0) {
      return { profiles: [], total: 0, page, limit, totalPages: 0 };
    }

    // Determine sort order
    let sortColumn: string;
    switch (sortBy) {
      case 'name':
        sortColumn = 'Name';
        break;
      case 'location':
        sortColumn = 'City';
        break;
      case 'profession':
        sortColumn = 'ProfessionType';
        break;
      case 'distance':
        sortColumn = 'distance_miles';
        break;
      default:
        sortColumn = 'Name';
    }

    const orderClause =
      sortBy === 'distance'
        ? `distance_miles ${sortDirection.toUpperCase()}`
        : `distance_miles ASC, ${sortColumn} ${sortDirection.toUpperCase()}`;

    // Get paginated results
    const dataResult = await pool.request().query(`
      ${dedupeQuery}
      ORDER BY ${orderClause}
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `);

    const profiles = dataResult.recordset.map((row: Record<string, unknown>) =>
      this.rowToProfile(row, row.distance_miles as number)
    );

    console.log(
      `Multi-center search found ${total} unique profiles (showing ${profiles.length})`
    );

    return {
      profiles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

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
      address,
      office,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortDirection = 'asc',
    } = params;

    const effectiveRadius =
      radius && radius > 0
        ? radius
        : address
          ? 15
          : undefined;

    const activeCondition = this.getActiveCondition();
    const conditions: string[] = [activeCondition];
    const request = pool.request();

    // Build keyword search conditions
    const keywordsToSearch =
      keywords && keywords.length > 0 ? keywords : query ? [query] : [];

    if (keywordsToSearch.length > 0) {
      const keywordConditions = keywordsToSearch
        .map((kw, index) => {
          const paramName = `keyword${index}`;
          request.input(paramName, sql.NVarChar(sql.MAX), `%${kw.trim()}%`);
          return `(ProfessionalSummary LIKE @${paramName} OR Name LIKE @${paramName} OR City LIKE @${paramName} OR Skill LIKE @${paramName})`;
        })
        .join(' AND ');
      conditions.push(`(${keywordConditions})`);
    }

    // Build profession type conditions
    if (professionTypes && professionTypes.length > 0) {
      const professionConditions = professionTypes
        .map((prof, index) => {
          const paramName = `profession${index}`;
          request.input(paramName, sql.NVarChar(100), prof);
          return `ProfessionType LIKE @${paramName}`;
        })
        .join(' OR ');
      conditions.push(`(${professionConditions})`);
    }

    // Handle office filter
    if (office) {
      request.input('office', sql.NVarChar(100), office);
      conditions.push('Office = @office');
    }

    console.log(
      `Using effective radius: ${effectiveRadius} miles`
    );


    console.log({
      address,
      city,
      state,
      zipCode,
      zipCodes,
      radius,
      effectiveRadius,
    });
    // ═══════════════════════════════════════════════════════════════
    // RADIUS SEARCH - Uses Azure SQL GEOGRAPHY for fast spatial queries
    // ═══════════════════════════════════════════════════════════════
    if (effectiveRadius) {
      const hasGeoSupport = await this.checkGeoLocationSupport();

      // Collect center zip codes
      const centerZipCodes = Array.from(
        new Set([
          ...(zipCode ? [zipCode] : []),
          ...(zipCodes && zipCodes.length > 0 ? zipCodes : []),
        ])
      );

      // Geocode ALL zip codes to get center points
      const centers: Array<{ lat: number; lng: number; zipCode: string }> = [];

      console.log('ADDRESS PARAM RECEIVED:', address);

      // Address-based search center added on 5/28/26 by MS for address searching 
      if (address) {
        
        const location = await getAddressLocation(address);

        if (location) {
          centers.push({
            lat: location.lat,
            lng: location.lng,
            zipCode: address,
          });

          console.log(
            `Address geocoded successfully: (${location.lat}, ${location.lng})`
          );
        } else {
          console.log('Address geocode failed. Trying city lookup...');

          const cityLocation = await getCityLocation(address, state);

          if (cityLocation) {
            centers.push({
              lat: cityLocation.lat,
              lng: cityLocation.lng,
              zipCode: address,
            });

            console.log(
              `City geocoded successfully: (${cityLocation.lat}, ${cityLocation.lng})`
            );
          } else {
            console.warn(`Could not geocode address or city: ${address}`);
          }
        }
      }

      if (!address && centerZipCodes.length > 0) {
        console.log(
          `Geocoding ${centerZipCodes.length} zip code(s) for radius search...`
        );

        // Geocode all zip codes in parallel for efficiency
        const geocodePromises = centerZipCodes.map(async (zip) => {
          const location = await getZipLocation(zip);
          if (location) {
            return { lat: location.lat, lng: location.lng, zipCode: zip };
          }
          console.warn(`Could not geocode zip code: ${zip}`);
          return null;
        });

        const results = await Promise.all(geocodePromises);
        results.forEach((r) => {
          if (r) centers.push(r);
        });

        console.log(
          `Successfully geocoded ${centers.length}/${centerZipCodes.length} zip codes`
        );
      } else if (!address && city) {
        // Fallback to city if no zip codes provided
        const centerLocation = await getCityLocation(city, state);
        if (centerLocation) {
          centers.push({
            lat: centerLocation.lat,
            lng: centerLocation.lng,
            zipCode: `${city}, ${state}`,
          });
          console.log(`Radius search: ${radius} miles from ${city}, ${state}`);
        }
      }

      // If we have center(s) and GeoLocation support, use spatial query
      if (centers.length > 0 && hasGeoSupport) {
        console.log(
          `Using Azure SQL spatial query with ${centers.length} center point(s)`
        );

        // Build additional conditions (excluding active which is already handled)
        const spatialConditions: string[] = [];

        // Add keyword conditions for spatial search
        if (keywordsToSearch.length > 0) {
          const keywordConditions = keywordsToSearch
            .map((kw) => {
              return `(ProfessionalSummary LIKE '%${kw.trim().replace(/'/g, "''")}%' OR Name LIKE '%${kw.trim().replace(/'/g, "''")}%' OR City LIKE '%${kw.trim().replace(/'/g, "''")}%' OR Skill LIKE '%${kw.trim().replace(/'/g, "''")}%')`;
            })
            .join(' AND ');
          spatialConditions.push(`(${keywordConditions})`);
        }

        // Add profession conditions for spatial search
        if (professionTypes && professionTypes.length > 0) {
          const professionConditions = professionTypes
            .map((prof) => `ProfessionType LIKE '${prof.replace(/'/g, "''")}'`)
            .join(' OR ');
          spatialConditions.push(`(${professionConditions})`);
        }

        // Add office condition for spatial search
        if (office) {
          spatialConditions.push(`Office = '${office.replace(/'/g, "''")}'`);
        }

        // Use multi-center search if multiple zip codes, otherwise single center (optimized)
        if (centers.length > 1) {
          return this.multiCenterSpatialRadiusSearch(
            centers,
            effectiveRadius,
            spatialConditions,
            page,
            limit,
            sortBy,
            sortDirection
          );
        } else {
          // Single center - use original optimized method
          return this.spatialRadiusSearch(
            centers[0].lat,
            centers[0].lng,
            effectiveRadius,
            spatialConditions,
            page,
            limit,
            sortBy,
            sortDirection
          );
        }
      } else {
        // Fallback: Filter by state if radius search not possible
        console.log('GeoLocation not available, falling back to state filter');
        if (state) {
          request.input('fallbackState', sql.NVarChar(2), state.toUpperCase());
          conditions.push('State = @fallbackState');
        }
      }
    } else {
      // Non-radius search: apply location filters directly
      if (zipCodes && zipCodes.length > 0) {
        const zipPlaceholders = zipCodes
          .map((z, index) => {
            request.input(`zip${index}`, sql.NVarChar(10), z);
            return `@zip${index}`;
          })
          .join(', ');
        conditions.push(`ZipCode IN (${zipPlaceholders})`);
      } else if (zipCode) {
        request.input('zipCode', sql.NVarChar(10), zipCode);
        conditions.push('ZipCode = @zipCode');
      }

      if (city) {
        request.input('city', sql.NVarChar(100), `%${city}%`);
        conditions.push('City LIKE @city');
      }

      if (state) {
        request.input('state', sql.NVarChar(2), state.toUpperCase());
        conditions.push('State = @state');
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // Standard query (non-spatial)
    // ═══════════════════════════════════════════════════════════════
    const offset = (page - 1) * limit;
    const whereClause = conditions.join(' AND ');

    let sortColumn: string;
    switch (sortBy) {
      case 'name':
        sortColumn = 'Name';
        break;
      case 'location':
        sortColumn = 'City';
        break;
      case 'profession':
        sortColumn = 'ProfessionType';
        break;
      default:
        sortColumn = 'Name';
    }

    const sortDir = sortDirection.toUpperCase();

    const countResult = await request.query(
      `SELECT COUNT(*) as total FROM ${PROFILE_TABLE} WHERE ${whereClause}`
    );
    const total = countResult.recordset[0].total;

    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);

    const dataResult = await request.query(
      `SELECT * FROM ${PROFILE_TABLE} WHERE ${whereClause} ORDER BY ${sortColumn} ${sortDir} OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`
    );

    const profiles = dataResult.recordset.map((row: Record<string, unknown>) =>
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

  async getProfessionTypes(): Promise<string[]> {
    const pool = await this.getConnection();
    const result = await pool
      .request()
      .query(
        `SELECT DISTINCT ProfessionType FROM ${PROFILE_TABLE} WHERE ${this.getActiveCondition()} AND ProfessionType IS NOT NULL AND ProfessionType != '' ORDER BY ProfessionType`
      );
    return result.recordset.map(
      (row: Record<string, unknown>) => row.ProfessionType as string
    );
  }

  async getStates(): Promise<StateInfo[]> {
    const pool = await this.getConnection();
    const result = await pool
      .request()
      .query(
        `SELECT DISTINCT State as code, State as name FROM ${PROFILE_TABLE} WHERE ${this.getActiveCondition()} AND State IS NOT NULL AND State != '' ORDER BY State`
      );
    return result.recordset.map((row: Record<string, unknown>) => ({
      code: row.code as string,
      name: row.name as string,
    }));
  }

  async getOffices(): Promise<OfficeInfo[]> {
    const pool = await this.getConnection();
    const result = await pool
      .request()
      .query(
        `SELECT DISTINCT Office as name, City as city, State as state FROM ${PROFILE_TABLE} WHERE ${this.getActiveCondition()} AND Office IS NOT NULL AND Office != '' ORDER BY Office`
      );
    return result.recordset.map((row: Record<string, unknown>) => ({
      name: row.name as string,
      city: row.city as string,
      state: row.state as string,
    }));
  }

  async getOfficeRoutingData() {
    const pool = await this.getConnection();

    const result = await pool.request().query(`
      SELECT
        Id,
        OfficeName,
        Division,
        Region,
        NotificationEmails,
        ZipCode,
        Latitude,
        Longitude,
        RadiusMiles,
        IsActive
      FROM Offices
      WHERE IsActive = 1
    `);

    return result.recordset;
  }

  async getCachedLocationSuggestions(
    query: string
  ): Promise<LocationSuggestion[]> {
    const pool = await this.getConnection();

    const searchTerm = `%${query}%`;

    const result = await pool
      .request()
      .input('query', sql.NVarChar(100), searchTerm)
      .query(`
        SELECT TOP 10
          label,
          value,
          type
        FROM LocationSuggestionCache
        WHERE query LIKE @query
          OR label LIKE @query
        ORDER BY created_at DESC
      `);

    return result.recordset.map(
      (row: Record<string, unknown>) => ({
        label: String(row.label),
        value: String(row.value),
        type: row.type as
          | 'address'
          | 'city'
          | 'state'
          | 'zipcode',
      })
    );
  };
  

  async saveLocationSuggestions(
    query: string,
    suggestions: LocationSuggestion[]
  ): Promise<void> { 
    const pool = await this.getConnection();

    for (const suggestion of suggestions) {
      await pool
        .request()
        .input('query', sql.NVarChar(100), query)
        .input('label', sql.NVarChar(500), suggestion.label)
        .input('value', sql.NVarChar(500), suggestion.value)
        .input('type', sql.NVarChar(50), suggestion.type)
        .query(`
          INSERT INTO LocationSuggestionCache
          (
            query,
            label,
            value,
            type
          )
          VALUES
          (
            @query,
            @label,
            @value,
            @type
          )
        `);
    }
  }

  async createInterTalentRequest(
      data: CreateInterTalentRequestInput
  ): Promise<CreateInterTalentRequestResult> {

      const pool = await this.getConnection();

      const result = await pool.request()

          .input("portalSource", sql.NVarChar(200), data.portalSource)

          .input("strategicClientName", sql.NVarChar(200), data.strategicClientName ?? null)

          .input("customerName", sql.NVarChar(200), data.customerName)

          .input("customerEmail", sql.NVarChar(254), data.customerEmail)

          .input("customerPhone", sql.NVarChar(200), data.customerPhone ?? null)

          .input("company", sql.NVarChar(200), data.company ?? null)

          .input("property", sql.NVarChar(200), data.property ?? null)

          .input("location", sql.NVarChar(200), data.location ?? null)

          .input("zipCode", sql.NVarChar(10), data.zipCode ?? null)

          .input("associateId", sql.BigInt,
              data.associateId ? Number(data.associateId) : null
          )

          .input("associateName", sql.NVarChar(200), data.associateName ?? null)

          .input("jobType", sql.NVarChar(200), data.jobType ?? null)

          .input("shiftDetails", sql.NVarChar(sql.MAX), data.shiftDetails ?? null)

          .input("startDate", sql.Date, data.startDate ?? null)

          .input("notes", sql.NVarChar(sql.MAX), data.notes ?? null)

          .input("assignedOffice", sql.NVarChar(200), data.assignedOffice ?? null)

          .input("distributionList", sql.NVarChar(254), data.distributionList ?? null)

          .query(`
            INSERT INTO dbo.InterTalentRequests
            (
                PortalSource,
                StrategicClientName,

                CustomerName,
                CustomerEmail,
                CustomerPhone,

                Company,
                Property,
                Location,
                ZipCode,

                AssociateID,
                AssociateName,

                JobType,
                ShiftDetails,
                StartDate,
                Notes,

                AssignedOffice,
                DistributionList

            )

            OUTPUT
                INSERTED.RequestID,
                INSERTED.Status

            VALUES
            (
                @portalSource,
                @strategicClientName,

                @customerName,
                @customerEmail,
                @customerPhone,

                @company,
                @property,
                @location,
                @zipCode,

                @associateId,
                @associateName,

                @jobType,
                @shiftDetails,
                @startDate,
                @notes,

                @assignedOffice,
                @distributionList
            )
          `);

      return {
          requestId: result.recordset[0].RequestID,
          status: result.recordset[0].Status
      };
  }

  async createRequestEvent(
      data: CreateInterTalentRequestEventInput
  ): Promise<void> {

      const pool = await this.getConnection();

      await pool.request()

          .input("requestId", sql.UniqueIdentifier, data.requestId)

          .input("eventType", sql.NVarChar(200), data.eventType)

          .input("performedByName",
              sql.NVarChar(200),
              data.performedByName ?? null)

          .input("performedByEmail",
              sql.NVarChar(254),
              data.performedByEmail ?? null)

          .input("notes",
              sql.NVarChar(sql.MAX),
              data.notes ?? null)

          .input(
              "metadata",
              sql.NVarChar(sql.MAX),
              data.metadata
                  ? JSON.stringify(data.metadata)
                  : null
          )

          .query(`
            INSERT INTO dbo.InterTalentRequestEvents
            (
                RequestID,
                EventType,
                PerformedByName,
                PerformedByEmail,
                Notes,
                Metadata
            )
            VALUES
            (
                @requestId,
                @eventType,
                @performedByName,
                @performedByEmail,
                @notes,
                @metadata
            )
          `);
  }

  async updateInterTalentRequestRouting(
      data: UpdateInterTalentRequestRoutingInput
  ): Promise<void> {

      const pool = await this.getConnection();

      await pool.request()

          .input("requestId", sql.UniqueIdentifier, data.requestId)
          .input("assignedOffice", sql.NVarChar(200), data.assignedOffice)
          .input("market", sql.NVarChar(200), data.market ?? null)
          .input("region", sql.NVarChar(200), data.region ?? null)
          .input("distributionList", sql.NVarChar(254), data.distributionList ?? null)

          .input("officeIsOpen", sql.Bit, data.officeIsOpen)
          .input(
              "nextOfficeOpenDateTime",
              sql.DateTime2,
              data.nextOfficeOpenDateTime ?? null
          )

          .input(
              "status",
              sql.NVarChar(200),
              data.status ?? "Notified"
          )

          .query(`
              UPDATE dbo.InterTalentRequests
              SET

                  AssignedOffice = @assignedOffice,
                  Market = @market,
                  Region = @region,
                  DistributionList = @distributionList,

                  OfficeIsOpenAtSubmission = @officeIsOpen,
                  NextOfficeOpenDateTime = @nextOfficeOpenDateTime,

                  Status = @status,

                  UpdatedAt = SYSUTCDATETIME()

              WHERE RequestID = @requestId
          `);
  }

  async createStaffingRequest(data: {
    officeId: number;
    officeName: string;
    officeEmail: string;

    managementCompany?: string;
    propertyName?: string;
    streetAddress?: string;
    city?: string;
    state?: string;

    positionType?: string;
    positionTitle?: string;
    duties?: string;
    startDate?: string;
    schedule?: string;

    contactTitle?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;

    contactMethod?: string;
    bestTimeToRespond?: string;
  }): Promise<void> {
    const pool = await this.getConnection();

    await pool.request()
      .input('officeId', sql.Int, data.officeId)
      .input('officeName', sql.NVarChar(100), data.officeName)
      .input('officeEmail', sql.NVarChar(255), data.officeEmail)

      .input('managementCompany', sql.NVarChar(255), data.managementCompany ?? null)
      .input('propertyName', sql.NVarChar(255), data.propertyName ?? null)
      .input('streetAddress', sql.NVarChar(255), data.streetAddress ?? null)
      .input('city', sql.NVarChar(100), data.city ?? null)
      .input('state', sql.NVarChar(10), data.state ?? null)

      .input('positionType', sql.NVarChar(100), data.positionType ?? null)
      .input('positionTitle', sql.NVarChar(255), data.positionTitle ?? null)
      .input('duties', sql.NVarChar(sql.MAX), data.duties ?? null)
      .input('startDate', sql.Date, data.startDate || null)
      .input('schedule', sql.NVarChar(sql.MAX), data.schedule ?? null)

      .input('contactTitle', sql.NVarChar(200), data.contactTitle ?? null)
      .input('firstName', sql.NVarChar(100), data.firstName ?? null)
      .input('lastName', sql.NVarChar(100), data.lastName ?? null)
      .input('phone', sql.NVarChar(50), data.phone ?? null)
      .input('email', sql.NVarChar(255), data.email ?? null)

      .input('contactMethod', sql.NVarChar(20), data.contactMethod ?? null)
      .input('bestTimeToRespond', sql.NVarChar(100), data.bestTimeToRespond ?? null)

      .query(`
        INSERT INTO StaffingRequests (
          SubmittedAt,
          OfficeId,
          OfficeName,
          OfficeEmail,
          ManagementCompany,
          PropertyName,
          StreetAddress,
          City,
          State,
          PositionType,
          PositionTitle,
          Duties,
          StartDate,
          Schedule,
          FirstName,
          LastName,
          Phone,
          Email,
          ContactMethod,
          BestTimeToRespond,
          ContactTitle
        )
        VALUES (
          GETDATE(),
          @officeId,
          @officeName,
          @officeEmail,
          @managementCompany,
          @propertyName,
          @streetAddress,
          @city,
          @state,
          @positionType,
          @positionTitle,
          @duties,
          @startDate,
          @schedule,
          @firstName,
          @lastName,
          @phone,
          @email,
          @contactMethod,
          @bestTimeToRespond,
          @contactTitle
        )
      `);
  }

  async getClients(): Promise<string[]> {
    const pool = await this.getConnection();

    const result = await pool.request().query(`
      SELECT slug
      FROM clients
      ORDER BY slug
    `);

    return result.recordset.map(
      (row: Record<string, unknown>) =>
        row.slug as string
    );
  }

  async getAds(): Promise<Ad[]> {
    const pool = await this.getConnection();

    const result = await pool.request().query(`
      SELECT
        Id,
        Title,
        ImageData,
        ImageMimeType,
        DestinationUrl,
        IsActive,
        DisplayOrder,
        TargetAccounts
      FROM ${ADS_TABLE}
      ORDER BY DisplayOrder ASC
    `);

    return result.recordset.map((row) => {
      const imageUrl =
        row.ImageData && row.ImageMimeType
          ? `data:${row.ImageMimeType};base64,${Buffer.from(row.ImageData).toString('base64')}`
          : '';

      return {
        id: row.Id,
        title: row.Title,
        imageUrl,
        destinationUrl: row.DestinationUrl,
        isActive: row.IsActive,
        displayOrder: row.DisplayOrder,
        targetAccounts: row.TargetAccounts
          ? JSON.parse(row.TargetAccounts)
          : [],
      };
    });
  }

  async insertAnalyticsEvent(
    event: AnalyticsEvent
  ): Promise<void> {
    const pool = await this.getConnection();

    await pool
      .request()
      .input(
        'eventType',
        sql.NVarChar(100),
        event.eventType
      )
      .input(
        'page',
        sql.NVarChar(100),
        event.page
      )
      .input(
        'component',
        sql.NVarChar(100),
        event.component
      )
      .input(
        'value',
        sql.NVarChar(500),
        event.value ?? null
      )
      .input(
        'metadata',
        sql.NVarChar(sql.MAX),
        event.metadata
          ? JSON.stringify(event.metadata)
          : null
      )
      .query(`
        INSERT INTO AnalyticsEvents
        (
          EventType,
          Page,
          Component,
          Value,
          Metadata,
          CreatedAt
        )
        VALUES
        (
          @eventType,
          @page,
          @component,
          @value,
          @metadata,
          GETUTCDATE()
        )
      `);
  }

  async createAd(data: {
    title: string;
    imageData: number[];
    imageMimeType: string;
    destinationUrl: string;
    displayOrder: number;
    isActive: boolean;
    targetAccounts: string[];
  }): Promise<void> {

    const pool = await this.getConnection();

    const buffer = Buffer.from(data.imageData);

    await pool
      .request()
      .input('title', sql.NVarChar(200), data.title)
      .input('imageData', sql.VarBinary(sql.MAX), buffer)
      .input('imageMimeType', sql.NVarChar(50), data.imageMimeType)
      .input('destinationUrl', sql.NVarChar(500), data.destinationUrl)
      .input('displayOrder', sql.Int, data.displayOrder)
      .input('isActive', sql.Bit, data.isActive)
      .input(
        'targetAccounts',
        sql.NVarChar(sql.MAX),
        JSON.stringify(data.targetAccounts)
      )
      .query(`
        INSERT INTO ${ADS_TABLE}
        (
          Title,
          ImageData,
          ImageMimeType,
          DestinationUrl,
          DisplayOrder,
          IsActive,
          TargetAccounts
        )
        VALUES
        (
          @title,
          @imageData,
          @imageMimeType,
          @destinationUrl,
          @displayOrder,
          @isActive,
          @targetAccounts
        )
      `);
  }

  async deleteAd(id: number): Promise<void> {
    const pool = await this.getConnection();

    await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        DELETE FROM ${ADS_TABLE}
        WHERE Id = @id
      `);
  }

  async updateAd(
    id: number,
    data: Partial<{
      title: string;
      imageData: number[];
      imageMimeType: string;
      destinationUrl: string;
      displayOrder: number;
      isActive: boolean;
      targetAccounts: string[];
    }>
  ): Promise<void> {
    const pool = await this.getConnection();

    const request = pool.request().input('id', sql.Int, id);
    const updates: string[] = [];

    if (data.title !== undefined) {
      updates.push('Title = @title');
      request.input('title', sql.NVarChar(200), data.title);
    }

    if (data.destinationUrl !== undefined) {
      updates.push('DestinationUrl = @destinationUrl');
      request.input('destinationUrl', sql.NVarChar(500), data.destinationUrl);
    }

    if (data.displayOrder !== undefined) {
      updates.push('DisplayOrder = @displayOrder');
      request.input('displayOrder', sql.Int, data.displayOrder);
    }

    if (data.isActive !== undefined) {
      updates.push('IsActive = @isActive');
      request.input('isActive', sql.Bit, data.isActive);
    }

    if (data.targetAccounts !== undefined) {
      updates.push('TargetAccounts = @targetAccounts');
      request.input(
        'targetAccounts',
        sql.NVarChar(sql.MAX),
        JSON.stringify(data.targetAccounts)
      );
    }

    if (data.imageData !== undefined && data.imageMimeType !== undefined) {
      updates.push('ImageData = @imageData');
      updates.push('ImageMimeType = @imageMimeType');

      request.input(
        'imageData',
        sql.VarBinary(sql.MAX),
        Buffer.from(data.imageData)
      );

      request.input(
        'imageMimeType',
        sql.NVarChar(50),
        data.imageMimeType
      );
    }

    if (updates.length === 0) return;

    await request.query(`
      UPDATE ${ADS_TABLE}
      SET ${updates.join(', ')}
      WHERE Id = @id
    `);
  }

  async getLocationSuggestion(
    query: string
  ): Promise<LocationSuggestion[]> {
    const pool = await this.getConnection();

    const searchTerm = `%${query}%`;

    console.log('Suggestion query:', query);

    const result = await pool
      .request()
      .input('query', sql.NVarChar(100), searchTerm)
      .query(`
        SELECT DISTINCT TOP 10
          Address,
          City,
          State,
          ZipCode
        FROM ${PROFILE_TABLE}
        WHERE Address IS NOT NULL
          AND City IS NOT NULL
          AND State IS NOT NULL
          AND ZipCode IS NOT NULL
          AND LTRIM(RTRIM(City)) <> ''
          AND LTRIM(RTRIM(State)) <> ''
          AND ( Address LIKE @query
            OR City LIKE @query
            OR State LIKE @query
            OR ZipCode LIKE @query
          )
        ORDER BY Address, City, State
      `);

    return result.recordset.map((row: Record<string, unknown>) => {
      const address = String(row.Address ?? '').trim();
      const city = String(row.City ?? '').trim();
      const state = String(row.State ?? '').trim();
      const zipCode = String(row.ZipCode ?? '').trim();

      return {
        label: `${address}, ${city}, ${state} ${zipCode}`,
        value: `${address} ${city} ${state} ${zipCode}`,
        type: 'address' as const,
      };
    });
  }

  async insertProfiles(profiles: Profile[]): Promise<void> {
    const pool = await this.getConnection();
    for (const profile of profiles) {
      const fullName = profile.last_initial
        ? `${profile.first_name} ${profile.last_initial}.`
        : profile.first_name;
      await pool
        .request()
        .input('name', sql.NVarChar(50), fullName)
        .input('city', sql.NVarChar(50), profile.city)
        .input('state', sql.NVarChar(2), profile.state)
        .input('zipCode', sql.VarChar(10), profile.zip_code)
        .input(
          'professionalSummary',
          sql.NVarChar(3000),
          profile.professional_summary
        )
        .input('office', sql.NVarChar(50), profile.office)
        .input('professionType', sql.NVarChar(50), profile.profession_type)
        .input(
          'skill',
          sql.NVarChar(500),
          profile.skills ? profile.skills.join(', ') : null
        )
        .input('status', sql.NVarChar(50), 'Active')
        .input('runDate', sql.Date, new Date())
        .input('runTime', sql.DateTime2, new Date())
        .query(
          `INSERT INTO ${PROFILE_TABLE} (Name, City, State, ZipCode, ProfessionalSummary, Office, ProfessionType, Skill, Status, RunDate, RunTime) VALUES (@name, @city, @state, @zipCode, @professionalSummary, @office, @professionType, @skill, @status, @runDate, @runTime)`
        );
    }
  }

  async updateProfile(id: string, data: Partial<Profile>): Promise<void> {
    const pool = await this.getConnection();
    const request = pool.request().input('id', sql.BigInt, parseInt(id, 10));
    const updates: string[] = [];

    if (data.professional_summary !== undefined) {
      updates.push('ProfessionalSummary = @professionalSummary');
      request.input(
        'professionalSummary',
        sql.NVarChar(3000),
        data.professional_summary
      );
    }
    if (data.office !== undefined) {
      updates.push('Office = @office');
      request.input('office', sql.NVarChar(50), data.office);
    }
    if (data.profession_type !== undefined) {
      updates.push('ProfessionType = @professionType');
      request.input('professionType', sql.NVarChar(50), data.profession_type);
    }
    if (data.zip_code !== undefined) {
      updates.push('ZipCode = @zipCode');
      request.input('zipCode', sql.VarChar(10), data.zip_code);
    }
    if (data.skills !== undefined) {
      updates.push('Skill = @skill');
      request.input(
        'skill',
        sql.NVarChar(500),
        data.skills ? data.skills.join(', ') : null
      );
    }

    updates.push('RunTime = @runTime');
    request.input('runTime', sql.DateTime2, new Date());

    if (updates.length === 0) return;
    await request.query(
      `UPDATE ${PROFILE_TABLE} SET ${updates.join(', ')} WHERE PersonID = @id`
    );
  }

  async deleteProfiles(ids: string[]): Promise<void> {
    const pool = await this.getConnection();
    for (const id of ids) {
      await pool
        .request()
        .input('id', sql.BigInt, parseInt(id, 10))
        .input('runTime', sql.DateTime2, new Date())
        .query(
          `UPDATE ${PROFILE_TABLE} SET Status = 'Inactive', RunTime = @runTime WHERE PersonID = @id`
        );
    }
  }

  async insertTalentRequest(data: {
    name: string;
    email: string;
    phone?: string;
    notes: string;
    location?: string;
    personId?: string;
    associateId?: string;
    associateName?: string;
    startDate?: string;
    startTime?: string;
    endTime?: string;
    requestMode?: string;
    campaign?: string;
    customerName?: string;
    strategicAccount?: string | null;
    propertyName?: string | null;
  }): Promise<void> {
    const pool = await this.getConnection();

    await pool.request()
      .input('name', sql.NVarChar(200), data.name)
      .input('email', sql.NVarChar(255), data.email)
      .input('phone', sql.NVarChar(25), data.phone ?? null)
      .input('notes', sql.NVarChar(sql.MAX), data.notes)
      .input('location', sql.NVarChar(100), data.location ?? null)

      // ✅ FIXED: bigint instead of string
      .input('personId', sql.BigInt, data.personId ? Number(data.personId) : null)

      .input('associateId', sql.NVarChar(50), data.associateId ?? null)
      .input('associateName', sql.NVarChar(100), data.associateName ?? null)

      .input('startDate', sql.Date, data.startDate ?? null)
      .input('startTime', sql.NVarChar(20), data.startTime ?? null)
      .input('endTime', sql.NVarChar(20), data.endTime ?? null)

      .input('requestMode', sql.NVarChar(50), data.requestMode ?? null)
      .input('campaign', sql.NVarChar(100), data.campaign ?? null)

      // ✅ matches DB exactly (nvarchar(200))
      .input('customerName', sql.NVarChar(200), data.customerName ?? null)

      .input('strategicAccount', sql.NVarChar(100), data.strategicAccount ?? null)
      .input('propertyName', sql.NVarChar(200), data.propertyName ?? null)

      .query(`
        INSERT INTO TalentRequests (
          Name,
          Email,
          Phone,
          Notes,
          Location,
          PersonId,
          AssociateId,
          AssociateName,
          StartDate,
          StartTime,
          EndTime,
          RequestMode,
          Campaign,
          CustomerName,
          StrategicAccount,
          propertyName,
          CreatedAt
        )
        VALUES (
          @name,
          @email,
          @phone,
          @notes,
          @location,
          @personId,
          @associateId,
          @associateName,
          @startDate,
          @startTime,
          @endTime,
          @requestMode,
          @campaign,
          @customerName,
          @strategicAccount,
          @propertyName,
          GETDATE()
        )
      `);
  }
  /**
   * Get office email by location
   * For Azure SQL, we use the Office column from the main table to map to emails
   * Falls back to a default email if no specific mapping exists
   *
   * Queries the location_emails table in Azure SQL for office-to-email mappings.
   */
  async getLocationEmail(
    location: string
  ): Promise<{ email: string; isDefault: boolean }> {
    const pool = await this.getConnection();
    const normalizedLocation = location.trim();

    try {
      // Try exact match first (case-insensitive)
      const exactResult = await pool
        .request()
        .input('market', sql.NVarChar, normalizedLocation).query(`
          SELECT email FROM dbo.${LOCATION_EMAIL_TABLE} 
          WHERE LOWER(market) = LOWER(@market)
        `);

      if (exactResult.recordset.length > 0) {
        return {
          email: exactResult.recordset[0].email,
          isDefault: false,
        };
      }

      // Try partial match (location contains market name or vice versa)
      const partialResult = await pool
        .request()
        .input('market', sql.NVarChar, `%${normalizedLocation}%`).query(`
          SELECT TOP 1 email, market FROM dbo.${LOCATION_EMAIL_TABLE} 
          WHERE LOWER(market) LIKE LOWER(@market)
             OR LOWER(@market) LIKE '%' + LOWER(market) + '%'
          ORDER BY LEN(market) DESC
        `);

      if (partialResult.recordset.length > 0) {
        return {
          email: partialResult.recordset[0].email,
          isDefault: false,
        };
      }

      // Fallback to default
      const defaultResult = await pool.request().query(`
        SELECT email FROM dbo.${LOCATION_EMAIL_TABLE} WHERE market = 'Default'
      `);

      return {
        email: defaultResult.recordset[0]?.email || 'info@intersolutions.com',
        isDefault: true,
      };
    } catch (error) {
      console.error('Error fetching location email:', error);
      // Fallback if table doesn't exist or query fails
      return {
        email: 'info@intersolutions.com',
        isDefault: true,
      };
    }
  }
}

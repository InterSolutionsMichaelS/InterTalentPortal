import { getPool, sql } from '@/lib/db/clients/azure-sql';
import type {
  ClientPortalClient,
  ClientPortalContact,
  ClientPortalData,
  ClientPortalProperty,
} from '@/types/client-portal';

interface ClientRow {
  id: number;
  name: string;
  slug: string;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  hero_url: string | null;
}

interface PropertyRow {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}

interface ContactRow {
  id: number;
  name: string;
  title: string | null;
  mobile: string | null;
  email: string | null;
  profile_image: string | null;
}

export async function getClientBySlug(
  slug: string
): Promise<ClientPortalData | null> {
  const normalizedSlug = slug.trim().toLowerCase();

  if (!normalizedSlug) {
    return null;
  }

  try {
    const pool = await getPool();

    const clientResult = await pool
      .request()
      .input('slug', sql.NVarChar(255), normalizedSlug).query<ClientRow>(`
        SELECT
          id,
          name,
          slug,
          primary_color,
          secondary_color,
          logo_url,
          hero_url
        FROM clients
        WHERE slug = @slug
      `);

    if (clientResult.recordset.length === 0) {
      return null;
    }

    const clientRow = clientResult.recordset[0];
    const clientId = clientRow.id;

    const propertiesResult = await pool
      .request()
      .input('clientId', sql.Int, clientId).query<PropertyRow>(`
        SELECT
          id,
          name,
          address,
          city,
          state,
          zip
        FROM properties
        WHERE client_id = @clientId
        ORDER BY name ASC
      `);

    const contactsResult = await pool
      .request()
      .input('clientId', sql.Int, clientId).query<ContactRow>(`
        SELECT
          id,
          name,
          title,
          mobile,
          email,
          profile_image
        FROM contacts
        WHERE client_id = @clientId
        ORDER BY name ASC
      `);

    const client: ClientPortalClient = {
      id: clientRow.id,
      name: clientRow.name,
      slug: clientRow.slug,
      primary_color: clientRow.primary_color,
      secondary_color: clientRow.secondary_color,
      logo_url: clientRow.logo_url,
      hero_url: clientRow.hero_url,
    };

    const properties: ClientPortalProperty[] = propertiesResult.recordset.map(
      (row) => ({
        id: row.id,
        name: row.name,
        address: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip,
      })
    );

    const contacts: ClientPortalContact[] = contactsResult.recordset.map(
      (row) => ({
        id: row.id,
        name: row.name,
        title: row.title,
        mobile: row.mobile,
        email: row.email,
        profile_image: row.profile_image,
      })
    );

    return {
      client,
      properties,
      contacts,
    };
  } catch (error) {
    console.error('Failed to fetch client portal data by slug:', error);
    return null;
  }
}

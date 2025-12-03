/**
 * Geospatial Search Utilities
 * Handles zip code to lat/lng conversion and distance calculations
 */

/**
 * Simple zip code to approximate lat/lng lookup
 * For production, use a proper zip code database or API
 * This uses a basic US zip code approximation
 */
export interface ZipLocation {
  zip: string;
  lat: number;
  lng: number;
  state?: string; // State abbreviation (e.g., "TX", "CA")
}

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Get lat/lng for a zip code, city, or city+state combination
 * Uses free ZipCodeAPI (https://www.zippopotam.us/)
 * Falls back to approximate calculation for zip codes
 */
export async function getZipLocation(
  zipCode: string
): Promise<ZipLocation | null> {
  try {
    // Add timeout for API call - increased to 10s for slower networks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Try ZipCodeAPI first
    const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.places && data.places[0]) {
        const result = {
          zip: zipCode,
          lat: parseFloat(data.places[0].latitude),
          lng: parseFloat(data.places[0].longitude),
          state: data.places[0]['state abbreviation'], // Extract state abbreviation
        };
        console.log(
          `API geocoded ${zipCode}: lat=${result.lat}, lng=${result.lng}, state=${result.state}`
        );
        return result;
      }
    } else {
      console.warn(
        `Zip API returned ${response.status} for ${zipCode}, using fallback`
      );
    }
  } catch (error) {
    // Only log if it's not a timeout - timeouts are expected for invalid zips
    if (error instanceof Error && error.name !== 'AbortError') {
      console.warn('Zip code API failed:', error.message);
    } else {
      console.warn(`Zip API timeout for ${zipCode}, using fallback`);
    }
  }

  // Fallback: approximate based on first 3 digits
  const fallback = getApproximateZipLocation(zipCode);
  if (fallback) {
    console.log(
      `FALLBACK geocoded ${zipCode}: lat=${fallback.lat}, lng=${fallback.lng} (approximate)`
    );
  }
  return fallback;
}

/**
 * Get lat/lng for a city and state combination
 * Uses Nominatim (OpenStreetMap) geocoding API
 */
export async function getCityLocation(
  city: string,
  state?: string
): Promise<ZipLocation | null> {
  try {
    // Build query: "City, State, USA" format
    const query = state ? `${city}, ${state}, USA` : `${city}, USA`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Add featuretype=city to only get cities, not streets or other features
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}` +
        `&format=json` +
        `&limit=5` + // Get more results to filter
        `&addressdetails=1` + // Get full address details
        `&featuretype=settlement`, // Only cities/towns/villages
      {
        headers: {
          'User-Agent': 'InterTalentPortal/1.0', // Required by Nominatim
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log('Geocoding API results:', data);

      if (data && data.length > 0) {
        // Filter results to find a city/town in the correct state
        let bestMatch = null;

        if (state) {
          // Try to find a result that matches the state
          const stateMatch = data.find(
            (result: { address?: { state?: string } }) => {
              const address = result.address;
              // Check if state matches (address.state could be full name or abbreviation)
              return (
                address &&
                (address.state?.toUpperCase() === state.toUpperCase() ||
                  address.state?.substring(0, 2).toUpperCase() ===
                    state.toUpperCase())
              );
            }
          );

          if (stateMatch) {
            bestMatch = stateMatch;
            console.log(`Found city in ${state}:`, bestMatch.display_name);
          } else {
            console.warn(`City '${city}' not found in ${state}`);
            return null; // Don't use a location in the wrong state
          }
        } else {
          bestMatch = data[0]; // No state filter, use first result
        }

        if (bestMatch) {
          return {
            zip: `${city}, ${state || 'USA'}`, // Use city as identifier
            lat: parseFloat(bestMatch.lat),
            lng: parseFloat(bestMatch.lon),
          };
        }
      }
    }
  } catch (error) {
    console.warn('City geocoding API failed:', error);
  }

  return null;
}

/**
 * Approximate lat/lng based on first 3 digits of zip code
 * US zip codes are geographically organized by prefix
 */
function getApproximateZipLocation(zipCode: string): ZipLocation | null {
  if (zipCode.length < 3) return null;

  const prefix = parseInt(zipCode.substring(0, 3));

  // Approximate centers for major zip prefixes
  // Source: USPS zip code allocation
  const zipRanges: { [key: string]: { lat: number; lng: number } } = {
    // Northeast
    '010-027': { lat: 42.0, lng: -71.0 }, // MA
    '028-029': { lat: 41.8, lng: -71.4 }, // RI
    '030-038': { lat: 43.0, lng: -71.5 }, // NH
    '039-049': { lat: 44.5, lng: -69.0 }, // ME
    '050-059': { lat: 44.0, lng: -72.7 }, // VT
    '060-069': { lat: 41.6, lng: -72.7 }, // CT
    '100-149': { lat: 40.7, lng: -74.0 }, // NY
    '150-196': { lat: 39.9, lng: -75.2 }, // PA
    '197-199': { lat: 39.3, lng: -76.6 }, // DE, MD

    // Southeast
    '200-205': { lat: 38.9, lng: -77.0 }, // DC, VA
    '220-246': { lat: 37.5, lng: -77.5 }, // VA
    '247-268': { lat: 35.8, lng: -78.6 }, // WV, NC
    '270-289': { lat: 33.7, lng: -84.4 }, // SC, GA
    '290-299': { lat: 33.5, lng: -86.8 }, // SC
    '300-329': { lat: 30.3, lng: -81.7 }, // FL
    '330-349': { lat: 33.5, lng: -86.8 }, // AL
    '350-369': { lat: 32.3, lng: -86.3 }, // AL
    '370-397': { lat: 35.5, lng: -86.6 }, // TN
    '398-399': { lat: 38.2, lng: -85.7 }, // KY

    // Midwest
    '400-427': { lat: 38.2, lng: -85.7 }, // KY
    '430-432': { lat: 39.96, lng: -82.99 }, // OH (Columbus)
    '433-436': { lat: 39.76, lng: -84.19 }, // OH (Dayton)
    '437-438': { lat: 41.08, lng: -81.52 }, // OH (Akron)
    '440-449': { lat: 41.5, lng: -81.7 }, // OH (Cleveland/NE Ohio) - includes 44289
    '450-458': { lat: 39.76, lng: -86.16 }, // IN (Indianapolis)
    '460-479': { lat: 41.9, lng: -87.6 }, // IL (Chicago)
    '480-499': { lat: 42.3, lng: -83.0 }, // MI (Detroit)
    '500-528': { lat: 41.6, lng: -93.6 }, // IA
    '530-549': { lat: 43.1, lng: -89.4 }, // WI
    '550-567': { lat: 44.9, lng: -93.3 }, // MN
    '570-577': { lat: 46.8, lng: -100.8 }, // SD, ND
    '580-588': { lat: 46.8, lng: -100.8 }, // MT, ND
    '590-599': { lat: 46.6, lng: -112.0 }, // MT

    // South Central
    '600-629': { lat: 41.3, lng: -96.0 }, // IL, MO
    '630-658': { lat: 38.6, lng: -90.2 }, // MO
    '660-679': { lat: 39.1, lng: -94.6 }, // KS
    '680-699': { lat: 41.3, lng: -96.0 }, // NE
    '700-729': { lat: 29.8, lng: -95.4 }, // LA
    '730-749': { lat: 35.5, lng: -97.5 }, // AR, OK
    '750-799': { lat: 31.8, lng: -99.9 }, // TX
    '800-816': { lat: 39.7, lng: -104.9 }, // CO
    '820-831': { lat: 42.9, lng: -106.3 }, // WY
    '832-838': { lat: 43.5, lng: -112.0 }, // ID
    '840-847': { lat: 40.8, lng: -111.9 }, // UT

    // Southwest
    '850-865': { lat: 33.4, lng: -112.1 }, // AZ
    '870-884': { lat: 35.1, lng: -106.6 }, // NM
    '885-898': { lat: 36.1, lng: -115.2 }, // NV
    '889-891': { lat: 36.1, lng: -115.2 }, // NV

    // West Coast
    '900-961': { lat: 34.0, lng: -118.2 }, // CA
    '970-979': { lat: 45.5, lng: -122.7 }, // OR
    '980-994': { lat: 47.6, lng: -122.3 }, // WA
    '995-999': { lat: 61.2, lng: -149.9 }, // AK
  };

  // Find matching range
  for (const [range, coords] of Object.entries(zipRanges)) {
    const [min, max] = range.split('-').map((n) => parseInt(n));
    if (prefix >= min && prefix <= max) {
      return {
        zip: zipCode,
        lat: coords.lat,
        lng: coords.lng,
      };
    }
  }

  return null;
}

/**
 * OPTIMIZED: Get all zip codes within a radius of a center zip code
 * Uses ziptastic API or similar service that provides bulk zip code lookups
 * This avoids geocoding every profile individually
 *
 * @param centerZip - The center zip code
 * @param radiusMiles - Radius in miles
 * @returns Array of zip codes within the radius, or null if API fails
 */
export async function getZipCodesWithinRadius(
  centerZip: string,
  radiusMiles: number
): Promise<string[] | null> {
  try {
    // Get center location first
    const centerLocation = await getZipLocation(centerZip);
    if (!centerLocation) {
      console.warn(`Could not geocode center zip: ${centerZip}`);
      return null;
    }

    console.log(
      `Finding zip codes within ${radiusMiles} miles of ${centerZip} (${centerLocation.lat}, ${centerLocation.lng})`
    );

    // Calculate bounding box (simple approximation)
    // 1 degree latitude ≈ 69 miles
    // 1 degree longitude ≈ 69 miles * cos(latitude)
    const latDelta = radiusMiles / 69;
    const lngDelta = radiusMiles / (69 * Math.cos(toRad(centerLocation.lat)));

    const minLat = centerLocation.lat - latDelta;
    const maxLat = centerLocation.lat + latDelta;
    const minLng = centerLocation.lng - lngDelta;
    const maxLng = centerLocation.lng + lngDelta;

    console.log(
      `Bounding box: lat ${minLat.toFixed(2)} to ${maxLat.toFixed(2)}, lng ${minLng.toFixed(2)} to ${maxLng.toFixed(2)}`
    );

    // Option 1: Use a zip code radius API (recommended for production)
    // Example: ZipCodeAPI.com, GeoNames.org, or your own zip code database
    // For now, we'll use a free service if available, or return null to fall back

    try {
      // Try using ZipCodeAPI radius search (if you have an API key)
      // const response = await fetch(
      //   `https://www.zipcodeapi.com/rest/YOUR_API_KEY/radius.json/${centerZip}/${radiusMiles}/mile`
      // );
      // if (response.ok) {
      //   const data = await response.json();
      //   return data.zip_codes.map((z: any) => z.zip_code);
      // }

      // Without paid API, return null to use fallback method
      console.log('No zip code radius API configured - using fallback method');
      return null;
    } catch (apiError) {
      console.warn('Zip code radius API failed:', apiError);
      return null;
    }
  } catch (error) {
    console.error('Error in getZipCodesWithinRadius:', error);
    return null;
  }
}

/**
 * Get profiles within radius of a zip code or city
 * Returns profile IDs that match the distance criteria
 * @param centerLocation - Zip code or city name to use as center
 * @param radiusMiles - Radius in miles
 * @param profileData - Array of profiles with location data
 * @param centerCoords - Optional pre-geocoded center coordinates (for city searches)
 */
export async function getProfilesWithinRadius(
  centerLocation: string,
  radiusMiles: number,
  profileData: Array<{
    id: string;
    zip_code: string;
    city?: string;
    state?: string;
  }>,
  centerCoords?: ZipLocation
): Promise<string[]> {
  // Get center location (either use provided coords or geocode the zip)
  const centerLocationData =
    centerCoords || (await getZipLocation(centerLocation));

  if (!centerLocationData) {
    console.warn('Could not geocode center location:', centerLocation);
    return [];
  }

  // Get locations for all profile zips (cache in production!)
  const profileLocations = await Promise.all(
    profileData.map(async (profile) => {
      const location = await getZipLocation(profile.zip_code);
      if (!location) {
        console.warn(
          `Failed to geocode zip: ${profile.zip_code} for profile ${profile.id}`
        );
      }
      return { id: profile.id, location, zipCode: profile.zip_code };
    })
  );

  console.log(`Center location (${centerLocation}):`, centerLocationData);
  console.log(
    `Checking ${profileLocations.length} profiles within ${radiusMiles} miles`
  );

  // Filter by distance
  const matchingIds = profileLocations
    .filter(({ location, zipCode, id }) => {
      if (!location) {
        console.log(`Profile ${id} excluded: no location for zip ${zipCode}`);
        return false;
      }
      const distance = calculateDistance(
        centerLocationData.lat,
        centerLocationData.lng,
        location.lat,
        location.lng
      );
      const matches = distance <= radiusMiles;
      console.log(
        `Profile ${id} (${zipCode}): ${distance.toFixed(2)} miles - ${matches ? 'INCLUDED' : 'excluded'}`
      );
      return matches;
    })
    .map(({ id }) => id);

  return matchingIds;
}

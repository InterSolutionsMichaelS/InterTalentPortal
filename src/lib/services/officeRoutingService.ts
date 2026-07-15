// src/lib/services/officeRoutingService.ts

import { db } from '@/lib/db';
import {
  getAddressLocation,
  calculateDistance,
} from '@/lib/geospatial';
import type { OfficeRoutingResult } from '@/lib/db/interface';

export async function resolveOffice(
  fullAddress: string
): Promise<OfficeRoutingResult | null> {
  const location = await getAddressLocation(fullAddress);

  if (!location) {
    return null;
  }

  const offices = await db.getOfficeRoutingData();

  const nearestOffice = offices
    .filter((office) => office.IsActive)
    .map((office) => ({
      ...office,
      distanceMiles: calculateDistance(
        location.lat,
        location.lng,
        office.Latitude,
        office.Longitude
      ),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)[0];

  if (!nearestOffice) {
    return null;
  }

  return {
    officeId: nearestOffice.Id,
    officeName: nearestOffice.OfficeName,
    officeEmail: nearestOffice.NotificationEmails,
    division: nearestOffice.Division,
    region: nearestOffice.Region,
    latitude: nearestOffice.Latitude,
    longitude: nearestOffice.Longitude,
    distanceMiles: nearestOffice.distanceMiles,
  };
}
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

  // Normalize the incoming value once
  const normalizedLocation = fullAddress?.trim().toLowerCase();

  if (!normalizedLocation) {
    return null;
  }

  // Load office routing data once
  const offices = await db.getOfficeRoutingData();

  // Fast path - if the supplied value is already an office name
  const officeMatch = offices.find(
    office =>
      office.OfficeName.trim().toLowerCase() === normalizedLocation
  );

  if (officeMatch) {
    return {
      officeId: officeMatch.Id,
      officeName: officeMatch.OfficeName,
      officeEmail: officeMatch.NotificationEmails,
      division: officeMatch.Division,
      region: officeMatch.Region,
      distanceMiles: 0,
    };
  }

  // Existing geocoding logic
  const location = await getAddressLocation(fullAddress);

  if (!location) {
    return null;
  }

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
    distanceMiles: nearestOffice.distanceMiles,
  };
}
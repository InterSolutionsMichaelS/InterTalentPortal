import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getAddressLocation,
  calculateDistance,
} from '@/lib/geospatial';

export async function POST(request: NextRequest) {
  try {
    const {
      streetAddress,
      city,
      state,
    } = await request.json();

    const fullAddress =
      `${streetAddress}, ${city}, ${state}`;

    const location =
      await getAddressLocation(fullAddress);

    if (!location) {
      return NextResponse.json(
        { error: 'Unable to geocode address' },
        { status: 400 }
      );
    }

    const offices = await db.getOfficeRoutingData();

    const officeDistances = offices
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
      .sort(
        (a, b) =>
          a.distanceMiles - b.distanceMiles
      );

    const nearestOffice = officeDistances[0];

    return NextResponse.json({
      officeId: nearestOffice.Id,
      officeName: nearestOffice.OfficeName,
      notificationEmails:
        nearestOffice.NotificationEmails,
      distanceMiles:
        nearestOffice.distanceMiles,
    });
  } catch (error) {
    console.error(
      'Location routing error:',
      error
    );

    return NextResponse.json(
      { error: 'Routing failed' },
      { status: 500 }
    );
  }
}
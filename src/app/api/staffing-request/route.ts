import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getAddressLocation,
  calculateDistance,
} from '@/lib/geospatial';
import {
  sendStaffingRequestEmail
} from '@/lib/email/send-email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      managementCompany,
      propertyName,

      streetAddress,
      city,
      state,

      positionType,
      positionTitle,
      duties,
      startDate,
      schedule,

      firstName,
      lastName,
      phone,
      email,

      contactMethod,
      bestTimeToRespond,
    } = body;

    const fullAddress =
      `${streetAddress}, ${city}, ${state}`;

    const location = await getAddressLocation(fullAddress);

    console.log('STAFFING REQUEST BODY');
    console.log(body);

    console.log(
    'Address:',
    `${streetAddress}, ${city}, ${state}`
    );

    if (!location) {
      return NextResponse.json(
        { error: 'Unable to geocode address' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'No active office found' },
        { status: 404 }
      );
    }

    await db.createStaffingRequest({
      officeId: nearestOffice.Id,
      officeName: nearestOffice.OfficeName,
      officeEmail: nearestOffice.NotificationEmails,

      managementCompany,
      propertyName,
      streetAddress,
      city,
      state,

      positionType,
      positionTitle,
      duties,
      startDate,
      schedule,

      firstName,
      lastName,
      phone,
      email,

      contactMethod,
      bestTimeToRespond,
    });

    await sendStaffingRequestEmail({
        toEmail: nearestOffice.NotificationEmails,

        officeName: nearestOffice.OfficeName,

        managementCompany,
        propertyName,

        streetAddress,
        city,
        state,

        positionType,
        positionTitle,
        duties,

        startDate,
        schedule,

        firstName,
        lastName,
        phone,
        email,

        contactMethod,
        bestTimeToRespond,
        });

    return NextResponse.json({
      success: true,
      officeId: nearestOffice.Id,
      officeName: nearestOffice.OfficeName,
      officeEmail: nearestOffice.NotificationEmails,
      distanceMiles: nearestOffice.distanceMiles,
    });
  } catch (error) {
    console.error('Staffing request error:', error);

    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}
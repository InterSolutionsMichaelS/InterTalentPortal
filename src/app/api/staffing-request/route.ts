import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveOffice } from '@/lib/services/officeRoutingService';
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

      contactTitle,
      firstName,
      lastName,
      phone,
      email,

      contactMethod,
      bestTimeToRespond,
    } = body;

    const fullAddress =
      `${streetAddress}, ${city}, ${state}`;

    const nearestOffice =
      await resolveOffice(fullAddress);

    if (!nearestOffice) {
      return NextResponse.json(
        { error: 'Unable to determine routing office' },
        { status: 400 }
      );
    }

    await db.createStaffingRequest({
      officeId: nearestOffice.officeId,
      officeName: nearestOffice.officeName,
      officeEmail: nearestOffice.officeEmail,

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

      contactTitle,
      firstName,
      lastName,
      phone,
      email,

      contactMethod,
      bestTimeToRespond,
    });

    await sendStaffingRequestEmail({
        toEmail: nearestOffice.officeEmail,

        officeName: nearestOffice.officeName,

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

        contactTitle,
        firstName,
        lastName,
        phone,
        email,

        contactMethod,
        bestTimeToRespond,
        });

    return NextResponse.json({
      success: true,
      officeId: nearestOffice.officeId,
      officeName: nearestOffice.officeName,
      officeEmail: nearestOffice.officeEmail,
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
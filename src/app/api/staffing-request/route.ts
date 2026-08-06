import { NextRequest, NextResponse } from 'next/server';
import { captureInterTalentRequest }
    from "@/lib/services/interTalentRequestService";
import { processInitialNotification }
    from "@/lib/services/requestNotificationEngine";
  import { sendAfterHoursCustomerEmail }
    from "@/lib/email/send-email";

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


    const routing = await captureInterTalentRequest({
      portalSource: "Staffing Request",

      customerName:
        managementCompany ??
        propertyName ??
        "Unknown",

      customerEmail: email,
      customerPhone: phone || null,

      company: managementCompany || null,
      property: propertyName || null,
      location: fullAddress,

      jobType: positionTitle || positionType || null,

      shiftDetails:
         schedule || null,

      startDate: startDate || null,

      notes: [
        positionType ? `Position Type: ${positionType}` : null,
        positionTitle ? `Position Title: ${positionTitle}` : null,
        firstName || lastName
          ? `Contact: ${[firstName, lastName].filter(Boolean).join(" ")}`
          : null,
        contactTitle ? `Contact Title: ${contactTitle}` : null,
        contactMethod
          ? `Preferred Contact Method: ${contactMethod}`
          : null,
        bestTimeToRespond
          ? `Best Time: ${bestTimeToRespond}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),

        staffingRequest: {
            streetAddress,
            city,
            state,

            positionType,
            positionTitle,
            duties,

            contactTitle,
            firstName,
            lastName,

            phone,
            email,

            contactMethod,
            bestTimeToRespond,
        },
    });

    if (!routing.officeEmail || !routing.officeName) {
      return NextResponse.json(
        {
          error: "Request was captured, but the routing office could not be determined",
          requestId: routing.requestId,
        },
        { status: 400 }
      );
    }

    if (routing.status === "After Hours") {
      try {
        const customerEmailResult = await sendAfterHoursCustomerEmail({
          toEmail: email,

          contactFirstName: firstName,
          contactLastName: lastName,

          customerName:
            managementCompany ??
            propertyName,

          propertyName,
          officeName: routing.officeName,

          positionType,
          positionTitle,

          startDate,
          schedule,
        });

        if (!customerEmailResult.success) {
          console.error(
            "After-hours customer email failed:",
            customerEmailResult.error
          );
        }
      } catch (error) {
        console.error(
          "Unexpected after-hours email failure:",
          error
        );
      }
    } else {
      await processInitialNotification(routing.requestId);
    }

    return NextResponse.json({
      success: true,

      requestId: routing.requestId,
      status: routing.status,

      officeId: routing.officeId,
      officeName: routing.officeName,
      officeEmail: routing.officeEmail,
    });
  } catch (error) {
    console.error('Staffing request error:', error);

    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}
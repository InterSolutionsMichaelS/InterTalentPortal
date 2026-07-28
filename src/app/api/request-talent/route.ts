import { NextRequest, NextResponse } from "next/server";
import { captureInterTalentRequest }
    from "@/lib/services/interTalentRequestService";
import { processInitialNotification }
  from "@/lib/services/requestNotificationEngine";
import { sendAfterHoursCustomerEmail }
  from "@/lib/email/send-email";


    const STRATEGIC_ACCOUNTS: Record<string, string> = {
      avenue5: "Avenue5 Residential",
      elmington: "Elmington Property Management",
      rpm: "RPM Living",
      assetliving: "Asset Living",
      greystar: "Greystar",
      resprop: "Resprop Management",
      bedrock: "Bedrock",
      goldoller: "GoldOller",
    };


    
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const hostname = (
        req.headers.get("x-forwarded-host") ??
        req.headers.get("host") ??
        req.nextUrl.hostname
    ).toLowerCase();

    const slug = hostname.split(".")[0];

    const strategicAccount =
      STRATEGIC_ACCOUNTS[slug] ?? null;

    console.log({
        hostname,
        slug,
        strategicAccount,
    });

    console.log("nextUrl.hostname:", req.nextUrl.hostname);

    console.log("Host header:", req.headers.get("host"));

    console.log("X-Forwarded-Host:", req.headers.get("x-forwarded-host"));

    const {
      name,
      email,
      phone,
      notes,
      location,
      personId,

      startDate,
      startTime,
      endTime,

      requestMode,
      associateId,
      associateName,
      campaign,
      customerName,
      propertyName,
    } = body || {};

    console.log("API customerName:", customerName);
    console.log("API name:", name);
    console.log("API propertyName:", propertyName);
    console.log(body);

    // Base validation (applies to all modes)
    if (!name || !email || !notes) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 🔒 Associate-specific validation
    if (requestMode === "ASSOCIATE" && !personId) {
      return NextResponse.json(
        { error: "personId is required for associate requests" },
        { status: 400 }
      );
    }


    const request = await captureInterTalentRequest({

        portalSource: "InterTalent Portal",

        strategicClientName: strategicAccount,

        customerName:
            customerName ??
            propertyName ??
            name,

        customerEmail: email,

        customerPhone: phone,

        company: customerName,

        property: propertyName,

        location,

        zipCode: null,

        associateId: associateId
            ?? personId
            ?? null,

        associateName,

        jobType: requestMode,

        shiftDetails: [
            startTime,
            endTime,
        ]
        .filter(Boolean)
        .join(" - "),

        startDate,
        startTime,
        endTime,

        campaign,

        notes,

    });

    if (request.status === "After Hours") {

      try {

        const customerEmailResult =
          await sendAfterHoursCustomerEmail({

            toEmail: email,

            contactFirstName: name,

            customerName:
              customerName ??
              propertyName,

            propertyName,

            officeName: request.officeName,

            positionTitle:
              associateName ??
              requestMode,

            startDate,

            schedule: [
              startTime,
              endTime,
            ]
              .filter(Boolean)
              .join(" - "),
          });

        if (!customerEmailResult.success) {

          console.error(
            "After-hours customer email failed:",
            customerEmailResult.error
          );

        }

      }
      catch (error) {

        console.error(
          "Unexpected after-hours email failure:",
          error
        );

      }

    }
    else {

      await processInitialNotification(
        request.requestId
      );

    }

    return NextResponse.json({
      success: true,
      requestId: request.requestId,
      status: request.status,
      officeName: request.officeName,
      officeEmail: request.officeEmail,
    });

    } catch (error) {
      console.error("Talent Request API Error:", error);

      return NextResponse.json(
        { error: "Failed to submit request" },
        { status: 500 }
      );
    }
}


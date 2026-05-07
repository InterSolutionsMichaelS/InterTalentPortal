import { NextRequest, NextResponse } from "next/server";
import {
  sendContactEmail,
  sendTalentRequestEmail,
} from "@/lib/email/send-email";
import { db } from "@/lib/db";


    const STRATEGIC_ACCOUNT_SLUGS = [
      { name: 'Avenue5 Residential', slug: 'avenue5' },
      { name: 'Elmington Property Management', slug: 'elmington' },
      { name: 'RPM Living', slug: 'rpm' },
      { name: 'Asset Living', slug: 'assetliving' },
      { name: 'Greystar', slug: 'greystar' },
    ];

    function getStrategicAccount(customerName?: string): string | null {
      if (!customerName) return null;

      const normalized = customerName.toLowerCase().replace(/\s+/g, '');

      for (const account of STRATEGIC_ACCOUNT_SLUGS) {
        if (normalized.includes(account.slug)) {
          return account.name;
        }
      }

      return null;
    }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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
    } = body || {};

    console.log("API customerName:", customerName);

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

    const strategicAccount = getStrategicAccount(customerName);


    await db.insertTalentRequest({
      name,
      email,
      phone,
      notes,
      location,
      personId,
      associateId,
      associateName,
      startDate,
      startTime,
      endTime,
      requestMode,
      campaign,
      customerName, // 👈 THIS is what fixes your issue
      strategicAccount,
    });

    // Default recipient (used for GENERIC / UNAVAILABLE)
    let toEmail = "info@intersolutions.com";

    if (location) {
      try {
        const result = await db.getLocationEmail(location);
        if (result?.email) {
          toEmail = result.email;
        }
      } catch {
        console.warn("Could not fetch location email, using fallback");
      }
    }

    console.log("Incoming Talent Request", {
      requestMode,
      campaign,
      associateId,
      associateName,
      personId,
      name,
      email,
      phone,
      location,
      startDate,
      startTime,
      endTime,
      toEmail,
    });

    switch (requestMode) {
      case "ASSOCIATE": {
        if (!associateName) {
          return NextResponse.json(
            { error: "Associate name required for associate request" },
            { status: 400 }
          );
        }

        // 🔑 Associate requests go through Contact email (office-aware)
        await sendContactEmail({
          toEmail, // office / branch email
          profileName: associateName,
          personId,
          location: location || "Not specified",
          requesterName: name,
          requesterEmail: email,
          requesterPhone: phone,
          comment: notes,
          campaign,
          startDate,
          startTime,
          endTime,
        });

        break;
      }

      case "UNAVAILABLE": {
        // Escalation path – no associate
        await sendTalentRequestEmail({
          toEmail, // InterTalent / fallback inbox
          requesterName: name,
          requesterEmail: email,
          requesterPhone: phone,
          notes: `NO ASSOCIATES AVAILABLE\nCampaign: ${campaign ?? "N/A"}\n\n${notes}`,
          startDate,
          startTime,
          endTime,
        });
        break;
      }

      case "GENERIC":
      default: {
        // Generic staffing request
        await sendTalentRequestEmail({
          toEmail,
          requesterName: name,
          requesterEmail: email,
          requesterPhone: phone,
          notes,
          startDate,
          startTime,
          endTime,
        });
        break;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Talent request submitted",
    });
  } catch (error) {
    console.error("Talent Request API Error:", error);
    return NextResponse.json(
      { error: "Failed to submit request" },
      { status: 500 }
    );
  }
}

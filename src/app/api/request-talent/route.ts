import { NextRequest, NextResponse } from "next/server";
import { sendTalentRequestEmail } from "@/lib/email/send-email";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, notes, location } = body || {};

    // Validate required fields
    if (!name || !email || !notes) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Determine recipient email (branch-aware)
    let toEmail = "info@intersolutions.com";

    if (location) {
      try {
        const result = await db.getLocationEmail(location);
        if (result?.email) {
          toEmail = result.email;
        }
      } catch {
        console.warn("Could not fetch location email, using info@ fallback");
      }
    }

    console.log("Incoming Talent Request:", {
      name,
      email,
      phone,
      location,
      toEmail,
      notes,
    });

    await sendTalentRequestEmail({
      toEmail,
      requesterName: name,
      requesterEmail: email,
      requesterPhone: phone || undefined,
      notes,
    });

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

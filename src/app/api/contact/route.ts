/**
 * API Route: Contact Form Submission
 * Handles "Request Associate" form submissions
 * Sends email to office location via O365 SMTP Relay
 * POST /api/contact
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendContactEmail } from '@/lib/email/send-email';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      profileId,
      profileName,
      location,
      officeEmail: providedEmail,
      name,
      email,
      phone,
      comment,
    } = body;

    // Validate required fields
    if (!name || !email || !comment || !profileName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get office email from location_emails table (or use provided email as fallback)
    let toEmail = providedEmail;
    if (location) {
      try {
        const result = await db.getLocationEmail(location);
        toEmail = result.email;
      } catch {
        console.warn('Could not fetch location email, using provided email');
      }
    }

    // Log the contact request
    console.log('Contact Request:', {
      profileId,
      profileName,
      location,
      toEmail,
      requester: { name, email, phone },
    });

    // Send email via O365 SMTP Relay
    const emailResult = await sendContactEmail({
      toEmail: toEmail || 'info@intersolutions.com',
      profileName,
      location: location || 'Not specified',
      requesterName: name,
      requesterEmail: email,
      requesterPhone: phone,
      comment,
    });

    if (!emailResult.success) {
      console.warn('Email not sent:', emailResult.error);
      // Still return success to user - email failure shouldn't block the request
    }

    return NextResponse.json({
      success: true,
      message: 'Contact request received successfully',
    });
  } catch (error) {
    console.error('Error processing contact request:', error);
    return NextResponse.json(
      { error: 'Failed to process contact request' },
      { status: 500 }
    );
  }
}

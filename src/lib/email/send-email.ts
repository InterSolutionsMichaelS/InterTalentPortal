/**
 * Email Service for O365 SMTP Relay
 * Sends contact form emails to regional office addresses
 */

import nodemailer from 'nodemailer';

const EMAILS_DISABLED =
  process.env.DISABLE_INTERTALENT_EMAILS === "true";

/** added on 8/25/26 to suppress localhost emails when set true*/
function emailSuppressed(functionName: string, toEmail?: string) {
  if (!EMAILS_DISABLED) {
    return false;
  }

  console.warn(
    `[EMAIL SUPPRESSED] ${functionName}`,
    toEmail ? `Recipient would have been: ${toEmail}` : ""
  );

  return true;
}

function formatTimeTo12Hour(time?: string): string {
  if (!time) return "Not specified";

  const [hourStr, minute] = time.split(":");
  let hour = parseInt(hourStr, 10);

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;

  return `${hour}:${minute} ${ampm}`;
}

function formatDateOnly(value?: string | Date | null): string {
  if (!value) return "Not specified";

  const dateText =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value).slice(0, 10);

  const [year, month, day] = dateText.split("-").map(Number);

  if (!year || !month || !day) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function buildTalentRequestHtml(
    params: InterTalentNotificationEmailParams
): string {

    const {
        requestId,
        acknowledgementToken,
        profileName,
        personId,
        location,

        requesterName,
        requesterEmail,
        requesterPhone,

        customerName,
        propertyName,
        campaign,

        comment,

        startDate,
        startTime,
        endTime,
    } = params;

    const acknowledgementUrl =
      `${process.env.NEXT_PUBLIC_APP_URL}/internal/acknowledge` +
      `?requestId=${encodeURIComponent(requestId)}` +
      `&token=${encodeURIComponent(acknowledgementToken)}`;


    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0077B5;">New Talent Request</h2>

      <div style="
          margin:20px 0;
          padding:20px;
          background:#f8fbff;
          border:1px solid #d9e9f8;
          border-radius:6px;
      ">

          <h3 style="margin-top:0;color:#0077B5;">
              Action Required
          </h3>

          <p>Hello Team,</p>

          <p>
              By clicking the button below, you are confirming that this staffing
              request has been received, reviewed, and is actively being processed
              within your market.
          </p>

          <p>
              This process helps prevent requests from being overlooked and ensures
              we continue delivering responsive, reliable service to our clients.
          </p>

          <p>
              Thank you for your cooperation!
          </p>

          <div style="text-align:center;margin:30px 0;">

              <div style="text-align:center; margin:40px 0;">
              <a
                  href="${acknowledgementUrl}"
                  style="
                      background-color:#28a745;
                      color:#ffffff;
                      text-decoration:none;
                      display:inline-block;
                      padding:18px 40px;
                      font-size:20px;
                      font-weight:bold;
                      font-family:Arial, Helvetica, sans-serif;
                      border-radius:8px;
                      border:1px solid #218838;
                      box-shadow:0 3px 6px rgba(0,0,0,.2);
                  "
              >
                  ✅ Acknowledge &amp; Accept Ownership
              </a>
          </div>

          </div>
      </div>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Associate:</strong> ${profileName}</p>
        <p><strong>Location:</strong> ${location}</p>
        ${
  personId
    ? `
      <p><strong>Employee ID:</strong> ${personId}</p>
      <p>
        <a
          href="https://intersolutions.zenople.com/employee/directory/${personId}/employee/snapshot"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Employee Profile
        </a>
      </p>
    `
    : ''
}
      </div>

      ${
        customerName || propertyName
          ? `
            <h3 style="color:#333;">Customer Information</h3>

            <table style="width:100%;border-collapse:collapse;">
              ${
                customerName
                  ? `
                  <tr>
                    <td style="padding:8px;border-bottom:1px solid #eee;">
                      <strong>Customer:</strong>
                    </td>
                    <td style="padding:8px;border-bottom:1px solid #eee;">
                      ${customerName}
                    </td>
                  </tr>
                `
                  : ""
              }

              ${
                propertyName
                  ? `
                  <tr>
                    <td style="padding:8px;border-bottom:1px solid #eee;">
                      <strong>Property:</strong>
                    </td>
                    <td style="padding:8px;border-bottom:1px solid #eee;">
                      ${propertyName}
                    </td>
                  </tr>
                `
                  : ""
              }
            </table>
          `
          : ""
      }
      
      <h3 style="color: #333;">Requester Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${requesterName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${requesterEmail}">${requesterEmail}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${requesterPhone || 'Not provided'}</td>
        </tr>
      </table>
      
      <h3 style="color: #333;">Message</h3>
      <div style="background: #f9f9f9; padding: 15px; border-left: 3px solid #0077B5; margin: 15px 0;">
        ${comment?.replace(/\n/g, '<br>')}
        
        ${
          startDate || startTime || endTime
            ? `<br><br><strong>Requested Schedule:</strong><br>
              Date: ${formatDateOnly(startDate)}<br>
              Start: ${formatTimeTo12Hour(startTime)}<br>
              End: ${formatTimeTo12Hour(endTime)}`
            : ""
        }
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        This email was sent from InterTalent Portal.
      </p>
    </div>
  `;
}

function buildStaffingRequestHtml(
    params: InterTalentNotificationEmailParams
): string {

  const {
      requestId,
      acknowledgementToken,

      officeName,

      customerName,
      propertyName,
      strategicAccount,
      campaign,

      managementCompany,

      streetAddress,
      city,
      state,

      positionType,
      positionTitle,
      duties,

      startDate,
      schedule,

      contactTitle,
      contactFirstName,
      contactLastName,
      contactPhone,
      contactEmail,

      contactMethod,
      bestTimeToRespond,
  } = params;

    const acknowledgementUrl =
      `${process.env.NEXT_PUBLIC_APP_URL}/internal/acknowledge` +
      `?requestId=${encodeURIComponent(requestId)}` +
      `&token=${encodeURIComponent(acknowledgementToken)}`;

    return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0077B5;">New Staffing Request</h2>

      <div style="
          margin:20px 0;
          padding:20px;
          background:#f8fbff;
          border:1px solid #d9e9f8;
          border-radius:6px;
      ">

          <h3 style="margin-top:0;color:#0077B5;">
              Action Required
          </h3>

          <p>Hello Team,</p>

          <p>
              By clicking the button below, you are confirming that this staffing
              request has been received, reviewed, and is actively being processed
              within your market.
          </p>

          <p>
              This process helps prevent requests from being overlooked and ensures
              we continue delivering responsive, reliable service to our clients.
          </p>

          <p>
              Thank you for your cooperation!
          </p>

          <div style="text-align:center;margin:30px 0;">

              <div style="text-align:center; margin:40px 0;">
              <a
                  href="${acknowledgementUrl}"
                  style="
                      background-color:#28a745;
                      color:#ffffff;
                      text-decoration:none;
                      display:inline-block;
                      padding:18px 40px;
                      font-size:20px;
                      font-weight:bold;
                      font-family:Arial, Helvetica, sans-serif;
                      border-radius:8px;
                      border:1px solid #218838;
                      box-shadow:0 3px 6px rgba(0,0,0,.2);
                  "
              >
                  ✅ Acknowledge &amp; Accept Ownership
              </a>
          </div>

          </div>
      </div>

      <h3 style="color:#333;">Property Information</h3>

      <table style="width:100%;border-collapse:collapse;">

      <tr>
      <td><strong>Management Company:</strong></td>
      <td>${managementCompany ?? "Not provided"}</td>
      </tr>

      ${
      customerName
      ? `
      <tr>
      <td><strong>Customer:</strong></td>
      <td>${customerName}</td>
      </tr>
      `
      : ""
      }

      ${
      propertyName
      ? `
      <tr>
      <td><strong>Property:</strong></td>
      <td>${propertyName}</td>
      </tr>
      `
      : ""
      }

      ${
      strategicAccount
      ? `
      <tr>
      <td><strong>Strategic Account:</strong></td>
      <td>${strategicAccount}</td>
      </tr>
      `
      : ""
      }

      <tr>
      <td><strong>Office:</strong></td>
      <td>${officeName}</td>
      </tr>

      <tr>
      <td><strong>Address:</strong></td>
      <td>
      ${streetAddress ?? ""}<br>
      ${city ?? ""}, ${state ?? ""}
      </td>
      </tr>

      </table>

      <table style="width: 100%; border-collapse: collapse;">
        <h3 style="color:#333;">Contact Information</h3>

<table style="width:100%;border-collapse:collapse;">

<tr>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        <strong>Contact:</strong>
    </td>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        ${contactTitle ? contactTitle + " " : ""}
        ${contactFirstName ?? ""}
        ${contactLastName ?? ""}
    </td>
</tr>

<tr>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        <strong>Email:</strong>
    </td>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        <a href="mailto:${contactEmail}">
            ${contactEmail}
        </a>
    </td>
</tr>

<tr>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        <strong>Phone:</strong>
    </td>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        ${contactPhone ?? "Not provided"}
    </td>
</tr>

</table>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${contactEmail}">${contactEmail}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${contactPhone || 'Not provided'}</td>
        </tr>
      </table>
      
      <h3 style="color:#333;">Position Information</h3>

<table style="width:100%;border-collapse:collapse;">

<tr>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        <strong>Position Type:</strong>
    </td>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        ${positionType ?? "Not specified"}
    </td>
</tr>

<tr>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        <strong>Position Title:</strong>
    </td>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        ${positionTitle ?? "Not specified"}
    </td>
</tr>

<tr>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        <strong>Requested Start Date:</strong>
    </td>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        ${formatDateOnly(startDate)}
    </td>
</tr>

<tr>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        <strong>Schedule:</strong>
    </td>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        ${schedule ?? "Not specified"}
    </td>
</tr>

<tr>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        <strong>Preferred Contact:</strong>
    </td>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        ${contactMethod ?? "Not specified"}
    </td>
</tr>

<tr>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        <strong>Best Time to Respond:</strong>
    </td>
    <td style="padding:8px;border-bottom:1px solid #eee;">
        ${bestTimeToRespond ?? "Not specified"}
    </td>
</tr>

</table>

      <h3 style="color:#333;">Duties / Additional Notes</h3>

      <div style="
      background:#f9f9f9;
      padding:15px;
      border-left:3px solid #0077B5;
      margin:15px 0;
      ">
      ${duties?.replace(/\n/g,"<br>") ?? "None provided"}
      </div>


      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        This email was sent from InterTalent Portal.
      </p>
    </div>`;
}

// O365 SMTP Relay Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
  },
});

function buildAfterHoursCustomerHtml(
    params: CustomerRequestStatusEmailParams
): string {

    const {
        customerName,
        propertyName,
        officeName,
        positionTitle,
    } = params;

    return `

<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;">

    <div style="text-align:center;padding:30px 0;">

        <img
            src="${process.env.NEXT_PUBLIC_APP_URL}/intersolutions.logo.jpg.jpg"
            style="max-width:250px;"
        />

        <h2 style="color:#022949;margin-top:20px;">
            We've Received Your Request
        </h2>

    </div>

    <p>

        Hello,

    </p>

    <p>

        Thank you for requesting talent from InterSolutions!

    </p>

    <p>

        Your request was submitted outside of our <strong>${officeName}</strong> office hours. Our team will review your request and you can expect to hear from us during our next business day <strong>as soon as possible</strong>.

    </p>

    <p>

        We appreciate your patience and look forward to assisting you!

    </p>

    <p>

        Thank you,<br>

        The InterSolutions Team

    </p>

</div>

`;

}

function buildOwnershipConfirmedHtml(
    params: CustomerRequestStatusEmailParams
): string {

    const {

        customerName,
        propertyName,
        officeName,
        positionTitle,

    } = params;

    return `

<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;">

    <div style="text-align:center;padding:30px 0;">

        <img
            src="${process.env.NEXT_PUBLIC_APP_URL}/intersolutions.logo.jpg.jpg"
            style="max-width:250px;"
        />

        <h2 style="color:#022949;">
            Your Request Is Being Processed
        </h2>

    </div>

    <p>

        Good news!

    </p>

    <p>

        An InterSolutions representative has accepted ownership of your request.

    </p>

    <p>

        Someone from our <strong>${officeName}</strong> office will be contacting you shortly.

    </p>

    <table style="width:100%;margin-top:25px;">

        <tr>

            <td><strong>Customer</strong></td>

            <td>${customerName ?? "Not Provided"}</td>

        </tr>

        <tr>

            <td><strong>Property</strong></td>

            <td>${propertyName ?? "Not Provided"}</td>

        </tr>

    </table>

    <p style="margin-top:35px;">

        Thank you for choosing InterSolutions.

    </p>

</div>

`;

}


export interface InterTalentNotificationEmailParams {
    // -----------------------------------------------------------------
    // Common
    // -----------------------------------------------------------------

    toEmail: string;
    requestType: "Associate/Talent Request" | "Staffing Request";
    officeName: string;

    requestId: string;
    acknowledgementToken: string;

    customerName?: string;
    propertyName?: string;
    strategicAccount?: string;
    campaign?: string;

    startDate?: Date;
    startTime?: string;
    endTime?: string;

    // -----------------------------------------------------------------
    // Talent Request
    // -----------------------------------------------------------------

    profileName?: string;
    personId?: string;
    location?: string;

    requesterName?: string;
    requesterEmail?: string;
    requesterPhone?: string;

    comment?: string;

    // -----------------------------------------------------------------
    // Staffing Request
    // -----------------------------------------------------------------

    managementCompany?: string;

    streetAddress?: string;
    city?: string;
    state?: string;

    positionType?: string;
    positionTitle?: string;
    duties?: string;

    schedule?: string;

    contactTitle?: string;

    contactFirstName?: string;
    contactLastName?: string;

    contactPhone?: string;
    contactEmail?: string;

    contactMethod?: string;
    bestTimeToRespond?: string;
}




/**
 * Send contact request email to office
 */
export async function sendInterTalentNotification(
  params: InterTalentNotificationEmailParams
): Promise<{ success: boolean; error?: string }> {

  if (emailSuppressed(
    "sendInterTalentNotification",
    params.toEmail
  )) {
    return { success: true };
  }

  const {
    toEmail,
    requestType,

    requestId,
    acknowledgementToken,

    officeName,

    managementCompany,
    propertyName,

    streetAddress,
    city,
    state,
    location,

    requesterName,
    requesterEmail,
    requesterPhone,

    profileName,
    personId,

    positionType,
    positionTitle,
    duties,

    contactTitle,
    contactFirstName,
    contactLastName,
    contactPhone,
    contactEmail,
    contactMethod,
    bestTimeToRespond,

    startDate,
    startTime,
    endTime,
    schedule,

    comment,

    campaign,
    customerName,
    strategicAccount,
  } = params;

  

  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('SMTP not configured - email not sent');
    return { success: false, error: 'SMTP not configured' };
  }
   // lines 131-140 added to adjust json formatting of start time and end time in 12 hour format MS 3/11/26
   // ✅ Campaign-aware subject
  const campaignLabel =
    campaign === 'TalentTuesday'
      ? 'Talent Tuesday'
      : 'InterTalent Portal';

  const subject =
    requestType === "Associate/Talent Request"
      ? `${campaignLabel} – Associate Request: ${profileName ?? "Unknown Associate"}`
      : `${campaignLabel} – Staffing Request: ${propertyName ?? customerName ?? officeName ?? ""}`; 

  const html =
    requestType === "Associate/Talent Request"
      ? buildTalentRequestHtml(params)
      : buildStaffingRequestHtml(params);

  
  /*const TEST_NOTIFICATION_RECIPIENTS = [
      "mstiles@intersolutions.com",
      "ejenkins@intersolutions.com",
      //"mconway@intersolutions.com",
      "mvrabel@intersolutions.com",
      "emyket@intersolutions.com",
      // "someoneelse@intersolutions.com",
  ];*/

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to:toEmail, /*TEST_NOTIFICATION_RECIPIENTS, // replace with after testing toEmail,*/
      replyTo: requesterEmail,
      subject,
      html,

      priority: "high",

      headers: {
        Importance: "High",
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
      },
    });

    console.log(
      `Email sent to ${toEmail} for associate request: ${profileName}`
    );
    return { success: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendAfterHoursCustomerEmail(
  params: CustomerRequestStatusEmailParams
): Promise<{ success: boolean; error?: string }> {
  try {

    if (emailSuppressed(
      "sendAfterHoursCustomerEmail",
      params.toEmail
    )) {
      return { success: true };
    }
    const html = buildAfterHoursCustomerHtml(params);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: params.toEmail,
      subject: "We've Received Your Request",
      html,
    });

    return { success: true };

  } catch (error) {

    console.error("Failed to send after-hours email:", error);

    return {
      success: false,
      error: error instanceof Error
        ? error.message
        : "Unknown error",
    };
  }
}


export async function sendOwnershipConfirmedEmail(
  params: CustomerRequestStatusEmailParams
): Promise<{ success: boolean; error?: string }> {
  try {

    if (emailSuppressed(
      "sendOwnershipConfirmedEmail",
      params.toEmail
    )) {
      return { success: true };
    }
    const html = buildOwnershipConfirmedHtml(params);

    await transporter.sendMail({

        from: process.env.SMTP_FROM || process.env.SMTP_USER,

        to: params.toEmail,

        subject: "Your Request Is Being Processed",

        html,

    });

    return { success: true };

  } catch (error) {

    console.error(
      "Failed to send ownership confirmation email:",
      error
    );

    return {
      success: false,
      error: error instanceof Error
      ? error.message
      : "Unknown Error",
    };
  }
}

/**
 * Verify SMTP connection
 */
export async function verifySmtpConnection(): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return false;
  }

  try {
    await transporter.verify();
    console.log('SMTP connection verified');
    return true;
  } catch (error) {
    console.error('SMTP verification failed:', error);
    return false;
  }
}

// TalentRequestModal Email parameters added 12/11/25 MS 
interface TalentRequestEmailParams {
  toEmail: string;               // Always InterTalent@ for now
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  notes: string;

  startDate?: string;    // added on 3/11/26 for json delivery of information
  startTime?: string;
  endTime?: string;
  campaign?: string;
  requestMode?: string;
  customerName?: string | null;
  propertyName?: string | null;
  strategicAccount?: string | null;
}

export interface StaffingRequestEmailParams {
  toEmail: string;

  officeName: string;

  managementCompany: string;
  propertyName: string;

  streetAddress: string;
  city: string;
  state: string;

  positionType: string;
  positionTitle: string;
  duties: string;

  startDate?: string;
  schedule?: string;

  contactTitle: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email: string;

  contactMethod?: string;
  bestTimeToRespond?: string;
}

export interface CustomerRequestStatusEmailParams {
  toEmail: string;

  contactFirstName?: string;
  contactLastName?: string;

  customerName?: string | null;
  propertyName?: string | null;
  officeName?: string | null;

  positionType?: string | null;
  positionTitle?: string | null;

  startDate?: string | Date | null;
  schedule?: string | null;
}

/**
 * Send "Request Talent" email (No candidates found)
 * Always goes to InterTalent@intersolutions.com
 */
export async function sendTalentRequestEmail(
  params: TalentRequestEmailParams
): Promise<{ success: boolean; error?: string }> {

  if (emailSuppressed(
    "sendTalentRequestEmail",
    params.toEmail
  )) {
    return { success: true };
  }
  const { toEmail, requesterName, requesterEmail, requesterPhone, notes, campaign, requestMode, customerName, propertyName, strategicAccount, startDate, startTime, endTime, } = params;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn("SMTP not configured - talent request email not sent");
    return { success: false, error: "SMTP not configured" };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0077B5;">New Talent Request (No Candidates Found)</h2>

      <p>A user submitted a talent request from the InterTalent Portal.</p>

      <h3 style="color: #333;">Requester Information</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Name:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${requesterName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            <a href="mailto:${requesterEmail}">${requesterEmail}</a>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Phone:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${requesterPhone || "Not provided"}</td>
        </tr>
      </table>

      <h3 style="color: #333;">Requested Talent Details</h3>

      <p><strong>Property:</strong> ${propertyName || "Not specified"}</p>

      <div style="background: #f9f9f9; padding: 15px; border-left: 3px solid #0077B5; margin: 15px 0;">
        ${notes.replace(/\n/g, "<br>")}
      </div>

      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        This email was sent from the InterTalent Portal (No candidates found).
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail, // Always InterTalent inbox
      replyTo: requesterEmail,
      subject: `New Talent Request from ${requesterName}`,
      html,
    });

    console.log(`Talent Request Email sent to ${toEmail}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send talent request email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function sendStaffingRequestEmail(
  params: StaffingRequestEmailParams
): Promise<{ success: boolean; error?: string }> {

  if (emailSuppressed(
    "sendStaffingRequestEmail",
    params.toEmail
  )) {
    return { success: true };
  }

  const {
    toEmail,
    officeName,

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
  } = params;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">

      <h2 style="color:#0077B5;">
        New Staffing Request
      </h2>

      <p>
        A staffing request has been submitted through InterTalent.
      </p>

      <h3>Office Routing</h3>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td><strong>Office:</strong></td>
          <td>${officeName}</td>
        </tr>
      </table>

      <h3>Property Information</h3>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td><strong>Management Company:</strong></td>
          <td>${managementCompany}</td>
        </tr>

        <tr>
          <td><strong>Property Name:</strong></td>
          <td>${propertyName}</td>
        </tr>

        <tr>
          <td><strong>Address:</strong></td>
          <td>
            ${streetAddress}<br/>
            ${city}, ${state}
          </td>
        </tr>
      </table>

      <h3>Position Information</h3>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td><strong>Position Type:</strong></td>
          <td>${positionType}</td>
        </tr>

        <tr>
          <td><strong>Position Title:</strong></td>
          <td>${positionTitle}</td>
        </tr>

        <tr>
          <td><strong>Start Date:</strong></td>
          <td>${startDate ?? "Not specified"}</td>
        </tr>

        <tr>
          <td><strong>Schedule:</strong></td>
          <td>${schedule ?? "Not specified"}</td>
        </tr>
      </table>

      <h3>Duties & Responsibilities</h3>

      <div style="background:#f5f5f5;padding:15px;border-left:4px solid #0077B5;">
        ${duties.replace(/\n/g, "<br>")}
      </div>

      <h3>Contact Information</h3>

      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td><strong>Name:</strong></td>
          <td>${firstName} ${lastName}</td>
        </tr>

        <tr>
          <td><strong>Email:</strong></td>
          <td>${email}</td>
        </tr>

        <tr>
          <td><strong>Phone:</strong></td>
          <td>${phone ?? "Not provided"}</td>
        </tr>

        <tr>
          <td><strong>Preferred Contact:</strong></td>
          <td>${contactMethod ?? "Not specified"}</td>
        </tr>

        <tr>
          <td><strong>Best Time:</strong></td>
          <td>${bestTimeToRespond ?? "Not specified"}</td>
        </tr>
      </table>

    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      cc: "InterTalent@intersolutions.com",
      replyTo: email,
      subject: `New Staffing Request - ${officeName}`,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send staffing request email:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    };
  }
}

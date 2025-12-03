/**
 * Email Service for O365 SMTP Relay
 * Sends contact form emails to regional office addresses
 */

import nodemailer from 'nodemailer';

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

interface ContactEmailParams {
  toEmail: string;
  profileName: string;
  location: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  comment: string;
}

/**
 * Send contact request email to office
 */
export async function sendContactEmail(
  params: ContactEmailParams
): Promise<{ success: boolean; error?: string }> {
  const {
    toEmail,
    profileName,
    location,
    requesterName,
    requesterEmail,
    requesterPhone,
    comment,
  } = params;

  // Check if SMTP is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('SMTP not configured - email not sent');
    return { success: false, error: 'SMTP not configured' };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0077B5;">New Associate Request</h2>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Associate:</strong> ${profileName}</p>
        <p><strong>Location:</strong> ${location}</p>
      </div>
      
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
        ${comment.replace(/\n/g, '<br>')}
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        This email was sent from InterTalent Portal.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      replyTo: requesterEmail,
      subject: `Associate Request: ${profileName} - ${location}`,
      html,
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

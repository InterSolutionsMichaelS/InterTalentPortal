import { db } from "@/lib/db";
import { sendInterTalentNotification } from "@/lib/email/send-email";

export async function processInitialNotification(
  requestId: string
): Promise<void> {

  const header = await db.getRequestHeader(requestId);

  if (!header) {
    throw new Error("InterTalent request was not found.");
  }

  /* testing
  // After-hours requests are held until a scheduled process releases them.
  if (!header.officeIsOpenAtSubmission) {
    return;
  }
  */

  try {

    const notification =
      header.portalSource === "Staffing Request"
        ? await db.getStaffingNotificationContext(requestId)
        : await db.getTalentNotificationContext(requestId);

    if (!notification) {
      throw new Error(
        `Notification context was not found for ${header.portalSource}.`
      );
    }

    await sendInterTalentNotification(notification);

    await db.recordInitialNotification({
      requestId,
      recipientEmail: notification.toEmail,
    });

    await db.createRequestEvent({
      requestId,
      eventType: "Internal Notification Sent",
      metadata: {
        recipient: notification.toEmail,
        office: notification.officeName,
        portalSource: header.portalSource,
      },
    });

  } catch (error) {

    console.error(
      "Initial InterTalent notification failed:",
      error
    );

    throw error;
  }
}
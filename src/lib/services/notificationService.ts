import {
  sendInterTalentNotification, InterTalentNotificationEmailParams
} from "@/lib/email/send-email";
import { db } from "@/lib/db";

export async function notifyOfficeOfTalentRequest(
    data: InterTalentNotificationEmailParams
) {
    return sendInterTalentNotification(data);
}

export async function notifyUnavailable(
    data: InterTalentNotificationEmailParams
) {
    return sendInterTalentNotification(data);
}

export async function notifyStaffingRequest(
    data: InterTalentNotificationEmailParams
) {
    return sendInterTalentNotification(data);
}

export async function processInitialNotification(
    requestId: string
): Promise<void> {

  const header = await db.getRequestHeader(requestId);

  if (!header) {
    throw new Error(
        "InterTalent request was not found."
    );
  }

  if (header.portalSource === "Staffing Request") {

      const context =
          await db.getStaffingNotificationContext(requestId);

      if (!context) {
          throw new Error(
              "Staffing notification context was not found."
          );
      }

      await notifyStaffingRequest(context);

  } else {

      const context =
          await db.getTalentNotificationContext(requestId);

      if (!context) {
         throw new Error(
            "Talent notification context was not found."
      );


    }
    await notifyOfficeOfTalentRequest(context);
  }

  await db.recordWorkflowAction({
      requestId,
      actionType: "SEND_INITIAL_NOTIFICATION"
  });
}

export async function sendReminder(
    requestId: string
): Promise<void> {

  const header =
    await db.getRequestHeader(requestId);

  if (!header) {
      throw new Error(
          "InterTalent request was not found."
      );
  }

  const context =
    header.portalSource === "Staffing Request"
        ? await db.getStaffingNotificationContext(requestId)
        : await db.getTalentNotificationContext(requestId);

    if (!context) {
        throw new Error("Notification context was not found.");
    }

    await notifyUnavailable(context);

    await db.recordWorkflowAction({
        requestId,
        actionType: "SEND_REMINDER"
    });

}

export async function sendRVPEscalation(
    requestId: string
): Promise<void> {

  const header =
    await db.getRequestHeader(requestId);

  if (!header) {
      throw new Error(
          "InterTalent request was not found."
      );
  }

  const context =
    header.portalSource === "Staffing Request"
        ? await db.getStaffingNotificationContext(requestId)
        : await db.getTalentNotificationContext(requestId);

    if (!context) {
        throw new Error("Notification context was not found.");
    }

    context.toEmail =
        await db.getEscalationRecipients(
            requestId,
            true,
            false
        );

    await notifyUnavailable(context);

    await db.recordWorkflowAction({
        requestId,
        actionType: "SEND_RVP_ESCALATION"
    });

}

export async function sendDOSEscalation(
    requestId: string
): Promise<void> {

  const header =
    await db.getRequestHeader(requestId);

  if (!header) {
      throw new Error(
          "InterTalent request was not found."
      );
  }

  const context =
    header.portalSource === "Staffing Request"
        ? await db.getStaffingNotificationContext(requestId)
        : await db.getTalentNotificationContext(requestId);

    if (!context) {
        throw new Error("Notification context was not found.");
    }

    context.toEmail =
        await db.getEscalationRecipients(
            requestId,
            true,
            true
        );

    await notifyUnavailable(context);

    await db.recordWorkflowAction({
        requestId,
        actionType: "SEND_DOS_ESCALATION"
    });

}

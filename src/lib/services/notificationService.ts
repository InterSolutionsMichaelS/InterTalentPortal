import {
  sendContactEmail,
  sendTalentRequestEmail,
  sendStaffingRequestEmail,
} from "@/lib/email/send-email";

export async function notifyOfficeOfTalentRequest(
  data: Parameters<typeof sendContactEmail>[0]
) {
  return sendContactEmail(data);
}

export async function notifyUnavailable(
  data: Parameters<typeof sendTalentRequestEmail>[0]
) {
  return sendTalentRequestEmail(data);
}

export async function notifyStaffingRequest(
  data: Parameters<typeof sendStaffingRequestEmail>[0]
) {
  return sendStaffingRequestEmail(data);
}
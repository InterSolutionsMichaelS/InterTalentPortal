import { db } from "@/lib/db";
import { resolveOffice } from "@/lib/services/officeRoutingService";
import { processInitialNotification, sendReminder, sendRVPEscalation, sendDOSEscalation } from "./notificationService";
import type {
  CreateInterTalentRequestInput,
} from "@/lib/db/interface";


export interface CaptureInterTalentRequestResult {
  requestId: string;
  officeId: number;
  officeName: string;
  officeEmail: string;
  division: string;
  region: string;
  officeIsOpen: boolean;
  nextOfficeOpenDateTime: Date | null;
  status: string;
  distanceMiles: number;
}

export async function captureInterTalentRequest(
  input: CreateInterTalentRequestInput
): Promise<CaptureInterTalentRequestResult> {
  // Step 1 - Persist the original request
  const request = await db.createInterTalentRequest(input);

  // Step 2 - Record capture
  await db.createRequestEvent({
    requestId: request.requestId,
    eventType: "Request Created",
  });

  if (!input.location) {
    await db.createRequestEvent({
      requestId: request.requestId,
      eventType: "Routing Exception",
      notes: "The request did not contain a location.",
    });

    throw new Error(
      "A location is required to determine the routing office."
    );
  }

  // Step 3 - Azure Maps/geospatial office resolution
  const resolvedOffice = await resolveOffice(input.location);

  if (!resolvedOffice) {
    await db.createRequestEvent({
      requestId: request.requestId,
      eventType: "Routing Exception",
      notes: "No active routing office could be resolved.",
      metadata: {
        location: input.location,
      },
    });

    throw new Error(
      "Unable to determine a routing office."
    );
  }

  // Step 4 - SQL applies routing configuration and SLA rules
  const routing = await db.applyInterTalentRouting({
    requestId: request.requestId,
    officeName: resolvedOffice.officeName,
  });

    // Step 4.5 - Persist Staffing Request details (if applicable)
  if (
    input.portalSource === "Staffing Request" &&
    input.staffingRequest
  ) {
    await db.createStaffingRequest({
      requestId: request.requestId,

      officeId: routing.officeId,
      officeName: routing.officeName,
      officeEmail: routing.officeEmail,

      managementCompany: input.company ?? undefined,
      propertyName: input.property ?? undefined,

      streetAddress:
        input.staffingRequest.streetAddress,

      city:
        input.staffingRequest.city,

      state:
        input.staffingRequest.state,

      positionType:
        input.staffingRequest.positionType,

      positionTitle:
        input.staffingRequest.positionTitle,

      duties:
        input.staffingRequest.duties,

      startDate:
        input.startDate ?? undefined,

      schedule:
        input.shiftDetails ?? undefined,

      contactTitle:
        input.staffingRequest.contactTitle,

      firstName:
        input.staffingRequest.firstName,

      lastName:
        input.staffingRequest.lastName,

      phone:
        input.staffingRequest.phone,

      email:
        input.staffingRequest.email,

      contactMethod:
        input.staffingRequest.contactMethod,

      bestTimeToRespond:
        input.staffingRequest.bestTimeToRespond,
    });
  }

  // Step 5 - Record the authoritative routing result
  await db.createRequestEvent({
    requestId: request.requestId,
    eventType: "Routing Completed",
    metadata: {
      office: routing.officeName,
      division: routing.division,
      region: routing.region,
      distanceMiles: resolvedOffice.distanceMiles,
      officeIsOpen: routing.officeIsOpen,
      nextOfficeOpenDateTime:
        routing.nextOfficeOpenDateTime,
      status: routing.status,
    },
  });

  return {
    ...routing,
    distanceMiles: resolvedOffice.distanceMiles,
  };
}

export interface WorkflowProcessingSummary {
  processed: number;
  notifications: number;
  reminders: number;
  escalations: number;
  failed: number;
}

export async function processPendingWorkflowActions()
: Promise<WorkflowProcessingSummary> {

    const actions =
        await db.getPendingWorkflowActions();

    const summary: WorkflowProcessingSummary = {
        processed: 0,
        notifications: 0,
        reminders: 0,
        escalations: 0,
        failed: 0,
    };

    for (const action of actions) {

      console.log("Action returned from SQL:", action);

      try {

          summary.processed++;

          switch (action.actionType) {

            case "SEND_INITIAL_NOTIFICATION":
                await processInitialNotification(action.requestId);
                summary.notifications++;
                break;

            case "SEND_REMINDER":
                await sendReminder(action.requestId);
                summary.reminders++;
                break;

            case "SEND_RVP_ESCALATION":
                await sendRVPEscalation(action.requestId);
                summary.escalations++;
                break;

            case "SEND_DOS_ESCALATION":
                await sendDOSEscalation(action.requestId);
                summary.escalations++;
                break;
            default:
                console.log("NO MATCH:", action.actionType);
                break;  
        }

      } catch (error) {

          console.error(error);
          summary.failed++;

      }
  }

    return summary;
}


  

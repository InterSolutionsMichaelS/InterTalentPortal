import { db } from "@/lib/db";
import { resolveOffice } from "@/lib/services/officeRoutingService";
import type {
  CreateInterTalentRequestInput,
} from "@/lib/db/interface";

export async function captureInterTalentRequest(
  input: CreateInterTalentRequestInput
) {
  // Step 1 - Capture the request
  const request = await db.createInterTalentRequest(input);

  // Step 2 - Initial audit event
  await db.createRequestEvent({
    requestId: request.requestId,
    eventType: "Request Created",
  });

  // Step 3 - Resolve routing office
  if (input.location) {
    const office = await resolveOffice(input.location);

    if (office) {

      // TODO:
      // Determine office hours and routing status.
      // For MVP, requests default to Notified.
      // Future deliverable will populate:
      //   - OfficeIsOpenAtSubmission
      //   - NextOfficeOpenDateTime
      //   - Status ('After Hours' when appropriate)

      
      // Step 4 - Persist routing information
      await db.updateInterTalentRequestRouting({
        requestId: request.requestId,

        assignedOffice: office.officeName,
        market: office.division,
        region: office.region,
        distributionList: office.officeEmail,

        officeIsOpen: false,          // SLA Engine will determine this later
        nextOfficeOpenDateTime: null, // SLA Engine will populate later

        status: "Notified",
      });

      // Step 5 - Audit routing completion
      await db.createRequestEvent({
        requestId: request.requestId,
        eventType: "Routing Completed",
        metadata: {
          office: office.officeName,
          region: office.region,
        },
      });
    }
  }
  // Step 6 - Return the new request
  return request;
}
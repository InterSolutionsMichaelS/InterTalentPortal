import { db } from "@/lib/db";
import { resolveOffice } from "@/lib/services/officeRoutingService";
import type {
  CreateInterTalentRequestInput,
  OfficeRoutingResult,
} from "@/lib/db/interface";

export interface CaptureInterTalentRequestResult {
  requestId: string;
  officeId: number | null;
  officeName: string | null;
  officeEmail: string | null;
  division: string | null;
  region: string | null;
  status: string;
}

export async function captureInterTalentRequest(
  input: CreateInterTalentRequestInput
): Promise<CaptureInterTalentRequestResult> {
  // Step 1 - Capture the request
  const request = await db.createInterTalentRequest(input);

  // Step 2 - Initial audit event
  await db.createRequestEvent({
    requestId: request.requestId,
    eventType: "Request Created",
  });

  let office: OfficeRoutingResult | null = null;

  // Step 3 - Resolve routing office
  if (input.location) {
    office = await resolveOffice(input.location);

    if (office) {
      await db.applyInterTalentRouting({
        requestId: request.requestId,
        officeName: office.officeName,
      });

      await db.createRequestEvent({
        requestId: request.requestId,
        eventType: "Routing Completed",
        metadata: {
          office: office.officeName,
          division: office.division,
          region: office.region,
          distanceMiles: office.distanceMiles,
        },
      });
    }
  }

  // Routing failed or no location was supplied
  if (!office) {
    return {
      requestId: request.requestId,
      officeId: null,
      officeName: null,
      officeEmail: null,
      division: null,
      region: null,
      status: request.status,
    };
  }

  // Successful routing
  return {
    requestId: request.requestId,
    officeId: office.officeId,
    officeName: office.officeName,
    officeEmail: office.officeEmail,
    division: office.division,
    region: office.region,
    status: "Notified",
  };
}
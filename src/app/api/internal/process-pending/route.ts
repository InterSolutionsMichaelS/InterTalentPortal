import { NextResponse } from "next/server";
import { processPendingWorkflowActions } from
  "@/lib/services/interTalentRequestService";

export async function POST() {
  try {
    const result = await processPendingWorkflowActions();

    return NextResponse.json(
      {
        success: true,
        result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Pending workflow processing failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
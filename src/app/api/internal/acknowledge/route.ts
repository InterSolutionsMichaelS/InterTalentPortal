import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import sql from "mssql";
import { getPool } from "@/lib/db/clients/azure-sql"

export async function POST(request: NextRequest) {
    const body = await request.json();

    const {
        requestId,
        acknowledgementToken
    } = body;

    if (!requestId || !acknowledgementToken) {
        return NextResponse.json(
            {
                success: false,
                result: "MissingParameters"
            },
            {
                status: 400
            }
        );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return NextResponse.json(
            {
                Success: false,
                Result: "Unauthorized"
            },
            {
                status: 401
            }
        );
    }

    // Next step:
    // Validate NextAuth session
    // Execute usp_InterTalent_AcknowledgeOwnership
    // Return the stored procedure result

    try {
        const pool = await getPool();

        const result = await pool
            .request()
            .input("RequestID", sql.UniqueIdentifier, requestId)
            .input("AcknowledgementToken", sql.UniqueIdentifier, acknowledgementToken)
            .input("EmployeeName", sql.NVarChar(200), session.user.name ?? "")
            .input("EmployeeEmail", sql.NVarChar(254), session.user.email)
            .input("UserAgent", sql.NVarChar(sql.MAX), request.headers.get("user-agent"))
            .execute("dbo.usp_InterTalent_AcknowledgeOwnership");

        return NextResponse.json(result.recordset[0]);

    } catch (error) {

        console.error(error);

        return NextResponse.json(
            {
                Success: false,
                Result: "ServerError"
            },
            {
                status: 500
            }
        );
    }
}
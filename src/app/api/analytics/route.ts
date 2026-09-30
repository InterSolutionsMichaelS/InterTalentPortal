import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest
) {
  try {
    const event = await request.json();

    await db.insertAnalyticsEvent(event);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      'Analytics insert failed:',
      error
    );

    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
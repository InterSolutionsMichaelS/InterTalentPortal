import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const ads = await db.getAds();

    return NextResponse.json(ads);
  } catch (error) {
    console.error('Error loading ads:', error);

    return NextResponse.json(
      { error: 'Failed to load ads' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    await db.createAd({
    title: body.title,

    imageData: body.imageData,
    imageMimeType: body.imageMimeType,

    destinationUrl: body.destinationUrl,
    displayOrder: body.displayOrder,
    isActive: body.isActive,
    targetAccounts: body.targetAccounts ?? [],
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error creating ad:', error);

    return NextResponse.json(
      { error: 'Failed to create ad' },
      { status: 500 }
    );
  }
}
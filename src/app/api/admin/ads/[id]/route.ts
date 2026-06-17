import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.deleteAd(Number(id));

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting ad:', error);

    return NextResponse.json(
      { error: 'Failed to delete ad' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    await db.updateAd(Number(id), {
      title: body.title,
      destinationUrl: body.destinationUrl,
      displayOrder: body.displayOrder,
      isActive: body.isActive,
      targetAccounts: body.targetAccounts ?? [],
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error updating ad:', error);

    return NextResponse.json(
      { error: 'Failed to update ad' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import {
  getAddressSuggestions,
} from '@/lib/geospatial';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
            
        const query = searchParams.get('q')?.trim().toLowerCase();

            console.log('Location query:', query);

            if (!query) {

                console.log('No location query provided');

                return NextResponse.json([]);
            }

            const locationSuggestions =
                await db.getLocationSuggestion(query);

            if (locationSuggestions.length > 0) {
                console.log('Profile DB hit');
                return NextResponse.json(locationSuggestions);
            }

            const cachedSuggestions =
                await db.getCachedLocationSuggestions(query);

            if (cachedSuggestions.length > 0) {

                console.log('Cache hit');

                return NextResponse.json(cachedSuggestions);
            }

            const looksLikeAddress =
                /\d/.test(query);

            if (looksLikeAddress) {

                console.log(
                    'No DB matches. Falling back to Azure Maps.'
                );

                const azureSuggestions =
                    await getAddressSuggestions(query);
                if (azureSuggestions.length > 0) {

                    await db.saveLocationSuggestions(
                        query,
                        azureSuggestions
                    );
                }

                return NextResponse.json(
                    azureSuggestions
                );

            } 
            
            return NextResponse.json([]);

            

    } catch (error) {
        console.error('Location suggestion error:', error);

        return NextResponse.json(
            { error: 'Failed to load suggestions' },
            { status: 500 }
        );
    }
}
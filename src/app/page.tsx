import HeroSearch from '@/components/home/HeroSearch';
import BlueBanner from '@/components/home/BlueBanner';
import SearchFilters from '@/components/search/SearchFilters';
import ProfileResults from '@/components/search/ProfileResults';
import EmptyState from '@/components/ui/EmptyState';
import SearchParamsSyncer from '@/components/search/SearchParamsSyncer';
import ScrollToTop from '@/components/ui/ScrollToTop';
import LoadingManager from '@/components/ui/LoadingManager';
import { db } from '@/lib/db';

// Helper function to build search params string for API calls
function buildSearchParams(params: {
  keywords?: string;
  zipCodes?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  radius?: number;
  professions?: string;
  office?: string;
  sortBy?: string;
  sortDirection?: string;
}): string {
  const searchParams = new URLSearchParams();

  if (params.keywords) searchParams.set('keywords', params.keywords);
  if (params.zipCodes) searchParams.set('zipCodes', params.zipCodes);
  if (params.city) searchParams.set('city', params.city);
  if (params.state) searchParams.set('state', params.state);
  if (params.zipCode) searchParams.set('zip', params.zipCode);
  if (params.radius) searchParams.set('radius', params.radius.toString());
  if (params.professions) searchParams.set('professions', params.professions);
  if (params.office) searchParams.set('office', params.office);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortDirection)
    searchParams.set('sortDirection', params.sortDirection);

  return searchParams.toString();
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  // Extract search parameters
  const keywords =
    typeof params.keywords === 'string' ? params.keywords : undefined;
  const zipCodes =
    typeof params.zipCodes === 'string' ? params.zipCodes : undefined;
  const city = typeof params.city === 'string' ? params.city : undefined;
  const state = typeof params.state === 'string' ? params.state : undefined;
  const zipCode = typeof params.zip === 'string' ? params.zip : undefined;
  const radius =
    typeof params.radius === 'string' ? parseInt(params.radius) : undefined;
  const professions =
    typeof params.professions === 'string' ? params.professions : undefined;
  const office = typeof params.office === 'string' ? params.office : undefined;
  const sortBy =
    typeof params.sortBy === 'string' &&
    ['name', 'location', 'profession'].includes(params.sortBy)
      ? (params.sortBy as 'name' | 'location' | 'profession')
      : 'name';
  const sortDirection =
    typeof params.sortDirection === 'string' &&
    ['asc', 'desc'].includes(params.sortDirection)
      ? (params.sortDirection as 'asc' | 'desc')
      : 'asc';

  // Single query to fetch all matching profiles
  const hasFilters =
    keywords || city || state || professions || office || zipCode || zipCodes;

  let result;
  if (hasFilters) {
    // Parse keywords into array if it's a comma-separated string
    const keywordsArray = keywords
      ? keywords
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k)
      : undefined;

    // Parse zipCodes into array if it's a comma-separated string
    const zipCodesArray = zipCodes
      ? zipCodes
          .split(',')
          .map((z) => z.trim())
          .filter((z) => z)
      : undefined;

    // Parse professions into array (from hero search single OR sidebar multi-select)
    const professionsArray = professions
      ? professions
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p)
      : undefined;

    result = await db.searchProfiles({
      keywords: keywordsArray,
      zipCodes: zipCodesArray,
      city,
      state,
      zipCode,
      radius,
      professionTypes: professionsArray,
      office,
      page: 1,
      limit: 1000, // Fetch up to 1000 profiles (adjust as needed)
      sortBy,
      sortDirection,
    });
  } else {
    result = await db.getAllProfiles(1, 1000, sortBy, sortDirection);
  }

  // Generate a unique key based on search parameters to force ProfileResults reset
  const searchKey = JSON.stringify({
    keywords,
    zipCodes,
    city,
    state,
    zipCode,
    radius,
    professions,
    office,
    sortBy,
    sortDirection,
  });

  return (
    <div className="bg-gray-50">
      {/* Loading Overlay */}
      <LoadingManager />

      {/* Sync URL params with Zustand store */}
      <SearchParamsSyncer />

      {/* Hero Section with Search */}
      <HeroSearch />

      {/* Blue Banner Divider */}
      <BlueBanner />

      {/* Main Content */}
      <section id="results-section" className="container mx-auto px-4 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-80 shrink-0">
            <SearchFilters />
          </aside>

          {/* Results Area */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Recommended Candidates
              </h2>
              <p className="text-gray-600">
                {result.total > 0 ? (
                  <>
                    Found{' '}
                    <span className="font-bold text-gray-900">
                      {result.total}
                    </span>{' '}
                    {result.total === 1 ? 'candidate' : 'candidates'}
                  </>
                ) : (
                  'No candidates found'
                )}
              </p>
            </div>

            {/* Profile Cards or Empty State */}
            {result.profiles.length > 0 ? (
              <ProfileResults
                key={searchKey}
                profiles={result.profiles}
                totalCount={result.total}
                initialDisplay={5}
                searchParams={buildSearchParams({
                  keywords,
                  zipCodes,
                  city,
                  state,
                  zipCode,
                  radius,
                  professions,
                  office,
                  sortBy,
                  sortDirection,
                })}
              />
            ) : (
              <EmptyState
                title="No candidates found"
                message={
                  hasFilters
                    ? "We couldn't find any candidates matching your search criteria. Try adjusting your filters or search terms."
                    : 'No candidates are currently available in our database.'
                }
                actionLabel="Clear all filters"
                actionHref="/"
              />
            )}
          </div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}

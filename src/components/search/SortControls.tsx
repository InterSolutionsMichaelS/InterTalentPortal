'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState } from 'react';

type SortOption = 'name' | 'location' | 'profession';
type SortDirection = 'asc' | 'desc';

export default function SortControls() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL params directly
  const urlSortBy = searchParams.get('sortBy') as SortOption;
  const urlSortDirection = searchParams.get('sortDirection') as SortDirection;

  const [sortBy, setSortBy] = useState<SortOption>(urlSortBy || 'name');
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    urlSortDirection || 'asc'
  );

  const handleSortChange = (newSortBy: SortOption) => {
    setSortBy(newSortBy);
    applySort(newSortBy, sortDirection);
  };

  const toggleDirection = () => {
    const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDirection);
    applySort(sortBy, newDirection);
  };

  const applySort = (sortBy: SortOption, direction: SortDirection) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set('sortBy', sortBy);
    params.set('sortDirection', direction);

    // Reset to page 1 when sorting changes
    params.set('page', '1');

    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="text-sm font-medium text-gray-700">Sort by:</span>

      {/* Sort dropdown */}
      <select
        value={sortBy}
        onChange={(e) => handleSortChange(e.target.value as SortOption)}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <option value="name">Name</option>
        <option value="location">Location</option>
        <option value="profession">Profession</option>
      </select>

      {/* Direction toggle button */}
      <button
        onClick={toggleDirection}
        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
      >
        {sortDirection === 'asc' ? (
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>

      <span className="text-xs text-gray-500">
        ({sortDirection === 'asc' ? 'A-Z' : 'Z-A'})
      </span>
    </div>
  );
}

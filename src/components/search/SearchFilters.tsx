'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface SearchFiltersProps {
  className?: string;
}

export default function SearchFilters({ className = '' }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [professions, setProfessions] = useState<string[]>([]);
  const [states, setStates] = useState<Array<{ code: string; name: string }>>(
    []
  );
  const [offices, setOffices] = useState<Array<{ name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Current filter values
  const [selectedProfession, setSelectedProfession] = useState(
    searchParams.get('profession') || ''
  );
  const [selectedState, setSelectedState] = useState(
    searchParams.get('state') || ''
  );
  const [selectedOffice, setSelectedOffice] = useState(
    searchParams.get('office') || ''
  );
  const [keywords, setKeywords] = useState(searchParams.get('keywords') || '');

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [professionsRes, statesRes, officesRes] = await Promise.all([
          fetch('/api/professions'),
          fetch('/api/states'),
          fetch('/api/offices'),
        ]);

        const [professionsData, statesData, officesData] = await Promise.all([
          professionsRes.json(),
          statesRes.json(),
          officesRes.json(),
        ]);

        setProfessions(professionsData.data || []);
        setStates(statesData.data || []);
        setOffices(officesData.data || []);
      } catch (error) {
        console.error('Error fetching filters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilters();
  }, []);

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (keywords) params.set('keywords', keywords);
    if (selectedProfession) params.set('profession', selectedProfession);
    if (selectedState) params.set('state', selectedState);
    if (selectedOffice) params.set('office', selectedOffice);

    router.push(`/?${params.toString()}`);
  };

  const clearFilters = () => {
    setSelectedProfession('');
    setSelectedState('');
    setSelectedOffice('');
    setKeywords('');
    router.push('/');
  };

  const hasActiveFilters =
    selectedProfession || selectedState || selectedOffice || keywords;

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-5">
        {/* Keywords */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Keywords
          </label>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="Search skills, experience..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Profession Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profession Type
          </label>
          {loading ? (
            <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          ) : (
            <select
              value={selectedProfession}
              onChange={(e) => setSelectedProfession(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">All Professions</option>
              {professions.map((profession) => (
                <option key={profession} value={profession}>
                  {profession}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State
          </label>
          {loading ? (
            <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          ) : (
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">All States</option>
              {states.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name} ({state.code})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Office */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Office Location
          </label>
          {loading ? (
            <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          ) : (
            <select
              value={selectedOffice}
              onChange={(e) => setSelectedOffice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">All Offices</option>
              {offices.map((office) => (
                <option key={office.name} value={office.name}>
                  {office.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Apply Button */}
        <button
          onClick={applyFilters}
          className="w-full bg-[#1e3a5f] hover:bg-[#2d5a8f] text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}
